/**
 * RTF → text capability for the legacy-import pipeline.
 *
 * Two outputs share one walker:
 *   - `readPlain`     — bare text (used for the English RTF body).
 *   - `readFormatted` — text with the app's `{{…}}` highlight / `*…*` italic
 *     markers preserved (used for memory-trigger text).
 *
 * The walker is lifted from `scripts/migrate-rtf-colors.ts`
 * (`extractTextWithColorMarkers`), parameterised so the same, already-validated
 * RTF handling produces both the marked and the bare form. The renderer is
 * `src/lib/utils/parseTriggerText.tsx`.
 *
 * File lookup is case-insensitive and accent/apostrophe-normalised so legacy
 * keys like `lessive` and `avoir mal a lestomac` resolve to `Lessive.rtf` and
 * `avoir mal a l'estomac.rtf`.
 */

import * as fs from "fs";
import * as path from "path";
import type { RtfResolver } from "./types";

// ---------------------------------------------------------------------------
// Win-1252 byte decoding (for \'XX hex escapes)
// ---------------------------------------------------------------------------

const WIN1252_C1_MAP: Record<number, number> = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
};

function decodeWin1252Byte(byte: number): string {
  if (byte >= 0x80 && byte <= 0x9f && WIN1252_C1_MAP[byte] !== undefined) {
    return String.fromCharCode(WIN1252_C1_MAP[byte]);
  }
  return String.fromCharCode(byte);
}

// ---------------------------------------------------------------------------
// Colour table parsing (only consulted when emitting markers)
// ---------------------------------------------------------------------------

interface ColorDef {
  red: number;
  green: number;
  blue: number;
}

function parseColorTable(rtfContent: string): Map<number, ColorDef> {
  const colorMap = new Map<number, ColorDef>();
  const colorTableMatch = rtfContent.match(/\{\\colortbl\s*;([^}]*)\}/);
  if (!colorTableMatch) return colorMap;

  const colorParts = colorTableMatch[1].split(";").filter(Boolean);
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

function getColorCategory(color: ColorDef): "red" | "blue" | "green" | null {
  const { red, green, blue } = color;
  if (red > 200 && green < 50 && blue < 50) return "red";
  if (blue > 200 && red < 100) return "blue";
  if (blue > 200 && red < 100 && green < 150) return "blue";
  if (green > 100 && red < 50 && blue < 50) return "green";
  return null;
}

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

function removeAllBalancedBlocks(content: string, startPattern: RegExp): string {
  let prev: string;
  let next = content;
  do {
    prev = next;
    next = removeBalancedBlock(prev, startPattern);
  } while (next !== prev);
  return next;
}

// ---------------------------------------------------------------------------
// Core walker — emits markers only when `markers` is true
// ---------------------------------------------------------------------------

