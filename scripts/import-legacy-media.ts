#!/usr/bin/env npx tsx
/**
 * Import legacy media (images + audio) for a language into Supabase Storage and
 * rewrite the word media columns to public URLs (FRENCH_MEDIA_IMPORT_PLAN).
 *
 * The word rows currently hold legacy filename *stems* in:
 *   - memory_trigger_image_url (+ legacy_image_suffix = swf|gif|jpg)
 *   - audio_url_english / audio_url_foreign / audio_url_trigger
 * This script resolves each stem to a file on the mounted disc, uploads it
 * (converting SWF → PNG), and replaces the column with the full public URL.
 *
 * Config-driven: storage layout, mount root and course→prefix mapping all come
 * from the language config's `media` block (scripts/configs/<lang>.ts).
 *
 * Usage:
 *   npx tsx scripts/import-legacy-media.ts --language french [--dry-run] [--limit N]
 *
 * Options:
 *   --language <name>   Language to import (default: french)
 *   --dry-run           Resolve + report only; no uploads, no DB writes
 *   --limit <N>         Process only the first N words (smoke test)
 *   --concurrency <N>   Words processed in parallel (default 8; idempotent)
 *
 * Storage layout (shared public buckets, each language self-isolated):
 *   word-images/<slug>/<stem>.<png|gif|jpg>
 *   word-audio/<slug>/<coursePrefix>/<english|foreign|trigger>/<stem>.mp3
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { LanguageConfig, MediaConfig } from "./lib/legacy-import/types";
import { getLanguageConfig } from "./configs";
import { createFileResolver, convertSwfToPng } from "./lib/legacy-import/media";

// Load env vars from .env.local if running locally
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

// Parse CLI arguments
function getArg(name: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(`--${name}`);
  if (index !== -1 && args[index + 1]) return args[index + 1];
  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

const languageName = (getArg("language") || "french").trim().toLowerCase();
const dryRun = hasFlag("dry-run");
const limitArg = getArg("limit");
const limit = limitArg ? parseInt(limitArg, 10) : Infinity;
const concurrencyArg = getArg("concurrency");
const concurrency = concurrencyArg ? Math.max(1, parseInt(concurrencyArg, 10)) : 8;

// Validate environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing required environment variables:");
  if (!supabaseUrl) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// ============================================================================
// Config
// ============================================================================

function requireMediaConfig(name: string): { config: LanguageConfig; media: MediaConfig } {
  const config = getLanguageConfig(name);
  if (!config) {
    console.error(`No import config registered for language '${name}'.`);
    process.exit(1);
  }
  if (!config.media) {
    console.error(`Language '${name}' has no \`media\` block in its config.`);
    process.exit(1);
  }
  return { config, media: config.media };
}

const { config, media } = requireMediaConfig(languageName);

const IMAGE_BUCKET = "word-images";
const AUDIO_BUCKET = "word-audio";

// Audio type → (legacy folder suffix, NL column, storage type segment)
type AudioType = "english" | "foreign" | "trigger";
const AUDIO_TYPES: { type: AudioType; folderSuffix: string; column: AudioColumn }[] = [
  { type: "english", folderSuffix: "SoundEng", column: "audio_url_english" },
  { type: "foreign", folderSuffix: "SoundFor", column: "audio_url_foreign" },
  { type: "trigger", folderSuffix: "SoundTrg", column: "audio_url_trigger" },
];

type AudioColumn = "audio_url_english" | "audio_url_foreign" | "audio_url_trigger";

const IMAGE_CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  gif: "image/gif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

// ============================================================================
// Word loading
// ============================================================================

interface WordRow {
  id: string;
  memory_trigger_image_url: string | null;
  legacy_image_suffix: string | null;
  audio_url_english: string | null;
  audio_url_foreign: string | null;
  audio_url_trigger: string | null;
  /** Course `legacy_ref` resolved from the lesson_words join (first known). */
  courseRef: number | null;
}

