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

/**
 * Windows-1252 → Unicode mapping for the 0x80–0x9F range, where Win-1252
 * defines printable typographic characters but Unicode reserves C1 controls.
 * RTF \'XX escapes are byte values in the document code page (cpg1252 here),
 * not Unicode code points, so values below must be remapped before they are
 * stored. All other byte values (0x00–0x7F, 0xA0–0xFF) coincide with Unicode.
 */
const WIN1252_C1_MAP: Record<number, number> = {
  0x80: 0x20ac, // €
  0x82: 0x201a, // ‚
  0x83: 0x0192, // ƒ
  0x84: 0x201e, // „
  0x85: 0x2026, // …
  0x86: 0x2020, // †
  0x87: 0x2021, // ‡
  0x88: 0x02c6, // ˆ
  0x89: 0x2030, // ‰
  0x8a: 0x0160, // Š
  0x8b: 0x2039, // ‹
  0x8c: 0x0152, // Œ
  0x8e: 0x017d, // Ž
  0x91: 0x2018, // ‘
  0x92: 0x2019, // ’
  0x93: 0x201c, // “
  0x94: 0x201d, // ”
  0x95: 0x2022, // •
  0x96: 0x2013, // –
  0x97: 0x2014, // —
  0x98: 0x02dc, // ˜
  0x99: 0x2122, // ™
  0x9a: 0x0161, // š
  0x9b: 0x203a, // ›
  0x9c: 0x0153, // œ
  0x9e: 0x017e, // ž
  0x9f: 0x0178, // Ÿ
};

function decodeWin1252Byte(byte: number): string {
  if (byte >= 0x80 && byte <= 0x9f && WIN1252_C1_MAP[byte] !== undefined) {
    return String.fromCharCode(WIN1252_C1_MAP[byte]);
  }
  return String.fromCharCode(byte);
}

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
 * Repeatedly strip every balanced block matching startPattern.
 * Used for destinations that can occur many times (e.g. \pict, \*\...).
 */
function removeAllBalancedBlocks(content: string, startPattern: RegExp): string {
  let prev: string;
  let next = content;
  do {
    prev = next;
    next = removeBalancedBlock(prev, startPattern);
  } while (next !== prev);
  return next;
}

