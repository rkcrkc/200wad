#!/usr/bin/env npx tsx
/**
 * Import flashcard images for the Italian course.
 *
 * Reads docs/imports/flashcard_upload_plan.csv and for each unique source image:
 *   1. Resolves the primary word_uuid via legacy_refn.
 *   2. Uploads the file to word-images/words/{primary_word_uuid}/flashcard.{ext}.
 *   3. Updates words.flashcard_image_url for every legacy_refn sharing this image
 *      with the same public URL (per decision: option b, share URL across rows).
 *
 * Idempotent: skips uploads where target storage object already exists AND every
 * associated word row already has flashcard_image_url set.
 *
 * Usage:
 *   npx tsx scripts/import-flashcard-images.ts                # full run
 *   npx tsx scripts/import-flashcard-images.ts --limit 10     # process first N files
 *   npx tsx scripts/import-flashcard-images.ts --dry-run      # log actions, no writes
 */

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

// --- Load env from .env.local
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Constants
const ITALIAN_LANGUAGE_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const BUCKET = "word-images";
const PLAN_PATH = path.join(
  process.cwd(),
  "docs/imports/flashcard_upload_plan.csv",
);

// --- Args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limitArg = args.indexOf("--limit");
const LIMIT =
  limitArg >= 0 && args[limitArg + 1] ? parseInt(args[limitArg + 1], 10) : null;

type PlanRow = {
  primary_legacy_refn: string;
  source_kind: "jpg" | "swf";
  source_filename: string;
  source_path: string;
  target_ext: "jpg" | "png";
  all_legacy_refns_count: string;
  all_legacy_refns: string;
};

function readPlan(): PlanRow[] {
  const csvText = fs.readFileSync(PLAN_PATH, "utf-8");
  return parse(csvText, { columns: true, skip_empty_lines: true });
}

function contentType(ext: string): string {
  if (ext === "jpg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return "application/octet-stream";
}

async function loadRefnToUuidMap(refns: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  // Batch in chunks of 1000 to stay within URL/SQL limits
  const CHUNK = 1000;
  for (let i = 0; i < refns.length; i += CHUNK) {
    const slice = refns.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("words")
      .select("id, legacy_refn, flashcard_image_url")
      .eq("language_id", ITALIAN_LANGUAGE_ID)
      .in("legacy_refn", slice);
    if (error) throw new Error(`Failed to load words: ${error.message}`);
    for (const w of data ?? []) {
      if (w.legacy_refn != null) {
        map.set(w.legacy_refn, w.id);
      }
    }
  }
  return map;
}

async function loadExistingUrls(
  refns: number[],
): Promise<Map<number, string | null>> {
  const map = new Map<number, string | null>();
  const CHUNK = 1000;
  for (let i = 0; i < refns.length; i += CHUNK) {
    const slice = refns.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("words")
      .select("legacy_refn, flashcard_image_url")
      .eq("language_id", ITALIAN_LANGUAGE_ID)
      .in("legacy_refn", slice);
    if (error) throw new Error(`Failed to load URLs: ${error.message}`);
    for (const w of data ?? []) {
      if (w.legacy_refn != null) {
        map.set(w.legacy_refn, w.flashcard_image_url ?? null);
      }
    }
  }
  return map;
}

async function uploadFile(
  storagePath: string,
  filePath: string,
  ext: string,
): Promise<{ publicUrl: string }> {
  const buffer = fs.readFileSync(filePath);
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: contentType(ext),
      upsert: true,
      cacheControl: "31536000",
    });
  if (uploadError) {
    throw new Error(`Upload failed for ${storagePath}: ${uploadError.message}`);
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl };
}

async function updateWords(
  refns: number[],
  publicUrl: string,
): Promise<{ updated: number; errors: number }> {
  let updated = 0;
  let errors = 0;
  // Update one row at a time so we get accurate per-row counts.
  // (1924 rows total → ~1 minute. Acceptable.)
  for (const refn of refns) {
    const { data, error } = await supabase
      .from("words")
      .update({ flashcard_image_url: publicUrl })
      .eq("language_id", ITALIAN_LANGUAGE_ID)
      .eq("legacy_refn", refn)
      .is("flashcard_image_url", null)
      .select("id");
    if (error) {
      console.error(`  DB update error refn=${refn}: ${error.message}`);
      errors++;
    } else {
      updated += data?.length ?? 0;
    }
  }
  return { updated, errors };
}