async function getLanguageId(): Promise<string> {
  const { data, error } = await supabase
    .from("languages")
    .select("id, name")
    .ilike("name", config.name);
  if (error) {
    console.error("Failed to look up language:", error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.error(`Language '${config.name}' not found in NL.`);
    process.exit(1);
  }
  return data[0].id;
}

async function loadWords(languageId: string): Promise<WordRow[]> {
  const knownRefs = new Set(Object.keys(media.audioPrefixByCourseRef).map((r) => parseInt(r, 10)));
  const rows: WordRow[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("words")
      .select(
        `
        id,
        memory_trigger_image_url,
        legacy_image_suffix,
        audio_url_english,
        audio_url_foreign,
        audio_url_trigger,
        lesson_words!inner (
          lessons!inner (
            courses!inner ( legacy_ref )
          )
        )
      `
      )
      .eq("language_id", languageId)
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("Failed to load words:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const w of data as Record<string, unknown>[]) {
      // Resolve the word's course legacy_ref from the nested join. A word may
      // surface multiple lesson_words rows; pick the first ref we have a prefix
      // for (vocab vs sentences never overlap in practice).
      let courseRef: number | null = null;
      const links = (w.lesson_words as { lessons?: { courses?: { legacy_ref?: number } } }[]) || [];
      for (const link of links) {
        const ref = link?.lessons?.courses?.legacy_ref;
        if (typeof ref === "number" && knownRefs.has(ref)) {
          courseRef = ref;
          break;
        }
      }
      rows.push({
        id: w.id as string,
        memory_trigger_image_url: (w.memory_trigger_image_url as string) ?? null,
        legacy_image_suffix: (w.legacy_image_suffix as string) ?? null,
        audio_url_english: (w.audio_url_english as string) ?? null,
        audio_url_foreign: (w.audio_url_foreign as string) ?? null,
        audio_url_trigger: (w.audio_url_trigger as string) ?? null,
        courseRef,
      });
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  // Deduplicate by word id (the join can repeat a word across lessons).
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

// ============================================================================
// Upload + DB helpers
// ============================================================================

const resolver = createFileResolver(media.mountRoot);
// Temp dir for SWF → PNG output (cleaned at the end).
const tmpPngDir = fs.mkdtempSync(path.join(os.tmpdir(), `${media.slug}-swf-`));

function publicUrl(bucket: string, key: string): string {
  return supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Run `worker` over `items` with at most `limit` in flight. Node is
 * single-threaded so the shared caches/stats mutate safely; the only racy case
 * is two workers uploading the same key at once, which the `upsert:false`
 * "already exists" path absorbs (one redundant attempt, never a corruption).
 */
async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let next = 0;
  async function lane(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => lane()));
}

async function uploadFile(
  bucket: string,
  key: string,
  buffer: Buffer,
  contentType: string,
  retries = 3
): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(key, buffer, { contentType, upsert: false });
    if (!error) return publicUrl(bucket, key);
    // Object already there from a previous (partial) run → reuse its URL.
    if (/already exists|resource already exists/i.test(error.message)) {
      return publicUrl(bucket, key);
    }
    if (attempt < retries) {
      await sleep(1000 * attempt);
      continue;
    }
    console.error(`  upload failed ${bucket}/${key}: ${error.message}`);
    return null;
  }
  return null;
}

async function updateColumn(wordId: string, column: string, url: string): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error } = await supabase.from("words").update({ [column]: url }).eq("id", wordId);
    if (!error) return true;
    if (attempt < 3) {
      await sleep(1000 * attempt);
      continue;
    }
    console.error(`  db update failed word ${wordId}.${column}: ${error.message}`);
    return false;
  }
  return false;
}

// ============================================================================
// Processing
// ============================================================================

const stats = {
  rows: 0,
  imgResolved: 0,
  imgMissing: 0,
  imgNoSuffix: 0,
  swfConverted: 0,
  swfFailed: 0,
  audioResolved: { english: 0, foreign: 0, trigger: 0 } as Record<AudioType, number>,
  audioMissing: { english: 0, foreign: 0, trigger: 0 } as Record<AudioType, number>,
  uploaded: 0,
  columnsUpdated: 0,
  updateFailed: 0,
  noCourseRef: 0,
};

// Per-run caches so a shared source file (many words reuse one image) is only
// converted/uploaded once. Key = `${bucket}\n${storageKey}` → public URL.
const urlCache = new Map<string, string>();
const swfPngCache = new Map<string, string | null>();
const uniqueKeys = { [IMAGE_BUCKET]: new Set<string>(), [AUDIO_BUCKET]: new Set<string>() } as Record<
  string,
  Set<string>
