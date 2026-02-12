#!/usr/bin/env npx tsx
/**
 * Upload word audio files to Supabase Storage and update word records
 *
 * Usage:
 *   npx tsx scripts/upload-word-audio.ts [--source <dir>] [--dry-run]
 *
 * Options:
 *   --source   Source directory (default: /Volumes/Italian 1&2 SuperBundle)
 *   --dry-run  List files without uploading or updating database
 *
 * Folder mapping:
 *   - 1SoundEng, 1SoundFor, 1SoundTrg -> "200 Words A Day Italian" course
 *   - 81SoundEng, 81SoundFor, 81SoundTrg -> "Italian Sentences" course
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
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

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

const sourceDir = getArg("source") || "/Volumes/Italian 1&2 SuperBundle";
const dryRun = hasFlag("dry-run");
const bucketName = "word-audio";

// Course folder mapping
const COURSE_FOLDERS: Record<string, { prefix: string; courseName: string }> = {
  "200 Words A Day Italian": { prefix: "1", courseName: "200 Words A Day Italian" },
  "Italian Sentences": { prefix: "81", courseName: "Italian Sentences" },
};

// Audio type mapping
type AudioType = "english" | "foreign" | "trigger";
const AUDIO_FOLDER_SUFFIX: Record<AudioType, string> = {
  english: "SoundEng",
  foreign: "SoundFor",
  trigger: "SoundTrg",
};

const AUDIO_COLUMN: Record<AudioType, string> = {
  english: "audio_url_english",
  foreign: "audio_url_foreign",
  trigger: "audio_url_trigger",
};

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

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, serviceRoleKey);

interface WordRecord {
  id: string;
  audio_url_english: string | null;
  audio_url_foreign: string | null;
  audio_url_trigger: string | null;
}

async function ensureBucketExists(): Promise<void> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error("Failed to list buckets:", listError.message);
    process.exit(1);
  }

  const bucketExists = buckets?.some((b) => b.name === bucketName);

  if (!bucketExists) {
    console.log(`Creating bucket: ${bucketName}`);
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB limit for audio
    });

    if (createError) {
      console.error("Failed to create bucket:", createError.message);
      process.exit(1);
    }
    console.log(`Bucket '${bucketName}' created successfully.`);
  } else {
    console.log(`Bucket '${bucketName}' already exists.`);
  }
}

async function getWordsForCourse(courseName: string): Promise<WordRecord[]> {
  const allWords: WordRecord[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("words")
      .select(`
        id,
        audio_url_english,
        audio_url_foreign,
        audio_url_trigger,
        lesson_words!inner (
          lessons!inner (
            courses!inner (
              name
            )
          )
        )
      `)
      .eq("lesson_words.lessons.courses.name", courseName)
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error(`Failed to fetch words for ${courseName}:`, error.message);
      break;
    }

    if (!data || data.length === 0) break;

    allWords.push(...data);

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  // Deduplicate by word id
  const seen = new Set<string>();
  return allWords.filter((w) => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
}

async function getExistingFiles(prefix: string): Promise<Set<string>> {
  const existingFiles = new Set<string>();
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
      limit,
      offset,
    });

    if (error) {
      console.error("Failed to list existing files:", error.message);
      break;
    }

    if (!data || data.length === 0) break;

    for (const file of data) {
      if (file.name) {
        existingFiles.add(`${prefix}/${file.name}`);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return existingFiles;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadFile(
  filePath: string,
  storagePath: string,
  retries = 3
): Promise<string | null> {
  const fileBuffer = fs.readFileSync(filePath);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { error } = await supabase.storage.from(bucketName).upload(storagePath, fileBuffer, {
        contentType: "audio/mpeg",
        upsert: false,
      });

      if (error) {
        if (error.message.includes("already exists")) {
          // Return existing URL
          return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${storagePath}`;
        }
        if (attempt < retries) {
          await sleep(1000 * attempt);
          continue;
        }
        console.error(`  Failed to upload ${storagePath}: ${error.message}`);
        return null;
      }

      return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${storagePath}`;
    } catch (err) {
      if (attempt < retries) {
        await sleep(1000 * attempt);
        continue;
      }
      console.error(`  Failed to upload ${storagePath}: ${err}`);
      return null;
    }
  }
  return null;
}

async function updateWordAudioUrl(
  wordId: string,
  column: string,
  url: string,
  retries = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { error } = await supabase
        .from("words")
        .update({ [column]: url })
        .eq("id", wordId);

      if (error) {
        if (attempt < retries) {
          await sleep(1000 * attempt);
          continue;
        }
        console.error(`  Failed to update word ${wordId}: ${error.message}`);
        return false;
      }

      return true;
    } catch (err) {
      if (attempt < retries) {
        await sleep(1000 * attempt);
        continue;
      }
      console.error(`  Failed to update word ${wordId}: ${err}`);
      return false;
    }
  }
  return false;
}

async function processAudioType(
  words: WordRecord[],
  folderPrefix: string,
  audioType: AudioType,
  existingFiles: Set<string>
): Promise<{ uploaded: number; updated: number; skipped: number; failed: number }> {
  const folderName = `${folderPrefix}${AUDIO_FOLDER_SUFFIX[audioType]}`;
  const folderPath = path.join(sourceDir, folderName);
  const column = AUDIO_COLUMN[audioType];

  const stats = { uploaded: 0, updated: 0, skipped: 0, failed: 0 };

  if (!fs.existsSync(folderPath)) {
    console.log(`  Folder not found: ${folderName}`);
    return stats;
  }

  const audioFiles = fs.readdirSync(folderPath).filter((f) => f.toLowerCase().endsWith(".mp3"));
  console.log(`  ${folderName}: ${audioFiles.length} files`);

  // Create a map from filename stem (lowercase) to actual file
  const fileMap = new Map<string, string>();
  for (const file of audioFiles) {
    const stem = file.replace(/\.mp3$/i, "");
    fileMap.set(stem, file);
    // Also add lowercase version for case-insensitive matching
    fileMap.set(stem.toLowerCase(), file);
  }

  for (const word of words) {
    const currentValue = word[column as keyof WordRecord] as string | null;

    // Skip if already has a URL
    if (currentValue && currentValue.startsWith("http")) {
      stats.skipped++;
      continue;
    }

    // Current value should be the filename stem
    if (!currentValue) {
      continue;
    }

    let matchedFile = fileMap.get(currentValue);

    if (!matchedFile) {
      // Try lowercase
      matchedFile = fileMap.get(currentValue.toLowerCase());
    }

    if (!matchedFile) {
      // Try with -f suffix (common for foreign audio files)
      matchedFile = fileMap.get(`${currentValue}-f`);
    }

    if (!matchedFile) {
      // Try lowercase with -f suffix
      matchedFile = fileMap.get(`${currentValue.toLowerCase()}-f`);
    }

    if (!matchedFile) {
      continue; // No matching file found
    }

    const storagePath = `${folderPrefix}/${audioType}/${encodeURIComponent(matchedFile)}`;

    if (dryRun) {
      console.log(`    Would upload: ${matchedFile} -> ${storagePath}`);
      stats.uploaded++;
      continue;
    }

    // Check if already uploaded
    if (existingFiles.has(storagePath)) {
      const url = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${storagePath}`;
      const updated = await updateWordAudioUrl(word.id, column, url);
      if (updated) {
        stats.updated++;
      } else {
        stats.failed++;
      }
      continue;
    }

    // Upload file
    const filePath = path.join(folderPath, matchedFile);
    const url = await uploadFile(filePath, storagePath);

    if (url) {
      stats.uploaded++;
      const updated = await updateWordAudioUrl(word.id, column, url);
      if (updated) {
        stats.updated++;
      } else {
        stats.failed++;
      }
    } else {
      stats.failed++;
    }
  }

  return stats;
}

async function main() {
  console.log("==========================================");
  console.log("Word Audio Upload Script");
  console.log("==========================================");
  console.log(`Source: ${sourceDir}`);
  console.log(`Bucket: ${bucketName}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "UPLOAD"}`);
  console.log("");

  // Check source directory
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    console.error("Make sure the ISO is mounted.");
    process.exit(1);
  }

  if (!dryRun) {
    await ensureBucketExists();
  }

  const totalStats = { uploaded: 0, updated: 0, skipped: 0, failed: 0 };

  for (const [courseName, config] of Object.entries(COURSE_FOLDERS)) {
    console.log(`\nProcessing: ${courseName}`);
    console.log(`  Folder prefix: ${config.prefix}`);

    const words = await getWordsForCourse(courseName);
    console.log(`  Words in database: ${words.length}`);

    if (words.length === 0) {
      continue;
    }

    // Get existing files for this prefix
    const existingFiles = dryRun
      ? new Set<string>()
      : await getExistingFiles(config.prefix);
    console.log(`  Already uploaded: ${existingFiles.size} files`);

    for (const audioType of ["english", "foreign", "trigger"] as AudioType[]) {
      console.log(`\n  Audio type: ${audioType}`);
      const stats = await processAudioType(
        words,
        config.prefix,
        audioType,
        existingFiles
      );

      totalStats.uploaded += stats.uploaded;
      totalStats.updated += stats.updated;
      totalStats.skipped += stats.skipped;
      totalStats.failed += stats.failed;

      console.log(
        `    Uploaded: ${stats.uploaded}, Updated: ${stats.updated}, Skipped: ${stats.skipped}, Failed: ${stats.failed}`
      );
    }
  }

  console.log("");
  console.log("==========================================");
  console.log("Summary");
  console.log("==========================================");
  console.log(`Files uploaded: ${totalStats.uploaded}`);
  console.log(`Words updated: ${totalStats.updated}`);
  console.log(`Already done: ${totalStats.skipped}`);
  console.log(`Failed: ${totalStats.failed}`);

  if (!dryRun) {
    console.log("");
    console.log(`Public URL pattern:`);
    console.log(`  ${supabaseUrl}/storage/v1/object/public/${bucketName}/<prefix>/<type>/<filename>.mp3`);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
