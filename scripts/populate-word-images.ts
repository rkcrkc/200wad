#!/usr/bin/env npx tsx
/**
 * Populate word images in database by matching filenames to words
 *
 * Usage:
 *   npx tsx scripts/populate-word-images.ts [--bucket <name>] [--dry-run]
 *
 * Options:
 *   --bucket   Supabase storage bucket name (default: word-images)
 *   --dry-run  Show matches without updating database
 *
 * Filename format expected: "{italian_word} ,{part_of_speech}.png"
 * Examples:
 *   "abitare ,v.png" -> word "abitare"
 *   "aeroporto ,l (m).png" -> word "aeroporto"
 *   "a ,art.png" -> word "a"
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

const bucketName = getArg("bucket") || "word-images";
const dryRun = hasFlag("dry-run");

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

// Italian articles to strip from words
const ITALIAN_ARTICLES = [
  "l'", "l'", "lo ", "la ", "il ", "i ", "gli ", "le ",
  "un ", "uno ", "una ", "un'", "un'",
];

/**
 * Normalize a word for matching:
 * - lowercase
 * - strip articles
 * - normalize apostrophes
 * - remove extra whitespace
 */
function normalizeWord(word: string): string {
  let normalized = word.toLowerCase().trim();

  // Normalize different apostrophe characters
  normalized = normalized.replace(/[''`]/g, "'");

  // Remove spaces after apostrophes (e.g., "l' indirizzo" -> "l'indirizzo")
  normalized = normalized.replace(/'\s+/g, "'");

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, " ");

  // Strip leading articles (try multiple times for compound articles)
  for (let i = 0; i < 2; i++) {
    for (const article of ITALIAN_ARTICLES) {
      const articleNorm = article.toLowerCase().replace(/\s+$/, "");
      if (normalized.startsWith(articleNorm + " ") || normalized.startsWith(articleNorm + "'")) {
        normalized = normalized.slice(articleNorm.length).replace(/^['\s]+/, "").trim();
        break;
      }
      if (normalized.startsWith(articleNorm) && articleNorm.endsWith("'")) {
        normalized = normalized.slice(articleNorm.length).trim();
        break;
      }
    }
  }

  // Remove parenthetical gender markers like "(m)" or "(f)"
  normalized = normalized.replace(/\s*\([mf]\)\s*/g, "").trim();

  return normalized;
}

/**
 * Generate multiple lookup keys for a word to improve matching
 */
function generateLookupKeys(word: string): string[] {
  const keys = new Set<string>();
  const normalized = normalizeWord(word);

  keys.add(normalized);

  // Also try the original lowercase (in case articles matter)
  let lowercase = word.toLowerCase().trim().replace(/[''`]/g, "'");
  lowercase = lowercase.replace(/'\s+/g, "'").replace(/\s+/g, " ");
  keys.add(lowercase);

  // Try without any apostrophes
  const noApostrophe = normalized.replace(/'/g, "");
  keys.add(noApostrophe);

  // Try without accents (basic normalization)
  const noAccents = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  keys.add(noAccents);

  // For multi-word entries, try just the first word
  const firstWord = normalized.split(/\s+/)[0];
  if (firstWord && firstWord !== normalized) {
    keys.add(firstWord);
  }

  // Remove empty strings
  keys.delete("");

  return Array.from(keys);
}

/**
 * Parse a filename to extract the word
 * Format: "{word} ,{part_of_speech}.png"
 */
function parseFilename(filename: string): string | null {
  // Remove .png extension
  const base = filename.replace(/\.png$/i, "");

  // Find the " ," separator
  const separatorIndex = base.indexOf(" ,");

  if (separatorIndex === -1) {
    // No separator found - might be a different format
    // Try using the whole base as the word
    return base.trim() || null;
  }

  // Extract the word (everything before the separator)
  const word = base.substring(0, separatorIndex).trim();

  return word || null;
}

interface StorageFile {
  name: string;
}

async function getStorageFiles(): Promise<StorageFile[]> {
  const allFiles: StorageFile[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(bucketName).list("", {
      limit,
      offset,
    });

    if (error) {
      console.error("Failed to list storage files:", error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    for (const file of data) {
      if (file.name && file.name.endsWith(".png")) {
        allFiles.push({ name: file.name });
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return allFiles;
}

interface WordRecord {
  id: string;
  headword: string;
  memory_trigger_image_url: string | null;
}

async function getAllWords(): Promise<WordRecord[]> {
  const allWords: WordRecord[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("words")
      .select("id, headword, memory_trigger_image_url")
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Failed to fetch words:", error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    allWords.push(...data);

    if (data.length < limit) break;
    offset += limit;
  }

  return allWords;
}

async function main() {
  console.log("==========================================");
  console.log("Word Images Database Population Script");
  console.log("==========================================");
  console.log(`Bucket: ${bucketName}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "UPDATE"}`);
  console.log("");

  // Get all storage files
  console.log("Fetching storage files...");
  const storageFiles = await getStorageFiles();
  console.log(`Found ${storageFiles.length} PNG files in storage.`);

  // Get all words from database
  console.log("Fetching words from database...");
  const words = await getAllWords();
  console.log(`Found ${words.length} words in database.`);

  // Build lookup map: normalized word -> [files that match]
  // Index each file by multiple normalized keys for better matching
  const wordToFiles = new Map<string, string[]>();

  for (const file of storageFiles) {
    const word = parseFilename(file.name);
    if (word) {
      // Generate multiple lookup keys for this filename
      const keys = generateLookupKeys(word);
      for (const key of keys) {
        if (!wordToFiles.has(key)) {
          wordToFiles.set(key, []);
        }
        // Avoid duplicates
        if (!wordToFiles.get(key)!.includes(file.name)) {
          wordToFiles.get(key)!.push(file.name);
        }
      }
    }
  }

  console.log(`Parsed ${wordToFiles.size} unique lookup keys from filenames.`);
  console.log("");

  // Match words to files
  let matched = 0;
  let alreadySet = 0;
  let noMatch = 0;
  let updated = 0;
  let failed = 0;

  const unmatchedWords: string[] = [];
  const baseUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}`;

  for (const word of words) {
    // Try multiple lookup keys for the database word
    const lookupKeys = generateLookupKeys(word.headword);
    let files: string[] | undefined;

    for (const key of lookupKeys) {
      files = wordToFiles.get(key);
      if (files && files.length > 0) break;
    }

    if (!files || files.length === 0) {
      noMatch++;
      if (unmatchedWords.length < 20) {
        unmatchedWords.push(word.headword);
      }
      continue;
    }

    matched++;

    // Use the first matching file
    const fileName = files[0];
    const imageUrl = `${baseUrl}/${encodeURIComponent(fileName)}`;

    // Check if already set
    if (word.memory_trigger_image_url === imageUrl) {
      alreadySet++;
      continue;
    }

    if (dryRun) {
      if (updated < 10) {
        console.log(`  Would update "${word.headword}" -> ${fileName}`);
      }
      updated++;
      continue;
    }

    // Update the database
    const { error } = await supabase
      .from("words")
      .update({ memory_trigger_image_url: imageUrl })
      .eq("id", word.id);

    if (error) {
      console.error(`  Failed to update "${word.headword}": ${error.message}`);
      failed++;
    } else {
      updated++;
      if (updated % 100 === 0) {
        console.log(`  Progress: ${updated} words updated`);
      }
    }
  }

  console.log("");
  console.log("==========================================");
  console.log("Results");
  console.log("==========================================");
  console.log(`Total words in database: ${words.length}`);
  console.log(`Words with matching images: ${matched}`);
  console.log(`Words without matching images: ${noMatch}`);
  console.log(`Already had correct URL: ${alreadySet}`);
  console.log(`${dryRun ? "Would update" : "Updated"}: ${updated}`);
  if (!dryRun) {
    console.log(`Failed to update: ${failed}`);
  }

  if (unmatchedWords.length > 0) {
    console.log("");
    console.log("Sample unmatched words:");
    unmatchedWords.slice(0, 10).forEach((w) => console.log(`  - ${w}`));
    if (noMatch > 10) {
      console.log(`  ... and ${noMatch - 10} more`);
    }
  }

  // Show some parse examples for debugging
  console.log("");
  console.log("Sample filename parsing:");
  storageFiles.slice(0, 5).forEach((f) => {
    const word = parseFilename(f.name);
    console.log(`  "${f.name}" -> "${word}"`);
  });
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
