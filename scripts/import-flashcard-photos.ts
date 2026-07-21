#!/usr/bin/env npx tsx
/**
 * Import FLASHCARD PHOTOS (the picture-prompt images) for a course language.
 *
 * ── Why this script exists ────────────────────────────────────────────────
 * The earlier French importer (scripts/import-french-flashcards.ts) sourced the
 * loose `{n}Pictures/{foreign}.{swf,gif,jpg}` files and wrote them into
 * `words.flashcard_image_url`. That was WRONG: those loose files are the
 * memory-TRIGGER mnemonic cartoons (already stored in memory_trigger_image_url),
 * NOT flashcards. The real flashcards are the plain photos that live in the
 * `1Pictures/Flashcard/` subfolder, named by the ENGLISH headword.
 *
 * This script sources those Flashcard/ photos and matches them to NL words by
 * English. It is language-agnostic; run it per language after the discs mount.
 *
 * ── What it does ──────────────────────────────────────────────────────────
 *   1. Auto-discovers every `Flashcard/` folder on the given disc(s).
 *   2. Indexes the JPG photos there (skips the SWF files — those render to the
 *      plain English WORD as text, not a picture, so they are not flashcards).
 *   3. Loads NL words for the language (legacy_refn -> { id, english }).
 *   4. Matches each word to a photo by normalised English (accent-folded,
 *      parenthetical-stripped, grammar-tag-stripped). Ambiguous matches (where a
 *      stripped name maps to >1 distinct photo, e.g. "friend" -> male/female) are
 *      SKIPPED and reported for manual assignment via the admin editor.
 *   5. Uploads each matched photo to word-images/words/{uuid}/flashcard.jpg and
 *      sets flashcard_image_url. Idempotent (guarded by flashcard_image_url NULL
 *      + storage upsert). Independent per row (each word gets its own object).
 *
 * ── Usage ─────────────────────────────────────────────────────────────────
 *   npx tsx scripts/import-flashcard-photos.ts --language german --dry-run
 *   npx tsx scripts/import-flashcard-photos.ts --language german --discs /Volumes/Disc,/Volumes/Disc\ 1
 *   npx tsx scripts/import-flashcard-photos.ts --language german --limit 10
 *   npx tsx scripts/import-flashcard-photos.ts --language german          # full LIVE run
 *
 * Always run --dry-run first and eyeball the match report before a live run.
 */

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// --- Load env from .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BUCKET = "word-images";

// Per-language config. `mdb` is the Access DB filename under each disc's MDB/
// folder (used only for the optional EngDictionary/Course fallback + reporting).
const LANGUAGES: Record<string, { id: string; mdb: string }> = {
  french: {
    id: "7d1ac2f6-97a3-4025-a325-fd449edb974f",
    mdb: "MDB/Exceltra French.mdb",
  },
  german: {
    id: "7bb57c89-e01b-404b-a3d7-ab7d087ac925",
    mdb: "MDB/Exceltra German.mdb",
  },
  spanish: {
    id: "39e8b5a2-269c-422e-9b84-06722b4f91ff",
    mdb: "MDB/Exceltra Spanish.mdb",
  },
};

// --- Args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
function argValue(flag: string): string | null {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}
const LANGUAGE = (argValue("--language") || "").toLowerCase();
const LIMIT = argValue("--limit") ? parseInt(argValue("--limit")!, 10) : null;
const DISCS = (argValue("--discs") || "/Volumes/Disc,/Volumes/Disc 1")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!LANGUAGES[LANGUAGE]) {
  console.error(
    `--language must be one of: ${Object.keys(LANGUAGES).join(", ")}`,
  );
  process.exit(1);
}
const LANG = LANGUAGES[LANGUAGE];

// --- Normalisation helpers (mirror the verified French matching) ------------
const GRAMMAR_TAG = /,\s*(n|adj|adv|v|exc|m|f|pl|prep|pron|prn|conj)\.?\s*$/i;
function fold(s: string): string {
  return (s || "").normalize("NFKD").replace(/\p{Diacritic}/gu, "");
}
function norm(s: string): string {
  return fold(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}
function stripParen(s: string): string {
  return (s || "").replace(/\([^)]*\)/g, "");
}
function baseEng(s: string): string {
  return stripParen((s || "").replace(GRAMMAR_TAG, ""));
}

// --- 1+2. Discover Flashcard folders and index the JPG photos ---------------
function findFlashcardDirs(): string[] {
  const dirs: string[] = [];
  for (const disc of DISCS) {
    if (!fs.existsSync(disc)) continue;
    for (const entry of fs.readdirSync(disc)) {
      const picDir = path.join(disc, entry);
      if (!/Pictures$/i.test(entry)) continue;
      if (!fs.statSync(picDir).isDirectory()) continue;
      const fc = path.join(picDir, "Flashcard");
      if (fs.existsSync(fc) && fs.statSync(fc).isDirectory()) dirs.push(fc);
    }
  }
  return dirs;
}

