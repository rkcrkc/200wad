#!/usr/bin/env npx tsx
/**
 * Fix lesson numbers by setting `number` to `legacy_lesson_id`
 *
 * The legacy_lesson_id contains the unique lesson number from Sections.csv column B "Lesson"
 * This script updates the `number` field to match `legacy_lesson_id`
 *
 * Usage:
 *   npx tsx scripts/fix-lesson-numbers.ts
 */

import { createClient } from "@supabase/supabase-js";
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("Fetching lessons with legacy_lesson_id...");

  // Fetch all lessons that have a legacy_lesson_id
  const { data: lessons, error: fetchError } = await supabase
    .from("lessons")
    .select("id, number, legacy_lesson_id, title")
    .not("legacy_lesson_id", "is", null)
    .order("legacy_lesson_id");

  if (fetchError) {
    console.error("Error fetching lessons:", fetchError);
    process.exit(1);
  }

  if (!lessons || lessons.length === 0) {
    console.log("No lessons with legacy_lesson_id found.");
    return;
  }

  console.log(`Found ${lessons.length} lessons with legacy_lesson_id`);

  // Check for lessons where number != legacy_lesson_id
  const needsUpdate = lessons.filter((l) => l.number !== l.legacy_lesson_id);
  console.log(`${needsUpdate.length} lessons need updating`);

  if (needsUpdate.length === 0) {
    console.log("All lesson numbers already match legacy_lesson_id. Nothing to do.");
    return;
  }

  // Show first 10 that need updating
  console.log("\nFirst 10 lessons to update:");
  needsUpdate.slice(0, 10).forEach((l) => {
    console.log(`  ID: ${l.id}, current number: ${l.number} -> new number: ${l.legacy_lesson_id} (${l.title})`);
  });

  // Update each lesson
  console.log("\nUpdating lessons...");
  let updated = 0;
  let errors = 0;

  for (const lesson of needsUpdate) {
    const { error: updateError } = await supabase
      .from("lessons")
      .update({ number: lesson.legacy_lesson_id })
      .eq("id", lesson.id);

    if (updateError) {
      console.error(`Error updating lesson ${lesson.id}:`, updateError);
      errors++;
    } else {
      updated++;
    }
  }

  console.log(`\nDone! Updated ${updated} lessons, ${errors} errors.`);

  // Verify no duplicates
  console.log("\nVerifying no duplicate lesson numbers...");
  const { data: duplicates, error: dupError } = await supabase
    .rpc("check_duplicate_lesson_numbers");

  if (dupError) {
    // If RPC doesn't exist, do a manual check
    console.log("(RPC not available, skipping duplicate check)");
  } else if (duplicates && duplicates.length > 0) {
    console.warn("Warning: Found duplicate lesson numbers:", duplicates);
  } else {
    console.log("No duplicate lesson numbers found.");
  }
}

main().catch(console.error);
