#!/usr/bin/env npx tsx
/**
 * Import legacy verb-conjugation pages into `verb_conjugations` (SEO Phase B, Phase 2.1).
 *
 * Reads the structured JSON produced by docs/seo-migration/parse_verbs.py, re-hosts each
 * lead image into the `verb-images` Supabase Storage bucket, and upserts one row per verb
 * (keyed on legacy_path). Only records that have conjugation rows are imported; the thin
 * stubs / hub pages flagged by the parser are skipped and left for a later batch.
 *
 * Usage:
 *   npx tsx scripts/import-verbs.ts [--file <verbs.json>] [--skip-images] [--dry-run]
 *
 * Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// ── env (mirror import-lessons.ts) ───────────────────────────────────────────
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const argv = process.argv.slice(2);
const getArg = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : undefined;
};
const DRY = argv.includes("--dry-run");
const SKIP_IMAGES = argv.includes("--skip-images");
const FILE =
  getArg("file") ||
  path.join(process.cwd(), "docs/seo-migration/verbs.json");
const BUCKET = "verb-images";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceRoleKey);

interface VerbRecord {
  language_code: string;
  slug: string;
  legacy_path: string;
  infinitive: string;
  translation: string | null;
  title: string;
  meta_description: string | null;
  h1: string;
  subtitle: string | null;
  mnemonic: string | null;
  conjugation: { simple: unknown[]; compound: unknown[] };
  intro_html: string | null;
  notes_html: string | null;
  legacy_image_url: string | null;
  lead_image_alt: string | null;
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    console.log(`Creating bucket '${BUCKET}'`);
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
    });
    if (error) {
      console.error("Failed to create bucket:", error.message);
      process.exit(1);
    }
  }
}

/** Download the legacy image and re-host it in Storage; return the public URL or null. */
async function rehostImage(rec: VerbRecord): Promise<string | null> {
  if (!rec.legacy_image_url) return null;
  const ext = (rec.legacy_image_url.split(".").pop() || "gif").split("?")[0].slice(0, 4);
  const key = `${rec.language_code}/${rec.slug}.${ext}`;
  try {
    const res = await fetch(rec.legacy_image_url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || `image/${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(key, buf, {
      contentType,
      upsert: true,
    });
    if (error) {
      console.warn(`  ! image upload failed for ${rec.slug}: ${error.message}`);
      return null;
    }
    return supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  } catch (e) {
    console.warn(`  ! image fetch failed for ${rec.slug}: ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  const all: VerbRecord[] = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  const records = all.filter(
    (r) => r.conjugation.simple.length + r.conjugation.compound.length > 0
  );
  console.log(
    `Loaded ${all.length} records; importing ${records.length} with conjugations ` +
      `(${all.length - records.length} thin/hub pages skipped).`
  );

  // language_code -> id
  const { data: langs, error: langErr } = await supabase.from("languages").select("id, code");
  if (langErr || !langs) {
    console.error("Failed to load languages:", langErr?.message);
    process.exit(1);
  }
  const langId = new Map(langs.map((l) => [l.code, l.id]));

  if (DRY) {
    console.log("Dry run — no writes. Sample row:");
    console.log(JSON.stringify(records[0], null, 2).slice(0, 800));
    return;
  }

  if (!SKIP_IMAGES) await ensureBucket();

  let ok = 0,
    failed = 0,
    imaged = 0;
  for (const rec of records) {
    const language_id = langId.get(rec.language_code);
    if (!language_id) {
      console.warn(`  ! unknown language '${rec.language_code}' for ${rec.legacy_path}`);
      failed++;
      continue;
    }
    let lead_image_url: string | null = null;
    if (!SKIP_IMAGES) {
      lead_image_url = await rehostImage(rec);
      if (lead_image_url) imaged++;
    }
    const { error } = await supabase.from("verb_conjugations").upsert(
      {
        language_id,
        slug: rec.slug,
        legacy_path: rec.legacy_path,
        infinitive: rec.infinitive,
        translation: rec.translation,
        title: rec.title,
        meta_description: rec.meta_description,
        h1: rec.h1,
        subtitle: rec.subtitle,
        mnemonic: rec.mnemonic,
        conjugation: rec.conjugation,
        intro_html: rec.intro_html,
        notes_html: rec.notes_html,
        lead_image_url,
        lead_image_alt: rec.lead_image_alt,
        is_published: true,
      },
      { onConflict: "legacy_path" }
    );
    if (error) {
      console.warn(`  ! upsert failed for ${rec.legacy_path}: ${error.message}`);
      failed++;
    } else {
      ok++;
      if (ok % 100 === 0) console.log(`  …${ok} upserted`);
    }
  }
  console.log(`Done. Upserted ${ok}, failed ${failed}, images re-hosted ${imaged}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