type PhotoIndex = {
  exact: Map<string, string>; // norm(basename) -> path
  keyBases: Map<string, Set<string>>; // candidate key -> distinct photos (norm basename)
  jpgCount: number;
  swfSkipped: number;
};

// Discs are often mirrored (the same Flashcard/ set appears on each disc), so a
// photo is deduped by its normalised BASENAME — two files that share a basename
// are the same photo, not a collision. A key is only ambiguous when it maps to
// two *different* photos (e.g. "friend" -> "friend (male)" + "friend (female)").
function indexPhotos(dirs: string[]): PhotoIndex {
  const exact = new Map<string, string>();
  const keyBases = new Map<string, Set<string>>();
  const swfNames = new Set<string>();
  const addKey = (key: string, base: string) => {
    if (!key) return;
    if (!keyBases.has(key)) keyBases.set(key, new Set());
    keyBases.get(key)!.add(base);
  };
  for (const dir of dirs) {
    for (const fn of fs.readdirSync(dir)) {
      const ext = path.extname(fn).toLowerCase();
      const base = path.basename(fn, path.extname(fn));
      if (ext === ".swf") {
        swfNames.add(norm(base)); // SWF flashcards are text word-cards, not photos.
        continue;
      }
      if (ext !== ".jpg" && ext !== ".jpeg") continue;
      const nb = norm(base);
      if (!exact.has(nb)) exact.set(nb, path.join(dir, fn));
      addKey(nb, nb);
      addKey(norm(stripParen(base)), nb);
    }
  }
  return {
    exact,
    keyBases,
    jpgCount: exact.size,
    swfSkipped: swfNames.size,
  };
}

// --- 3. NL words for the language -------------------------------------------
type NlWord = { id: string; english: string; category: string };
async function loadNlWords(): Promise<Map<number, NlWord>> {
  const map = new Map<number, NlWord>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("words")
      .select("id, legacy_refn, english, category")
      .eq("language_id", LANG.id)
      .not("legacy_refn", "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const w of data)
      if (w.legacy_refn != null)
        map.set(w.legacy_refn, {
          id: w.id,
          english: w.english ?? "",
          category: w.category ?? "",
        });
    if (data.length < PAGE) break;
  }
  return map;
}

// --- Optional MDB EngDictionary/Course (merge across discs, first wins) ------
function loadMdbMeta(): Map<number, { course: string; engDict: string }> {
  const meta = new Map<number, { course: string; engDict: string }>();
  for (const disc of DISCS) {
    const mdb = path.join(disc, LANG.mdb);
    if (!fs.existsSync(mdb)) continue;
    let csv: string;
    try {
      csv = execFileSync("mdb-export", [mdb, "General"], {
        encoding: "utf-8",
        maxBuffer: 1024 * 1024 * 512,
      });
    } catch {
      continue;
    }
    const rows = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as Record<string, string>[];
    for (const r of rows) {
      const refn = parseInt(r.RefN, 10);
      if (!Number.isFinite(refn) || meta.has(refn)) continue;
      meta.set(refn, {
        course: (r.Course || "").trim(),
        engDict: r.EngDictionary || "",
      });
    }
  }
  return meta;
}

// --- 4. Match a word to a photo (or null). Skips ambiguous stripped keys. ----
type Match = {
  refn: number;
  uuid: string;
  english: string;
  category: string;
  course: string;
  path: string;
};

function matchWord(
  refn: number,
  w: NlWord,
  idx: PhotoIndex,
  meta: Map<number, { course: string; engDict: string }>,
): { match?: Match; ambiguous?: boolean } {
  // Exact English == filename wins outright.
  const exactKey = norm(w.english);
  if (idx.exact.has(exactKey)) {
    return {
      match: {
        refn,
        uuid: w.id,
        english: w.english,
        category: w.category,
        course: meta.get(refn)?.course ?? "?",
        path: idx.exact.get(exactKey)!,
      },
    };
  }
  // Fallback candidate keys, each accepted only if unambiguous (one file).
  const candidates = [
    norm(w.english),
    norm(stripParen(w.english)),
    norm(baseEng(meta.get(refn)?.engDict ?? "")),
  ];
  let sawAmbiguous = false;
  for (const k of candidates) {
    if (!k) continue;
    const bases = idx.keyBases.get(k);
    if (!bases) continue;
    if (bases.size === 1) {
      const file = idx.exact.get([...bases][0]);
      if (!file) continue;
      return {
        match: {
          refn,
          uuid: w.id,
          english: w.english,
          category: w.category,
          course: meta.get(refn)?.course ?? "?",
          path: file,
        },
      };
    }
    sawAmbiguous = true;
  }
  return { ambiguous: sawAmbiguous };
}