/**
 * Extract plain text from RTF content, preserving color and italic markers.
 *
 * Returns text with:
 *   - `{{...}}` around color-coded portions (gender / part-of-speech emphasis)
 *   - `*...*`   around italic portions (typically the English gloss)
 *
 * Markers may overlap when the source RTF interleaves \i / \cfN spans.
 * Each state is tracked independently and the renderer
 * (`src/lib/utils/parseTriggerText.tsx`) parses both syntaxes via recursive
 * descent so nesting in either direction renders correctly.
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

  // Remove embedded binary destinations that can leak hex/byte residue into
  // plain text. These can appear multiple times in a document, so use the
  // exhaustive variant. Order matters: \*-prefixed destinations are stripped
  // last so that more specific patterns (\pict, \object) match first.
  content = removeAllBalancedBlocks(content, /\{\\pict\b/);
  content = removeAllBalancedBlocks(content, /\{\\object\b/);
  content = removeAllBalancedBlocks(content, /\{\\result\b/);
  content = removeAllBalancedBlocks(content, /\{\\\*\\[a-z]+\b/i);

  // Remove the outer RTF wrapper - match the opening brace and rtf1 declaration with properties
  content = content.replace(/^\{\\rtf1(?:\\[a-z]+\d*)*\s*/, "");
  // Remove trailing closing brace, whitespace, and null characters
  content = content.replace(/\}[\s\x00]*$/, "");

  // Build the output with color and italic markers
  let result = "";
  let currentColor: "red" | "blue" | "green" | null = null;
  let inColorSpan = false;
  let inItalic = false;
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

      // \i  → italic on, \i0 → italic off, \iN (N>0) → italic on (rare).
      // Must be checked BEFORE the catch-all control-word handler below, which
      // silently drops every formatting code (\b, \i, \fs24, …). The negative
      // lookahead `(?![a-zA-Z])` keeps `\itap`, `\info`, `\intbl`, `\insrsid`,
      // etc. from matching this branch — the optional digit group `(-?\d+)?`
      // captures the toggle argument when present.
      const italicMatch = content.slice(i).match(/^\\i(-?\d+)?(?![a-zA-Z])/);
      if (italicMatch) {
        const newItalic = italicMatch[1] !== "0";
        if (newItalic !== inItalic) {
          result += "*";
          inItalic = newItalic;
        }
        i += italicMatch[0].length;
        // RTF terminates control words with an optional space; consume it so
        // it isn't emitted as a stray leading/trailing space inside the marker.
        if (i < content.length && content[i] === " ") i += 1;
        continue;
      }

      // \binN — the next N bytes are raw binary and must be skipped wholesale.
      // The catch-all below would only advance one byte at a time, leaking any
      // printable bytes (`_`, `?`, `B`, `+`, …) into the output text.
      const binMatch = content.slice(i).match(/^\\bin(\d+)[ ]?/i);
      if (binMatch) {
        const byteCount = parseInt(binMatch[1], 10);
        i += binMatch[0].length + (Number.isFinite(byteCount) ? byteCount : 0);
        continue;
      }

      // Skip other control words
      const controlMatch = content.slice(i).match(/^\\([a-z]+)(-?\d+)?[ ]?/i);
      if (controlMatch) {
        const controlWord = controlMatch[1].toLowerCase();

        // \uN — Unicode escape (signed 16-bit). Followed by an ASCII fallback
        // character whose length defaults to 1 (\uc1). Most legacy 200WAD RTFs
        // use the default, so we emit the codepoint and skip one fallback char.
        if (controlWord === "u" && controlMatch[2]) {
          let codepoint = parseInt(controlMatch[2], 10);
          if (codepoint < 0) codepoint += 65536; // signed → unsigned
          result += String.fromCharCode(codepoint);
          i += controlMatch[0].length;
          // Skip one ASCII fallback char unless it's another control sequence
          // or grouping brace (those belong to subsequent tokens).
          if (i < content.length && content[i] !== "\\" && content[i] !== "{" && content[i] !== "}") {
            i += 1;
          }
          continue;
        }

        // Handle special characters
        if (controlWord === "par") {
          // Close any open spans before paragraph
          if (inColorSpan) {
            result += "}}";
            inColorSpan = false;
            currentColor = null;
          }
          if (inItalic) {
            result += "*";
            inItalic = false;
          }
          result += "\n";
        } else if (controlWord === "tab") {
          result += "\t";
        } else if (controlWord === "line") {
          result += "\n";
        } else if (controlWord === "ldblquote") {
          result += "\u201C"; // “ left double quotation mark
        } else if (controlWord === "rdblquote") {
          result += "\u201D"; // ” right double quotation mark
        } else if (controlWord === "lquote") {
          result += "\u2018"; // ‘ left single quotation mark
        } else if (controlWord === "rquote") {
          result += "\u2019"; // ’ right single quotation mark
        } else if (controlWord === "emdash") {
          result += "\u2014"; // — em dash
        } else if (controlWord === "endash") {
          result += "\u2013"; // – en dash
        } else if (controlWord === "bullet") {
          result += "\u2022"; // • bullet
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
        // Hex character like \'e0 — interpreted in the RTF code page (Windows-1252).
        // Must remap 0x80–0x9F bytes to their Win-1252 typographic Unicode points,
        // otherwise \'85 (…) becomes U+0085 (NEL control char) which renders as □.
        const hexCode = content.slice(i + 2, i + 4);
        const charCode = parseInt(hexCode, 16);
        result += decodeWin1252Byte(charCode);
        i += 4;
        continue;
      }

      // Handle literal characters
      if (content[i + 1] === "{" || content[i + 1] === "}" || content[i + 1] === "\\") {
        result += content[i + 1];
        i += 2;
        continue;
      }

      // Special symbol escapes that don't match the [a-z]+ control-word regex
      if (content[i + 1] === "~") {
        // Non-breaking space
        result += "\u00A0";
        i += 2;
        continue;
      }
      if (content[i + 1] === "-") {
        // Optional (soft) hyphen — drop it; renderers don't show it inline
        i += 2;
        continue;
      }
      if (content[i + 1] === "_") {
        // Non-breaking hyphen — render as a normal hyphen
        result += "-";
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

  // Close any remaining open spans
  if (inColorSpan) {
    result += "}}";
  }
  if (inItalic) {
    result += "*";
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
    .select("id, legacy_refn, memory_trigger_text, category, headword, audio_url_trigger")
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

  const updates: { id: string; value: string; headword: string }[] = [];

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

    // Check if any markers were added (color {{...}} or italic *...*)
    if (!markedText.includes("{{") && !markedText.includes("*")) {
      noColor++;
      if (dryRun && processed <= 20) {
        console.log(`[${processed}] No markers found in RTF for: ${word.headword} (refn: ${word.legacy_refn})`);
      }
      continue;
    }

    // All categories now use memory_trigger_text.
    const currentText = word.memory_trigger_text;

    // Check if the text changed
    if (markedText === currentText) {
      skipped++;
      continue;
    }

    updates.push({
      id: word.id,
      value: markedText,
      headword: word.headword,
    });
    updated++;

    if (dryRun) {
      console.log(`\n[${processed}] ${word.headword} (refn: ${word.legacy_refn}) -> memory_trigger_text`);
      console.log("  Current:", currentText?.slice(0, 80) || "(empty)");
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
          .update({ memory_trigger_text: update.value })
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
