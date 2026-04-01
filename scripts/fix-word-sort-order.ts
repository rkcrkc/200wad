#!/usr/bin/env npx tsx
/**
 * Fix word sort order in lesson_words table
 *
 * Reads LessonSortOrder from General.csv and updates the sort_order
 * in the lesson_words join table so words appear in the intended
 * teaching order (not alphabetical).
 *
 * Usage:
 *   npx tsx scripts/fix-word-sort-order.ts --data-dir /path/to/csv/files
 *   npx tsx scripts/fix-word-sort-order.ts --data-dir /path/to/csv/files --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

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
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

const dataDirArg = getArg("data-dir");
const dryRun = hasFlag("dry-run");

if (!dataDirArg) {
  console.error("Usage: npx tsx scripts/fix-word-sort-order.ts --data-dir <path> [--dry-run]");
  process.exit(1);
}

const dataDir = dataDirArg;

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

interface GeneralRow {
  Lesson: string;
  LessonSortOrder: string;
  RefN: string;
  Course: string;
}

function readCsv<T>(filePath: string): T[] {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  const content = fs.readFileSync(absolutePath, "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  }) as T[];
}

async function main() {
  console.log("=".repeat(60));
  console.log("Fix Word Sort Order");
  console.log("=".repeat(60));
  console.log(`Data directory: ${dataDir}`);
  console.log(`Dry run: ${dryRun}`);
  console.log("");

  // Step 1: Read CSV and build RefN -> LessonSortOrder mapping
  console.log("Step 1: Reading General.csv...");
  const generalPath = path.join(dataDir, "General.csv");
  const rows = readCsv<GeneralRow>(generalPath);
  console.log(`  Total rows: ${rows.length}`);

  // Group by Lesson, collecting { RefN, LessonSortOrder }
  const byLesson = new Map<string, { refN: number; lessonSortOrder: string }[]>();
  let skipped = 0;

  for (const row of rows) {
    const refN = parseInt(row.RefN, 10);
    if (isNaN(refN) || !row.Lesson || row.Course === "0") {
      skipped++;
      continue;
    }

    const lessonKey = row.Lesson;
    if (!byLesson.has(lessonKey)) {
      byLesson.set(lessonKey, []);
    }
    byLesson.get(lessonKey)!.push({
      refN,
      lessonSortOrder: row.LessonSortOrder || "",
    });
  }

  console.log(`  Lessons found: ${byLesson.size}`);
  console.log(`  Rows skipped: ${skipped}`);

  // Sort each lesson's words by LessonSortOrder alphanumerically
  for (const [, words] of byLesson) {
    words.sort((a, b) => a.lessonSortOrder.localeCompare(b.lessonSortOrder, undefined, { numeric: true }));
  }

  // Build RefN -> desired sort_order (1-based sequential integer per lesson)
  const refNToSortOrder = new Map<number, number>();
  for (const [, words] of byLesson) {
    words.forEach((w, index) => {
      refNToSortOrder.set(w.refN, index + 1);
    });
  }

  console.log(`  RefN -> sort_order mappings: ${refNToSortOrder.size}`);

  // Step 2: Fetch all words with legacy_refn to build refN -> word UUID map
  console.log("\nStep 2: Fetching words from database...");
  const refNToWordId = new Map<number, string>();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data: words } = await supabase
      .from("words")
      .select("id, legacy_refn")
      .not("legacy_refn", "is", null)
      .range(offset, offset + pageSize - 1);

    if (!words || words.length === 0) break;

    for (const word of words) {
      if (word.legacy_refn !== null) {
        refNToWordId.set(word.legacy_refn, word.id);
      }
    }

    offset += pageSize;
    if (words.length < pageSize) break;
  }

  console.log(`  Words with legacy_refn: ${refNToWordId.size}`);

  // Step 3: Fetch all lesson_words and update sort_order
  console.log("\nStep 3: Updating sort_order in lesson_words...");

  // Fetch all lesson_words
  const allLessonWords: { lesson_id: string; word_id: string; sort_order: number | null }[] = [];
  offset = 0;

  while (true) {
    const { data: lws } = await supabase
      .from("lesson_words")
      .select("lesson_id, word_id, sort_order")
      .range(offset, offset + pageSize - 1);

    if (!lws || lws.length === 0) break;
    allLessonWords.push(...lws);
    offset += pageSize;
    if (lws.length < pageSize) break;
  }

  console.log(`  Total lesson_words rows: ${allLessonWords.length}`);

  // Build word UUID -> refN reverse map
  const wordIdToRefN = new Map<string, number>();
  for (const [refN, wordId] of refNToWordId) {
    wordIdToRefN.set(wordId, refN);
  }

  // Find rows that need updating
  let updatedCount = 0;
  let unchangedCount = 0;
  let noMappingCount = 0;

  const updates: { lessonId: string; wordId: string; newSortOrder: number }[] = [];

  for (const lw of allLessonWords) {
    const refN = wordIdToRefN.get(lw.word_id);
    if (refN === undefined) {
      noMappingCount++;
      continue;
    }

    const desiredSortOrder = refNToSortOrder.get(refN);
    if (desiredSortOrder === undefined) {
      noMappingCount++;
      continue;
    }

    if (lw.sort_order === desiredSortOrder) {
      unchangedCount++;
      continue;
    }

    updates.push({
      lessonId: lw.lesson_id,
      wordId: lw.word_id,
      newSortOrder: desiredSortOrder,
    });
  }

  console.log(`  Rows to update: ${updates.length}`);
  console.log(`  Already correct: ${unchangedCount}`);
  console.log(`  No mapping found: ${noMappingCount}`);

  if (dryRun) {
    // Show a few sample changes
    console.log("\n  Sample changes (first 10):");
    for (const u of updates.slice(0, 10)) {
      const refN = wordIdToRefN.get(u.wordId);
      console.log(`    word refN=${refN}: sort_order -> ${u.newSortOrder}`);
    }
    console.log("\n[DRY RUN] No changes made.");
    process.exit(0);
  }

  // Apply updates in batches
  const batchSize = 50;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map((u) =>
        supabase
          .from("lesson_words")
          .update({ sort_order: u.newSortOrder })
          .eq("lesson_id", u.lessonId)
          .eq("word_id", u.wordId)
      )
    );

    const errors = results.filter((r) => r.error);
    updatedCount += batch.length - errors.length;

    if (errors.length > 0) {
      console.error(`  Batch ${Math.floor(i / batchSize) + 1}: ${errors.length} errors`);
    }

    if ((i + batchSize) % 500 === 0 || i + batchSize >= updates.length) {
      console.log(`  Progress: ${Math.min(i + batchSize, updates.length)} / ${updates.length}`);
    }
  }

  console.log(`\n  Updated: ${updatedCount} rows`);
  console.log("\nDone!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