function extractText(rtfContent: string, markers: boolean): string {
  const colorMap = markers ? parseColorTable(rtfContent) : new Map<number, ColorDef>();

  let content = rtfContent;
  content = removeBalancedBlock(content, /\{\\fonttbl/);
  content = removeBalancedBlock(content, /\{\\colortbl/);
  content = removeBalancedBlock(content, /\{\\stylesheet/);
  content = removeBalancedBlock(content, /\{\\info/);
  content = removeBalancedBlock(content, /\{\\\*\\generator/);
  content = removeAllBalancedBlocks(content, /\{\\pict\b/);
  content = removeAllBalancedBlocks(content, /\{\\object\b/);
  content = removeAllBalancedBlocks(content, /\{\\result\b/);
  // Ignorable destinations: `{\*\<dest> …}`. The control word may end in a
  // digit (e.g. `\pnseclvl5`), so match on the letters only — a trailing `\b`
  // would miss those and leak the group's literal punctuation (`*`, `(`, `)`).
  content = removeAllBalancedBlocks(content, /\{\\\*\\[a-z]/i);
  content = content.replace(/^\{\\rtf1(?:\\[a-z]+\d*)*\s*/, "");
  content = content.replace(/\}[\s\x00]*$/, "");

  let result = "";
  let currentColor: "red" | "blue" | "green" | null = null;
  let inColorSpan = false;
  let inItalic = false;
  let i = 0;

  while (i < content.length) {
    if (content[i] === "\\") {
      const cfMatch = content.slice(i).match(/^\\cf(\d+)/);
      if (cfMatch) {
        if (markers) {
          const colorIndex = parseInt(cfMatch[1], 10);
          const newColor =
            colorIndex === 0
              ? null
              : colorMap.has(colorIndex)
                ? getColorCategory(colorMap.get(colorIndex)!)
                : null;
          if (inColorSpan && newColor !== currentColor) {
            result += "}}";
            inColorSpan = false;
          }
          if (newColor && !inColorSpan) {
            result += "{{";
            inColorSpan = true;
          }
          currentColor = newColor;
        }
        i += cfMatch[0].length;
        continue;
      }

      const italicMatch = content.slice(i).match(/^\\i(-?\d+)?(?![a-zA-Z])/);
      if (italicMatch) {
        if (markers) {
          const newItalic = italicMatch[1] !== "0";
          if (newItalic !== inItalic) {
            result += "*";
            inItalic = newItalic;
          }
        }
        i += italicMatch[0].length;
        if (i < content.length && content[i] === " ") i += 1;
        continue;
      }

      const binMatch = content.slice(i).match(/^\\bin(\d+)[ ]?/i);
      if (binMatch) {
        const byteCount = parseInt(binMatch[1], 10);
        i += binMatch[0].length + (Number.isFinite(byteCount) ? byteCount : 0);
        continue;
      }

      const controlMatch = content.slice(i).match(/^\\([a-z]+)(-?\d+)?[ ]?/i);
      if (controlMatch) {
        const controlWord = controlMatch[1].toLowerCase();

        if (controlWord === "u" && controlMatch[2]) {
          let codepoint = parseInt(controlMatch[2], 10);
          if (codepoint < 0) codepoint += 65536;
          result += String.fromCharCode(codepoint);
          i += controlMatch[0].length;
          if (
            i < content.length &&
            content[i] !== "\\" &&
            content[i] !== "{" &&
            content[i] !== "}"
          ) {
            i += 1;
          }
          continue;
        }

        if (controlWord === "par") {
          if (markers && inColorSpan) {
            result += "}}";
            inColorSpan = false;
            currentColor = null;
          }
          if (markers && inItalic) {
            result += "*";
            inItalic = false;
          }
          result += "\n";
        } else if (controlWord === "tab") {
          result += "\t";
        } else if (controlWord === "line") {
          result += "\n";
        } else if (controlWord === "ldblquote") {
          result += "\u201C";
        } else if (controlWord === "rdblquote") {
          result += "\u201D";
        } else if (controlWord === "lquote") {
          result += "\u2018";
        } else if (controlWord === "rquote") {
          result += "\u2019";
        } else if (controlWord === "emdash") {
          result += "\u2014";
        } else if (controlWord === "endash") {
          result += "\u2013";
        } else if (controlWord === "bullet") {
          result += "\u2022";
        }
        i += controlMatch[0].length;

        if (controlWord === "s" && controlMatch[2]) {
          const styleNameMatch = content.slice(i).match(/^[^;\\{}]*;?/);
          if (styleNameMatch) i += styleNameMatch[0].length;
        }
        continue;
      }

      if (content[i + 1] === "'" && content.length > i + 3) {
        const hexCode = content.slice(i + 2, i + 4);
        const charCode = parseInt(hexCode, 16);
        result += decodeWin1252Byte(charCode);
        i += 4;
        continue;
      }

      if (content[i + 1] === "{" || content[i + 1] === "}" || content[i + 1] === "\\") {
        result += content[i + 1];
        i += 2;
        continue;
      }

      if (content[i + 1] === "~") {
        result += "\u00A0";
        i += 2;
        continue;
      }
      if (content[i + 1] === "-") {
        i += 2;
        continue;
      }
      if (content[i + 1] === "_") {
        result += "-";
        i += 2;
        continue;
      }

      i++;
      continue;
    }

    if (content[i] === "{" || content[i] === "}") {
      i++;
      continue;
    }

    // Bare CR/LF in the RTF *source* are layout-only and carry no text (real
    // breaks arrive via \par/\line above). Emitting them split words mid-token
    // ("to ra\nin", "{{ATTRA\nctive"), so skip them.
    if (content[i] === "\r" || content[i] === "\n") {
      i++;
      continue;
    }

    result += content[i];
    i++;
  }

  if (markers && inColorSpan) result += "}}";
  if (markers && inItalic) result += "*";

  result = result
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\x00/g, "")
    .replace(/\n{3,}/g, "\n\n");

  if (markers) {
    result = result
      .replace(/\{\{\s+/g, " {{")
      .replace(/\s+\}\}/g, "}} ")
      .replace(/  +/g, " ")
      .replace(/^ /, "")
      .replace(/\{\{\}\}/g, "")
      .replace(/\*[\dA-Fa-f]+[^;]*;/g, "");
  }

  result = result.trim();

  // For the trigger (marker) path, drop noise-only output as the colour
  // migration did. Plain text has no such floor (English words can be short).
  if (markers && (result.length < 10 || /^[\s\n*;]+$/.test(result))) {
    return "";
  }

  return result;
}

// ---------------------------------------------------------------------------
// Case/accent/apostrophe-insensitive folder index
// ---------------------------------------------------------------------------

function normKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['`\u2018\u2019]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function createRtfResolver(rtfRoot: string): RtfResolver {
  // folder name → (normalised basename → absolute path)
  const folderIndexes = new Map<string, Map<string, string>>();

  function indexFor(folder: string): Map<string, string> {
    const cached = folderIndexes.get(folder);
    if (cached) return cached;

    const index = new Map<string, string>();
    const dir = path.join(rtfRoot, folder);
    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir)) {
        if (!file.toLowerCase().endsWith(".rtf")) continue;
        const base = file.replace(/\.rtf$/i, "");
        const key = normKey(base);
        // First match wins; legacy folders rarely collide after normalisation.
        if (!index.has(key)) index.set(key, path.join(dir, file));
      }
    }
    folderIndexes.set(folder, index);
    return index;
  }

  function resolvePath(folder: string, key: string): string | null {
    if (!key || !key.trim()) return null;
    const index = indexFor(folder);
    return index.get(normKey(key)) ?? null;
  }

  function read(folder: string, key: string, markers: boolean): string | null {
    const filePath = resolvePath(folder, key);
    if (!filePath) return null;
    // Read byte-preserving (latin1): RTF structure is 7-bit ASCII and \'XX
    // escapes carry the Win-1252 high bytes, which `extractText` decodes.
    const raw = fs.readFileSync(filePath, "latin1");
    const text = extractText(raw, markers);
    return text || null;
  }

  return {
    readPlain: (folder, key) => read(folder, key, false),
    readFormatted: (folder, key) => read(folder, key, true),
  };
}
