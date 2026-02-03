#!/usr/bin/env npx tsx
/**
 * Import lessons from a CSV file into a course
 *
 * Usage:
 *   npx tsx scripts/import-lessons.ts --course-id <UUID> --file <path-to-csv>
 *
 * CSV Format (with header row):
 *   number,title
 *   1,Greetings
 *   2,Numbers
 *   3,Colors
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

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

const courseId = getArg("course-id");
const filePath = getArg("file");

if (!courseId || !filePath) {
  console.error("Usage: npx tsx scripts/import-lessons.ts --course-id <UUID> --file <path-to-csv>");
  console.error("");
  console.error("Example:");
  console.error("  npx tsx scripts/import-lessons.ts --course-id abc123-def456 --file ./lessons.csv");
  process.exit(1);
}

// Validate environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing required environment variables:");
  if (!supabaseUrl) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  console.error("");
  console.error("Make sure these are set in your .env.local file or environment.");
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  // Verify the course exists
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, name")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    console.error(`Course not found with ID: ${courseId}`);
    process.exit(1);
  }

  console.log(`Importing lessons into course: ${course.name}`);

  // Read and parse CSV
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(absolutePath, "utf-8");
  
  interface LessonRow {
    number: string;
    title: string;
    emoji?: string;
  }
  
  const records: LessonRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length === 0) {
    console.error("No records found in CSV file.");
    process.exit(1);
  }

  console.log(`Found ${records.length} lessons to import.`);

  // Insert lessons
  let successCount = 0;
  let errorCount = 0;

  for (const row of records) {
    const lessonNumber = parseInt(row.number, 10);
    
    if (isNaN(lessonNumber)) {
      console.error(`  Skipping invalid row: number="${row.number}" title="${row.title}"`);
      errorCount++;
      continue;
    }

    const { error } = await supabase.from("lessons").insert({
      course_id: courseId,
      number: lessonNumber,
      title: row.title,
      emoji: row.emoji || null,
      is_published: false,
      word_count: 0,
      sort_order: lessonNumber,
    });

    if (error) {
      console.error(`  Failed to insert lesson #${lessonNumber} "${row.title}": ${error.message}`);
      errorCount++;
    } else {
      console.log(`  ✓ Lesson #${lessonNumber}: ${row.title}`);
      successCount++;
    }
  }

  console.log("");
  console.log(`Import complete: ${successCount} succeeded, ${errorCount} failed.`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
