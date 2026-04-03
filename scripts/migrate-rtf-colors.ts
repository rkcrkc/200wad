#!/usr/bin/env npx tsx
/**
 * Migrate RTF trigger text color styling to database markers
 *
 * This script parses RTF files from the legacy database to extract color-coded
 * text portions and updates the memory_trigger_text field with {{...}} markers.
 *
 * Usage:
 *   npx tsx scripts/migrate-rtf-colors.ts --rtf-base "/Volumes/Italian 1&2 SuperBundle" --course-prefix 1
 *
 * Options:
 *   --rtf-base <path>      Base path to the RTF files folder
 *   --course-prefix <num>  Course prefix (e.g., "1" for 1RtfTrg folder)
 *   --dry-run              Parse and show changes without writing to database
 *   --limit <num>          Limit number of records to process (for testing)
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

const rtfBasePathArg = getArg("rtf-base");
const coursePrefixArg = getArg("course-prefix");
const dryRun = hasFlag("dry-run");
const limit = getArg("limit") ? parseInt(getArg("limit")!, 10) : undefined;

if (!rtfBasePathArg || !coursePrefixArg) {
  console.error("Usage: npx tsx scripts/migrate-rtf-colors.ts --rtf-base <path> --course-prefix <num>");
  console.error("");
  console.error("Options:");
  console.error("  --rtf-base <path>      Base path to the RTF files folder");
  console.error("  --course-prefix <num>  Course prefix (e.g., '1' for 1RtfTrg folder)");
  console.error("  --dry-run              Parse and show changes without writing to database");
  console.error("  --limit <num>          Limit number of records to process");
  console.error("");
  console.error("Example:");
  console.error('  npx tsx scripts/migrate-rtf-colors.ts --rtf-base "/Volumes/Italian 1&2 SuperBundle" --course-prefix 1 --dry-run');
  process.exit(1);
}

// Safe to use after validation
const rtfBasePath: string = rtfBasePathArg;
const coursePrefix: string = coursePrefixArg;

// Validate environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing required environment variables:");
  if (!supabaseUrl) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

// ============================================================================
// RTF Color Parsing
// ============================================================================

interface ColorDef {
  red: number;
  green: number;
  blue: number;
}

/**
 * Parse the color table from RTF content
 * Returns a map of color index to RGB values
 */
function parseColorTable(rtfContent: string): Map<number, ColorDef> {
  const colorMap = new Map<number, ColorDef>();

  // Find the colortbl block
  const colorTableMatch = rtfContent.match(/\{\\colortbl\s*;([^}]*)\}/);
  if (!colorTableMatch) {
    return colorMap;
  }

  const colorDefs = colorTableMatch[1];

  // Split by semicolons to get individual color definitions
  // Format: \red0\green128\blue0;
  const colorParts = colorDefs.split(";").filter(Boolean);

  colorParts.forEach((colorDef, index) => {
    const redMatch = colorDef.match(/\\red(\d+)/);
    const greenMatch = colorDef.match(/\\green(\d+)/);
    const blueMatch = colorDef.match(/\\blue(\d+)/);

    if (redMatch && greenMatch && blueMatch) {
      colorMap.set(index + 1, {
        red: parseInt(redMatch[1], 10),
        green: parseInt(greenMatch[1], 10),
        blue: parseInt(blueMatch[1], 10),
      });
    }
  });

  return colorMap;
}

/**
 * Determine the color category based on RGB values
 */
function getColorCategory(color: ColorDef): "red" | "blue" | "green" | null {
  const { red, green, blue } = color;

  // Red (feminine): high red, low green and blue
  if (red > 200 && green < 50 && blue < 50) {
    return "red";
  }

  // Blue (masculine): high blue, low red, any green
  if (blue > 200 && red < 100) {
    return "blue";
  }

  // Light blue variation
  if (blue > 200 && red < 100 && green < 150) {
    return "blue";
  }

  // Another blue shade (like \red51\green102\blue255)
  if (blue > 200 && red < 100) {
    return "blue";
  }

  // Green (verbs, etc): high green, low red and blue
  if (green > 100 && red < 50 && blue < 50) {
    return "green";
  }

  return null;
}

/**
 * Remove a balanced brace block from RTF content
 */