>;
const samples: string[] = [];
const missingLog: string[] = [];

/** Read source bytes for a media item, converting SWF → PNG on the way. */
function readBytes(srcPath: string, isSwf: boolean): Buffer | null {
  if (!isSwf) return fs.readFileSync(srcPath);
  let png = swfPngCache.get(srcPath);
  if (png === undefined) {
    const out = path.join(tmpPngDir, `${path.basename(srcPath, ".swf")}.png`);
    png = convertSwfToPng(srcPath, out) ? out : null;
    swfPngCache.set(srcPath, png);
    if (png) stats.swfConverted++;
    else stats.swfFailed++;
  }
  return png ? fs.readFileSync(png) : null;
}

/**
 * Upload one resolved media item and point its column at the public URL.
 * In dry-run, records the would-be work without touching storage or the DB.
 */
async function place(
  bucket: string,
  key: string,
  srcPath: string,
  isSwf: boolean,
  contentType: string,
  wordId: string,
  column: string
): Promise<void> {
  uniqueKeys[bucket].add(key);

  if (dryRun) {
    if (samples.length < 15) {
      samples.push(`${path.relative(media.mountRoot, srcPath)}  ->  ${bucket}/${key}`);
    }
    stats.columnsUpdated++;
    return;
  }

  const cacheKey = `${bucket}\n${key}`;
  let url = urlCache.get(cacheKey);
  if (!url) {
    const buffer = readBytes(srcPath, isSwf);
    if (!buffer) return; // SWF conversion failed (already counted)
    const uploaded = await uploadFile(bucket, key, buffer, contentType);
    if (!uploaded) return;
    url = uploaded;
    urlCache.set(cacheKey, url);
    stats.uploaded++;
  }

  const ok = await updateColumn(wordId, column, url);
  if (ok) stats.columnsUpdated++;
  else stats.updateFailed++;
}

function isHttp(v: string | null): boolean {
  return !!v && /^https?:\/\//i.test(v);
}

async function processImage(word: WordRow): Promise<void> {
  const stem = word.memory_trigger_image_url;
  if (!stem || isHttp(stem)) return;

  const suffix = (word.legacy_image_suffix || "").trim().toLowerCase();
  if (!suffix) {
    stats.imgNoSuffix++;
    return;
  }

  // Per-course image prefix when configured (French 2: vocab in 2Pictures, the
  // 3 proverb images in 12Pictures), else the single default `imagePrefix`.
  const imgPrefix =
    (word.courseRef != null ? media.imagePrefixByCourseRef?.[word.courseRef] : undefined) ??
    media.imagePrefix;
  const folder = `${imgPrefix}Pictures`;
  const src = resolver.resolve(folder, `${stem}.${suffix}`);
  if (!src) {
    stats.imgMissing++;
    if (missingLog.length < 40) missingLog.push(`image  ${folder}/${stem}.${suffix}`);
    return;
  }
  stats.imgResolved++;

  const isSwf = suffix === "swf";
  const outExt = isSwf ? "png" : suffix;
  const key = `${media.slug}/${stem}.${outExt}`;
  const contentType = IMAGE_CONTENT_TYPE[outExt] || "application/octet-stream";
  await place(IMAGE_BUCKET, key, src, isSwf, contentType, word.id, "memory_trigger_image_url");
}

