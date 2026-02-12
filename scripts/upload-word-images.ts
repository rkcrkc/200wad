#!/usr/bin/env npx tsx
/**
 * Upload word images to Supabase Storage
 *
 * Usage:
 *   npx tsx scripts/upload-word-images.ts [--source <dir>] [--bucket <name>]
 *
 * Options:
 *   --source   Source directory containing PNG files (default: /private/tmp/word-images)
 *   --bucket   Supabase storage bucket name (default: word-images)
 *   --dry-run  List files without uploading
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

const sourceDir = getArg("source") || "/private/tmp/word-images";
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

async function ensureBucketExists(): Promise<void> {
  // Check if bucket exists
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
      fileSizeLimit: 10 * 1024 * 1024, // 10MB limit
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

async function getExistingFiles(): Promise<Set<string>> {
  const existingFiles = new Set<string>();
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(bucketName).list("", {
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
        existingFiles.add(file.name);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return existingFiles;
}

async function uploadFile(filePath: string, fileName: string): Promise<boolean> {
  const fileBuffer = fs.readFileSync(filePath);

  const { error } = await supabase.storage.from(bucketName).upload(fileName, fileBuffer, {
    contentType: "image/png",
    upsert: false, // Don't overwrite existing files
  });

  if (error) {
    if (error.message.includes("already exists")) {
      return true; // Consider already exists as success
    }
    console.error(`  Failed to upload ${fileName}: ${error.message}`);
    return false;
  }

  return true;
}

async function main() {
  console.log("==========================================");
  console.log("Word Images Upload Script");
  console.log("==========================================");
  console.log(`Source: ${sourceDir}`);
  console.log(`Bucket: ${bucketName}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "UPLOAD"}`);
  console.log("");

  // Check source directory
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    console.error("Run the convert-swf-to-png.sh script first.");
    process.exit(1);
  }

  // Get list of PNG files
  const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".png"));

  if (files.length === 0) {
    console.error("No PNG files found in source directory.");
    process.exit(1);
  }

  console.log(`Found ${files.length} PNG files to upload.`);

  if (dryRun) {
    console.log("\nDry run - no files will be uploaded.");
    console.log("\nFirst 10 files:");
    files.slice(0, 10).forEach((f) => console.log(`  ${f}`));
    if (files.length > 10) {
      console.log(`  ... and ${files.length - 10} more`);
    }
    return;
  }

  // Ensure bucket exists
  await ensureBucketExists();

  // Get existing files to skip
  console.log("\nChecking for existing files...");
  const existingFiles = await getExistingFiles();
  console.log(`Found ${existingFiles.size} existing files in bucket.`);

  // Filter out files that already exist
  const filesToUpload = files.filter((f) => !existingFiles.has(f));
  console.log(`${filesToUpload.length} new files to upload.`);

  if (filesToUpload.length === 0) {
    console.log("\nAll files already uploaded!");
    return;
  }

  // Upload files
  let uploaded = 0;
  let failed = 0;

  console.log("\nUploading...");

  for (const fileName of filesToUpload) {
    const filePath = path.join(sourceDir, fileName);

    const success = await uploadFile(filePath, fileName);

    if (success) {
      uploaded++;
      if (uploaded % 100 === 0) {
        console.log(`  Progress: ${uploaded}/${filesToUpload.length} uploaded`);
      }
    } else {
      failed++;
    }
  }

  console.log("");
  console.log("==========================================");
  console.log("Upload Complete");
  console.log("==========================================");
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Already existed: ${existingFiles.size}`);

  // Print base URL for reference
  console.log("");
  console.log(`Public URL pattern:`);
  console.log(`  ${supabaseUrl}/storage/v1/object/public/${bucketName}/<filename>.png`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