// --- 5. Upload + set URL -----------------------------------------------------
async function uploadPhoto(uuid: string, file: string): Promise<string> {
  const storagePath = `words/${uuid}/flashcard.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fs.readFileSync(file), {
      contentType: "image/jpeg",
      upsert: true,
      cacheControl: "31536000",
    });
  if (error) throw new Error(`upload ${storagePath}: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

async function setUrl(uuid: string, url: string): Promise<number> {
  const { data, error } = await supabase
    .from("words")
    .update({ flashcard_image_url: url })
    .eq("id", uuid)
    .is("flashcard_image_url", null)
    .select("id");
  if (error) throw new Error(`update ${uuid}: ${error.message}`);
  return data?.length ?? 0;
}

async function main() {
  console.log("=".repeat(60));
  console.log(`Flashcard PHOTO import — ${LANGUAGE}`);
  console.log("=".repeat(60));
  console.log(`Mode:  ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`Discs: ${DISCS.join(", ")}`);

  const flashDirs = findFlashcardDirs();
  if (flashDirs.length === 0) {
    console.error(
      `No Flashcard/ folders found under ${DISCS.join(", ")}. ` +
        `Mount the discs or pass --discs.`,
    );
    process.exit(1);
  }
  console.log(`Flashcard folders: ${flashDirs.join(", ")}`);

  const idx = indexPhotos(flashDirs);
  console.log(
    `Indexed ${idx.jpgCount} JPG photos (${idx.swfSkipped} SWF text-cards skipped)`,
  );

  const nl = await loadNlWords();
  const meta = loadMdbMeta();
  console.log(
    `NL ${LANGUAGE} words w/ legacy_refn: ${nl.size}; MDB meta rows: ${meta.size}\n`,
  );

  const matches: Match[] = [];
  let ambiguous = 0;
  let unmatched = 0;
  const ambiguousSamples: string[] = [];
  const unmatchedSamples: string[] = [];
  for (const [refn, w] of nl) {
    const r = matchWord(refn, w, idx, meta);
    if (r.match) matches.push(r.match);
    else if (r.ambiguous) {
      ambiguous++;
      if (ambiguousSamples.length < 20) ambiguousSamples.push(w.english);
    } else {
      unmatched++;
      if (unmatchedSamples.length < 20) unmatchedSamples.push(w.english);
    }
  }

  const byCourse = matches.reduce<Record<string, number>>((a, m) => {
    a[m.course] = (a[m.course] || 0) + 1;
    return a;
  }, {});

  console.log("=".repeat(60));
  console.log("MATCH REPORT");
  console.log("=".repeat(60));
  console.log(`Matched:            ${matches.length}`);
  console.log(`  by MDB course:    ${JSON.stringify(byCourse)}`);
  console.log(`Ambiguous (skipped):${ambiguous}`);
  console.log(`Unmatched:          ${unmatched}`);
  if (ambiguousSamples.length)
    console.log(`\nAmbiguous samples (assign manually):\n  ${ambiguousSamples.join("\n  ")}`);
  if (unmatchedSamples.length)
    console.log(`\nUnmatched samples:\n  ${unmatchedSamples.join("\n  ")}`);

  const planPath = path.join(
    process.cwd(),
    `docs/imports/${LANGUAGE}_flashcard_photo_plan.csv`,
  );
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  fs.writeFileSync(
    planPath,
    ["refn,uuid,course,english,source_path"]
      .concat(
        matches.map((m) =>
          [m.refn, m.uuid, m.course, m.english, m.path].map((v) => esc(String(v))).join(","),
        ),
      )
      .join("\n") + "\n",
  );
  console.log(`\nPlan CSV written: ${planPath}`);

  if (DRY_RUN) {
    console.log("\nDRY RUN — no writes. Review the report + CSV, then re-run live.");
    return;
  }

  const toRun = LIMIT != null ? matches.slice(0, LIMIT) : matches;
  console.log(`\nUploading ${toRun.length} photos...`);
  let up = 0;
  let upd = 0;
  let fail = 0;
  for (let i = 0; i < toRun.length; i++) {
    const m = toRun[i];
    try {
      const url = await uploadPhoto(m.uuid, m.path);
      up++;
      upd += await setUrl(m.uuid, url);
      if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${toRun.length}...`);
    } catch (err) {
      fail++;
      console.error(`  FAIL ${m.english} (${m.uuid}): ${(err as Error).message}`);
    }
  }
  console.log(`\nUploaded ${up}, DB updated ${upd}, failed ${fail}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