async function main() {
  console.log("=".repeat(60));
  console.log("Flashcard image import");
  console.log("=".repeat(60));
  console.log(`Mode:        ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`Limit:       ${LIMIT ?? "no limit"}`);
  console.log(`Plan file:   ${PLAN_PATH}`);
  console.log("");

  const plan = readPlan();
  console.log(`Plan rows:   ${plan.length}`);

  const rows = LIMIT != null ? plan.slice(0, LIMIT) : plan;
  console.log(`Processing:  ${rows.length}`);

  // Collect every refn we touch
  const allRefns = Array.from(
    new Set(
      rows.flatMap((r) =>
        r.all_legacy_refns.split(",").map((s) => parseInt(s.trim(), 10)),
      ),
    ),
  );
  console.log(`RefNs total: ${allRefns.length}`);

  console.log("\nLoading word_uuid map...");
  const refnToUuid = await loadRefnToUuidMap(allRefns);
  console.log(`  resolved ${refnToUuid.size}/${allRefns.length} word UUIDs`);

  console.log("Loading existing flashcard_image_url values...");
  const existingUrls = await loadExistingUrls(allRefns);
  const alreadyHasUrl = Array.from(existingUrls.values()).filter(Boolean).length;
  console.log(`  ${alreadyHasUrl} of ${allRefns.length} already have a URL`);
  console.log("");

  // Stats
  let uploads = 0;
  let uploadsSkipped = 0;
  let uploadsFailed = 0;
  let dbUpdates = 0;
  let dbErrors = 0;
  let missingSource = 0;
  let missingUuid = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const primaryRefn = parseInt(row.primary_legacy_refn, 10);
    const sharedRefns = row.all_legacy_refns
      .split(",")
      .map((s) => parseInt(s.trim(), 10));

    const primaryUuid = refnToUuid.get(primaryRefn);
    if (!primaryUuid) {
      console.warn(
        `[${i + 1}/${rows.length}] SKIP (no primary uuid for refn ${primaryRefn})`,
      );
      missingUuid++;
      continue;
    }

    if (!fs.existsSync(row.source_path)) {
      console.warn(
        `[${i + 1}/${rows.length}] SKIP (source missing: ${row.source_path})`,
      );
      missingSource++;
      continue;
    }

    // Check whether every shared refn already has a URL
    const allHaveUrl = sharedRefns.every((r) => existingUrls.get(r));
    const storagePath = `words/${primaryUuid}/flashcard.${row.target_ext}`;

    let publicUrl: string;
    if (allHaveUrl) {
      // All rows already populated; nothing to do
      uploadsSkipped++;
      if ((i + 1) % 100 === 0 || i === 0) {
        console.log(
          `[${i + 1}/${rows.length}] all refns already have URL, skip`,
        );
      }
      continue;
    }

    if (DRY_RUN) {
      console.log(
        `[${i + 1}/${rows.length}] DRY: upload "${row.source_filename}" -> ${storagePath} (refs: ${sharedRefns.join(",")})`,
      );
      uploads++;
      continue;
    }

    try {
      const { publicUrl: url } = await uploadFile(
        storagePath,
        row.source_path,
        row.target_ext,
      );
      publicUrl = url;
      uploads++;
    } catch (err) {
      console.error(
        `[${i + 1}/${rows.length}] UPLOAD FAIL: ${(err as Error).message}`,
      );
      uploadsFailed++;
      continue;
    }

    const { updated, errors } = await updateWords(sharedRefns, publicUrl);
    dbUpdates += updated;
    dbErrors += errors;

    if ((i + 1) % 25 === 0 || i === rows.length - 1) {
      console.log(
        `[${i + 1}/${rows.length}] uploaded ${uploads}, db rows updated ${dbUpdates}, failed ${uploadsFailed}/${dbErrors}`,
      );
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));
  console.log(`Files uploaded:           ${uploads}`);
  console.log(`Files skipped (all set):  ${uploadsSkipped}`);
  console.log(`Upload failures:          ${uploadsFailed}`);
  console.log(`Word rows updated:        ${dbUpdates}`);
  console.log(`Word row update errors:   ${dbErrors}`);
  console.log(`Missing source files:     ${missingSource}`);
  console.log(`Missing word UUIDs:       ${missingUuid}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