async function processAudio(word: WordRow): Promise<void> {
  if (word.courseRef == null) {
    stats.noCourseRef++;
    return;
  }
  const prefix = media.audioPrefixByCourseRef[word.courseRef];
  if (!prefix) return;

  for (const { type, folderSuffix, column } of AUDIO_TYPES) {
    const stem = word[column];
    if (!stem || isHttp(stem)) continue;

    const folder = `${prefix}${folderSuffix}`;
    // Many legacy audio files carry a `-f` filename variant (e.g.
    // `amie ,f-f.mp3`, `friend (female)-f.mp3`); the original Italian importer
    // tried the same fallback. Plain stem first, then the `-f` variant.
    const src =
      resolver.resolve(folder, `${stem}.mp3`) ?? resolver.resolve(folder, `${stem}-f.mp3`);
    if (!src) {
      stats.audioMissing[type]++;
      if (missingLog.length < 40) missingLog.push(`audio  ${folder}/${stem}.mp3`);
      continue;
    }
    stats.audioResolved[type]++;

    const key = `${media.slug}/${prefix}/${type}/${stem}.mp3`;
    await place(AUDIO_BUCKET, key, src, false, "audio/mpeg", word.id, column);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("============================================================");
  console.log("Legacy Media Import");
  console.log("============================================================");
  console.log(`Language:   ${config.name} (slug: ${media.slug})`);
  console.log(`Mount root: ${media.mountRoot}`);
  console.log(`Mode:       ${dryRun ? "DRY RUN" : "UPLOAD"}`);
  if (!dryRun) console.log(`Concurrency:${concurrency}`);
  if (Number.isFinite(limit)) console.log(`Limit:      ${limit} words`);
  console.log("");

  if (!fs.existsSync(media.mountRoot)) {
    console.error(`Mount root not found: ${media.mountRoot} (is the disc mounted?)`);
    process.exit(1);
  }

  const languageId = await getLanguageId();
  console.log(`Language id: ${languageId}`);

  let words = await loadWords(languageId);
  console.log(`Words loaded: ${words.length}`);
  if (Number.isFinite(limit)) words = words.slice(0, limit);

  await runPool(words, dryRun ? 1 : concurrency, async (word) => {
    await processImage(word);
    await processAudio(word);
    stats.rows++;
    if (!dryRun && stats.rows % 100 === 0) {
      console.log(`  …${stats.rows}/${words.length} words (${stats.columnsUpdated} columns updated)`);
    }
  });

  // Cleanup temp PNGs
  try {
    fs.rmSync(tmpPngDir, { recursive: true, force: true });
  } catch {
    // best-effort
  }

  console.log("");
  console.log("------------------------------------------------------------");
  console.log("Summary");
  console.log("------------------------------------------------------------");
  console.log(`Words processed:        ${stats.rows}`);
  console.log(`Images resolved:        ${stats.imgResolved}`);
  console.log(`Images missing:         ${stats.imgMissing}`);
  console.log(`Images w/o suffix:      ${stats.imgNoSuffix}`);
  console.log(
    `Audio resolved:         eng ${stats.audioResolved.english}, ` +
      `for ${stats.audioResolved.foreign}, trg ${stats.audioResolved.trigger}`
  );
  console.log(
    `Audio missing:          eng ${stats.audioMissing.english}, ` +
      `for ${stats.audioMissing.foreign}, trg ${stats.audioMissing.trigger}`
  );
  console.log(`Words without courseRef:${stats.noCourseRef}`);
  console.log(
    `SWF images (unique):    ${uniqueSwfCount()} ` +
      `(converted ${stats.swfConverted}, failed ${stats.swfFailed})`
  );
  console.log(`Unique image uploads:   ${uniqueKeys[IMAGE_BUCKET].size}`);
  console.log(`Unique audio uploads:   ${uniqueKeys[AUDIO_BUCKET].size}`);
  if (dryRun) {
    console.log(`Columns that WOULD update: ${stats.columnsUpdated}`);
  } else {
    console.log(`Files uploaded:         ${stats.uploaded}`);
    console.log(`Columns updated:        ${stats.columnsUpdated}`);
    console.log(`Update failures:        ${stats.updateFailed}`);
  }

  if (missingLog.length) {
    console.log("");
    console.log(`Missing source files (first ${missingLog.length}):`);
    for (const m of missingLog) console.log(`  ${m}`);
  }

  if (dryRun && samples.length) {
    console.log("");
    console.log("Sample source → storage-path mappings:");
    for (const s of samples) console.log(`  ${s}`);
    console.log("");
    console.log("Example public URL:");
    const anyImg = [...uniqueKeys[IMAGE_BUCKET]][0];
    if (anyImg) console.log(`  ${publicUrl(IMAGE_BUCKET, anyImg)}`);
  }

  console.log("");
  console.log("Done!");
}

/** Unique SWF count for the dry-run summary (cache is empty in dry-run). */
function uniqueSwfCount(): number {
  return uniqueKeys[IMAGE_BUCKET].size === 0
    ? 0
    : [...uniqueKeys[IMAGE_BUCKET]].filter((k) => k.endsWith(".png")).length;
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
