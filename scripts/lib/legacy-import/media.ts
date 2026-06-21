/**
 * Media capabilities for the legacy-media importer (FRENCH_MEDIA_IMPORT_PLAN):
 *   - `createFileResolver` — locate a source file on the mounted disc by its
 *     stored stem, exact-match first then accent/case/apostrophe-normalised.
 *   - `convertSwfToPng`    — rasterise a vector SWF illustration to PNG via
 *     swftools (`swfcombine -s <scale>` + `swfrender`), the same pipeline as
 *     `scripts/convert-swf-to-png.sh`.
 *
 * French stores exact source filename stems, so resolution is normally a direct
 * hit; the normalised index is a tolerance fallback for stray accent/case drift.
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/** Accent/case/apostrophe-insensitive key (mirrors rtf.ts `normKey`). */
function normKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['`\u2018\u2019]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface FileResolver {
  /**
   * Absolute path of `<folder>/<filename>` on the disc, or null if absent.
   * Tries the literal name first, then a normalised folder index.
   */
  resolve(folder: string, filename: string): string | null;
}

export function createFileResolver(root: string): FileResolver {
  // folder → (normalised filename → absolute path)
  const indexes = new Map<string, Map<string, string>>();

  function indexFor(folder: string): Map<string, string> {
    const cached = indexes.get(folder);
    if (cached) return cached;

    const index = new Map<string, string>();
    const dir = path.join(root, folder);
    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir)) {
        const key = normKey(file);
        if (!index.has(key)) index.set(key, path.join(dir, file));
      }
    }
    indexes.set(folder, index);
    return index;
  }

  return {
    resolve(folder: string, filename: string): string | null {
      const literal = path.join(root, folder, filename);
      if (fs.existsSync(literal)) return literal;
      return indexFor(folder).get(normKey(filename)) ?? null;
    },
  };
}

/**
 * Render `srcSwf` to `outPng` at `scale`% (default 400 = 4×). Returns true on
 * success. Swallows tool errors so one bad file can't abort the batch.
 */
export function convertSwfToPng(srcSwf: string, outPng: string, scale = 400): boolean {
  const tmpSwf = path.join(
    os.tmpdir(),
    `swf_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2)}.swf`
  );
  try {
    execFileSync("swfcombine", ["--dummy", "-s", String(scale), srcSwf, "-o", tmpSwf], {
      stdio: "ignore",
    });
    execFileSync("swfrender", [tmpSwf, "-o", outPng], { stdio: "ignore" });
    return fs.existsSync(outPng) && fs.statSync(outPng).size > 0;
  } catch {
    return false;
  } finally {
    try {
      fs.unlinkSync(tmpSwf);
    } catch {
      // best-effort cleanup
    }
  }
}
