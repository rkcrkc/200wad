/**
 * Shared text helpers for the legacy-database import pipeline.
 *
 * These were extracted verbatim from the original `import-legacy-database.ts`
 * so every language config and capability module shares one implementation.
 */

import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

export function readCsv<T>(filePath: string): T[] {
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

/**
 * Clean lemma value by removing grammar markers like ",m.", ",f.", etc.
 * Examples:
 *   "segno,m." -> "segno"
 *   "casa,f." -> "casa"
 *   "bello,adj." -> "bello"
 */
export function cleanLemma(rawLemma: string): string {
  if (!rawLemma) return "";

  // Remove common grammar suffixes
  let cleaned = rawLemma
    .replace(/,\s*(m\.|f\.|n\.|adj\.|adv\.|v\.|prep\.|conj\.|art\.|prn\.|num\.|exc\.|phr\.).*$/i, "")
    .replace(/\s*\(m\.\)|\s*\(f\.\)|\s*\(n\.\)|\s*\(pl\.\)/gi, "")
    .trim();

  // If still has trailing comma and abbreviation, try more aggressive cleanup
  if (cleaned.includes(",")) {
    const parts = cleaned.split(",");
    if (parts.length > 1 && parts[parts.length - 1].trim().length <= 5) {
      cleaned = parts.slice(0, -1).join(",").trim();
    }
  }

  return cleaned;
}

/**
 * Parse tags string into array
 * "tag1, tag2" -> ["tag1", "tag2"]
 */
export function parseTags(tagsStr: string): string[] {
  if (!tagsStr) return [];
  return tagsStr.split(",").map(t => t.trim()).filter(t => t.length > 0);
}

/**
 * Safely parse integer, return null if invalid
 */
export function safeParseInt(value: string): number | null {
  if (!value || value.trim() === "") return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Map Windows-1252 typographic characters that share code points with C1
 * control characters (0x80–0x9F) to their proper Unicode equivalents.
 * Anything in this range that isn't a known Win-1252 char is dropped because
 * it's a non-printing control that browsers render as a missing-glyph box.
 */
export const WIN1252_C1_TO_UNICODE: Record<string, string> = {
  "\u0080": "\u20ac", // €
  "\u0082": "\u201a", // ‚
  "\u0083": "\u0192", // ƒ
  "\u0084": "\u201e", // „
  "\u0085": "\u2026", // …
  "\u0086": "\u2020", // †
  "\u0087": "\u2021", // ‡
  "\u0088": "\u02c6", // ˆ
  "\u0089": "\u2030", // ‰
  "\u008a": "\u0160", // Š
  "\u008b": "\u2039", // ‹
  "\u008c": "\u0152", // Œ
  "\u008e": "\u017d", // Ž
  "\u0091": "\u2018", // ‘
  "\u0092": "\u2019", // ’
  "\u0093": "\u201c", // “
  "\u0094": "\u201d", // ”
  "\u0095": "\u2022", // •
  "\u0096": "\u2013", // –
  "\u0097": "\u2014", // —
  "\u0098": "\u02dc", // ˜
  "\u0099": "\u2122", // ™
  "\u009a": "\u0161", // š
  "\u009b": "\u203a", // ›
  "\u009c": "\u0153", // œ
  "\u009e": "\u017e", // ž
  "\u009f": "\u0178", // Ÿ
};

/**
 * Strip binary control characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F) from text.
 * Preserves tabs (0x09), newlines (0x0A), and carriage returns (0x0D).
 * Also replaces curly/smart quotes with straight apostrophes, backticks (`)
 * with straight apostrophes (legacy data uses them as both apostrophes and
 * single quotes), diaeresis (¨ U+00A8) with straight double quotes (legacy
 * data uses ¨ as paired double quotes), normalises Italian elided articles
 * (l' x → l'x), and remaps any leaked Windows-1252 C1-range bytes
 * (e.g. 0x85 = …) to their proper Unicode points.
 */
export function sanitizeText(text: string | null): string | null {
  if (!text) return text;
  let cleaned = text
    // Strip binary control characters (keep \t, \n, \r)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    // Remap Win-1252 typographic chars that landed in the C1 control range
    .replace(/[\u0080-\u009F]/g, (ch) => WIN1252_C1_TO_UNICODE[ch] ?? "")
    // Replace curly/smart quotes and backticks with straight apostrophes
    .replace(/[\u2018\u2019`]/g, "'")
    // Replace diaeresis (¨) used as paired double quotes with straight "
    .replace(/\u00A8/g, '"')
    // Normalise Italian elided articles: l' x → l'x
    .replace(/l' /gi, (m) => m[0] + "'");
  // Promote whole-line underlines to headings: a line whose content is
  // entirely wrapped in <u>...</u> (with optional surrounding whitespace) was
  // used in legacy data as a sub-heading. Convert to "# ..." so the new
  // parser renders it as <h2>.
  cleaned = cleaned
    .split("\n")
    .map((line) => {
      const m = line.match(/^(\s*)<u>([\s\S]*?)<\/u>(\s*)$/);
      if (!m) return line;
      const inner = m[2].trim();
      if (!inner) return line;
      // If the inner text itself contains <u> tags, leave it alone.
      if (/<\/?u>/i.test(inner)) return line;
      return `${m[1]}# ${inner}${m[3]}`;
    })
    .join("\n");
  return cleaned;
}

/**
 * Extract clean filename from legacy file reference
 */
export function cleanFilename(filename: string): string | null {
  if (!filename || filename.trim() === "") return null;
  // Remove any path components, keep just the filename
  return filename.trim().replace(/^.*[\\\/]/, "");
}