function removeBalancedBlock(content: string, startPattern: RegExp): string {
  const match = content.match(startPattern);
  if (!match) return content;

  const startIndex = match.index!;
  let braceCount = 0;
  let endIndex = startIndex;

  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === "{") braceCount++;
    else if (content[i] === "}") {
      braceCount--;
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  return content.slice(0, startIndex) + content.slice(endIndex);
}

/**
 * Extract plain text from RTF content, preserving color markers
 * Returns the text with {{...}} markers around colored portions
 */
function extractTextWithColorMarkers(rtfContent: string): string {
  // IMPORTANT: Parse color table BEFORE removing blocks
  const colorMap = parseColorTable(rtfContent);

  // Find the main content (after the header blocks)
  let content = rtfContent;

  // Remove header blocks with balanced brace matching
  content = removeBalancedBlock(content, /\{\\fonttbl/);
  content = removeBalancedBlock(content, /\{\\colortbl/);
  content = removeBalancedBlock(content, /\{\\stylesheet/);
  content = removeBalancedBlock(content, /\{\\info/);
  content = removeBalancedBlock(content, /\{\\\*\\generator/);

  // Remove the outer RTF wrapper - match the opening brace and rtf1 declaration with properties
  content = content.replace(/^\{\\rtf1(?:\\[a-z]+\d*)*\s*/, "");
  // Remove trailing closing brace, whitespace, and null characters
  content = content.replace(/\}[\s\x00]*$/, "");

  // Build the output with color markers
  let result = "";
  let currentColor: "red" | "blue" | "green" | null = null;
  let inColorSpan = false;
  let i = 0;

  while (i < content.length) {
    // Check for control sequences
    if (content[i] === "\\") {
      // Check for color change: \cfN
      const cfMatch = content.slice(i).match(/^\\cf(\d+)/);
      if (cfMatch) {
        const colorIndex = parseInt(cfMatch[1], 10);
        const newColor = colorIndex === 0 ? null : (colorMap.has(colorIndex) ? getColorCategory(colorMap.get(colorIndex)!) : null);

        // Close previous span if needed
        if (inColorSpan && newColor !== currentColor) {
          result += "}}";
          inColorSpan = false;
        }

        // Open new span if needed
        if (newColor && !inColorSpan) {
          result += "{{";
          inColorSpan = true;
        }

        currentColor = newColor;
        i += cfMatch[0].length;
        continue;
      }

      // Skip other control words
      const controlMatch = content.slice(i).match(/^\\([a-z]+)(-?\d+)?[ ]?/i);
      if (controlMatch) {
        const controlWord = controlMatch[1].toLowerCase();

        // Handle special characters
        if (controlWord === "par") {
          // Close any open span before paragraph
          if (inColorSpan) {
            result += "}}";
            inColorSpan = false;
            currentColor = null;
          }
          result += "\n";
        } else if (controlWord === "tab") {
          result += "\t";
        } else if (controlWord === "line") {
          result += "\n";
        }
        // Skip formatting codes like \b, \i, \f0, \fs24, \s1 (style refs), etc.
        i += controlMatch[0].length;

        // If this is a style reference (\s1, \s2, etc.), also skip any following text until semicolon
        // This handles things like "\s1 heading 1;"
        if (controlWord === "s" && controlMatch[2]) {
          // Skip until we hit a non-style-name character or semicolon
          const styleNameMatch = content.slice(i).match(/^[^;\\{}]*;?/);
          if (styleNameMatch) {
            i += styleNameMatch[0].length;
          }
        }
        continue;
      }

      // Handle escaped characters
      if (content[i + 1] === "'" && content.length > i + 3) {
        // Hex character like \'e0
        const hexCode = content.slice(i + 2, i + 4);
        const charCode = parseInt(hexCode, 16);
        result += String.fromCharCode(charCode);
        i += 4;
        continue;
      }

      // Handle literal characters
      if (content[i + 1] === "{" || content[i + 1] === "}" || content[i + 1] === "\\") {
        result += content[i + 1];
        i += 2;
        continue;
      }

      // Skip unknown control sequences
      i++;
      continue;
    }

    // Skip braces (RTF grouping)
    if (content[i] === "{" || content[i] === "}") {
      i++;
      continue;
    }

    // Regular character - add to result
    result += content[i];
    i++;
  }

  // Close any remaining open span
  if (inColorSpan) {
    result += "}}";
  }

  // Clean up the result
  result = result
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    // Move whitespace from inside markers to outside
    // e.g. "with{{ ELECTRO}}" → "with {{ELECTRO}}"
    // e.g. "{{ELECTRO }}appliances" → "{{ELECTRO}} appliances"
    .replace(/\{\{\s+/g, " {{")
    .replace(/\s+\}\}/g, "}} ")
    // Clean up any double spaces introduced
    .replace(/  +/g, " ")
    // Clean up space at start of text (if marker was at the beginning)
    .replace(/^ /, "")
    // Remove empty markers
    .replace(/\{\{\}\}/g, "")
    // Remove font special characters (like *00000...)
    .replace(/\*[\dA-Fa-f]+[^;]*;/g, "")
    .trim();

  // If result is mostly noise or too short, skip it
  if (result.length < 10 || /^[\s\n*;]+$/.test(result)) {
    return "";
  }

  return result;
}

/**
 * Extract filename and course number from audio_url_trigger
 * Returns { filename, courseNum } where courseNum might differ from the --course-prefix
 */
function extractTriggerInfo(audioUrlTrigger: string | null): { filename: string | null; courseNum: string | null } {
  if (!audioUrlTrigger) return { filename: null, courseNum: null };

  // If it's a full URL, extract the filename and course number
  if (audioUrlTrigger.startsWith("http")) {
    try {
      const url = new URL(audioUrlTrigger);
      const pathParts = url.pathname.split("/");
      const filename = decodeURIComponent(pathParts[pathParts.length - 1]);

      // Extract course number from path like /word-audio/1/trigger/...
      const courseMatch = url.pathname.match(/\/word-audio\/(\d+)\//);
      const courseNum = courseMatch ? courseMatch[1] : null;

      // Remove .mp3 extension to get the base name
      return {
        filename: filename.replace(/\.mp3$/i, ""),
        courseNum
      };
    } catch {
      return { filename: null, courseNum: null };
    }
  }

  // Otherwise it's a raw filename (possibly without extension)
  return { filename: audioUrlTrigger, courseNum: null };
}

/**
 * Build RTF file paths to try for a given word
 * Tries multiple filename patterns and folders based on audio_url_trigger info
 */
function buildRtfPaths(
  basePath: string,
  prefix: string,
  legacyRefn: number,
  audioUrlTrigger: string | null
): string[] {
  const paths: string[] = [];
  const { filename: triggerFilename, courseNum } = extractTriggerInfo(audioUrlTrigger);

  // Determine which course folders to search
  const foldersToSearch = new Set<string>();
  foldersToSearch.add(prefix); // Always try the specified prefix

  // If audio URL has a different course number, also search that folder
  if (courseNum && courseNum !== prefix) {
    foldersToSearch.add(courseNum);
  }

  for (const folder of foldersToSearch) {
    const rtfDir = path.join(basePath, `${folder}RtfTrg`);

    // Try ZT{legacy_refn} pattern
    paths.push(path.join(rtfDir, `ZT${legacyRefn}.rtf`));
    paths.push(path.join(rtfDir, `ZT${legacyRefn}.RTF`));

    // Try audio_url_trigger filename pattern
    if (triggerFilename) {
      paths.push(path.join(rtfDir, `${triggerFilename}.rtf`));
      paths.push(path.join(rtfDir, `${triggerFilename}.RTF`));
    }
  }

  return paths;
}

/**
 * Find and read an RTF file
 */
function readRtfFile(paths: string[]): string | null {
  for (const rtfPath of paths) {
    if (fs.existsSync(rtfPath)) {
      return fs.readFileSync(rtfPath, "utf-8");
    }
  }
  return null;
}

// ============================================================================
// Main Migration Logic
// ============================================================================

async function main() {
  console.log("RTF Color Migration Script");
  console.log("==========================");
  console.log(`RTF Base Path: ${rtfBasePath}`);
  console.log(`Course Prefix: ${coursePrefix}`);
  console.log(`Dry Run: ${dryRun}`);
  if (limit) console.log(`Limit: ${limit}`);
  console.log("");

  // Verify RTF folder exists
  const rtfDir = path.join(rtfBasePath, `${coursePrefix}RtfTrg`);
  if (!fs.existsSync(rtfDir)) {
    console.error(`RTF directory not found: ${rtfDir}`);
    process.exit(1);
  }

  console.log(`Found RTF directory: ${rtfDir}`);
  const rtfFiles = fs.readdirSync(rtfDir).filter(f => f.toLowerCase().endsWith(".rtf"));
  console.log(`Found ${rtfFiles.length} RTF files`);
  console.log("");

  // Fetch words from database that have legacy_refn
  console.log("Fetching words from database...");

  // Determine the legacy_refn range for this course prefix
  // Course 1: 10000-19999, Course 21: 210000-219999, etc.
  const refnMin = parseInt(coursePrefix, 10) * 10000;
  const refnMax = refnMin + 9999;

  let query = supabase
    .from("words")
    .select("id, legacy_refn, memory_trigger_text, headword, audio_url_trigger")
    .gte("legacy_refn", refnMin)
    .lte("legacy_refn", refnMax)
    .not("legacy_refn", "is", null);

  if (limit) {
    query = query.limit(limit);
  }

  const { data: words, error } = await query;

  if (error) {
    console.error("Error fetching words:", error);
    process.exit(1);
  }

  console.log(`Found ${words?.length || 0} words with legacy_refn in range ${refnMin}-${refnMax}`);
  console.log("");

  if (!words || words.length === 0) {
    console.log("No words to process.");
    return;
  }

  // Process each word
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let noFile = 0;
  let noColor = 0;

  const updates: { id: string; memory_trigger_text: string; headword: string }[] = [];

  for (const word of words) {
    processed++;

    const rtfPaths = buildRtfPaths(rtfBasePath, coursePrefix, word.legacy_refn, word.audio_url_trigger);
    const rtfContent = readRtfFile(rtfPaths);

    if (!rtfContent) {
      noFile++;
      if (dryRun && processed <= 10) {
        console.log(`[${processed}] No RTF file for legacy_refn ${word.legacy_refn} (tried: ${word.audio_url_trigger || 'none'})`);
      }
      continue;
    }

    // Parse the RTF and extract text with color markers
    const markedText = extractTextWithColorMarkers(rtfContent);

    // Check if any color markers were added
    if (!markedText.includes("{{")) {
      noColor++;
      if (dryRun && processed <= 20) {
        console.log(`[${processed}] No colors found in RTF for: ${word.headword} (refn: ${word.legacy_refn})`);
      }
      continue;
    }

    // Check if the text changed
    if (markedText === word.memory_trigger_text) {
      skipped++;
      continue;
    }

    updates.push({
      id: word.id,
      memory_trigger_text: markedText,
      headword: word.headword,
    });
    updated++;

    if (dryRun) {
      console.log(`\n[${processed}] ${word.headword} (refn: ${word.legacy_refn})`);
      console.log("  Current:", word.memory_trigger_text?.slice(0, 80) || "(empty)");
      console.log("  New:    ", markedText.slice(0, 80));
    }
  }

  console.log("");
  console.log("Summary");
  console.log("-------");
  console.log(`Processed: ${processed}`);
  console.log(`To Update: ${updated}`);
  console.log(`No RTF File: ${noFile}`);
  console.log(`No Colors: ${noColor}`);
  console.log(`Already Up-to-date: ${skipped}`);

  if (dryRun) {
    console.log("\n[DRY RUN] No database changes made.");
    console.log("Run without --dry-run to apply changes.");
    return;
  }

  // Apply updates
  if (updates.length > 0) {
    console.log(`\nApplying ${updates.length} updates...`);

    // Batch updates
    const batchSize = 50;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      for (const update of batch) {
        const { error: updateError } = await supabase
          .from("words")
          .update({ memory_trigger_text: update.memory_trigger_text })
          .eq("id", update.id);

        if (updateError) {
          console.error(`Error updating word ${update.id}:`, updateError);
        }
      }

      console.log(`  Updated ${Math.min(i + batchSize, updates.length)} of ${updates.length}`);
    }

    console.log("\nMigration complete!");
  }
}

main().catch(console.error);
