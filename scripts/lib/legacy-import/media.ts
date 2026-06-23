/**
 * Media capabilities for the legacy-media importer (FRENCH_MEDIA_IMPORT_PLAN):
 *   - `createFileResolver` — locate a source file on the mounted disc by its
 *     stored stem, exact-match first then accent/case/apostrophe-normalised.
 *   - `convertSwfToPng`    — rasterise a SWF illustration to PNG via swftools
 *     (`swfcombine -s <scale>` + `swfrender`), with two fallbacks for files the
 *     base pipeline can't handle: embedded-JPEG extraction (swftools 0.9.x has no
 *     JPEG library) and a smaller render scale for large-vector overflow.
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

/** Unique temp path with the given extension. */
function tmpPath(ext: string): string {
  return path.join(
    os.tmpdir(),
    `swf_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  );
}

/**
 * swfcombine `--dummy -s <scale>` → swfrender → PNG. Returns true if a non-empty
 * PNG was produced. Swallows tool errors so one bad file can't abort the batch.
 */
function renderSwf(srcSwf: string, outPng: string, scale: number): boolean {
  const tmpSwf = tmpPath("swf");
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

/** Object IDs of embedded JPEG bitmaps in a SWF, via `swfextract` inventory. */
function swfJpegIds(srcSwf: string): number[] {
  try {
    const out = execFileSync("swfextract", [srcSwf], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const line = out.split("\n").find((l) => l.includes("[-j]"));
    const ids = line?.match(/ID\(s\)\s*(.+)$/)?.[1];
    if (!ids) return [];
    return ids
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}

/**
 * Recover a SWF whose artwork is an embedded JPEG bitmap: extract the largest
 * embedded JPEG and rasterise it to PNG (`sips`). swftools 0.9.x ships without a
 * JPEG library, so swfrender fails outright on these; the JPEG is the real image.
 */
function extractLargestJpegAsPng(srcSwf: string, outPng: string): boolean {
  const ids = swfJpegIds(srcSwf);
  if (ids.length === 0) return false;

  const tmps: string[] = [];
  let bestJpg: string | null = null;
  let bestSize = 0;
  for (const id of ids) {
    const tmp = tmpPath("jpg");
    tmps.push(tmp);
    try {
      execFileSync("swfextract", ["-j", String(id), srcSwf, "-o", tmp], { stdio: "ignore" });
      if (fs.existsSync(tmp)) {
        const size = fs.statSync(tmp).size;
        if (size > bestSize) {
          bestSize = size;
          bestJpg = tmp;
        }
      }
    } catch {
      // skip this id
    }
  }

  let ok = false;
  if (bestJpg && bestSize > 0) {
    try {
      execFileSync("sips", ["-s", "format", "png", bestJpg, "--out", outPng], { stdio: "ignore" });
      ok = fs.existsSync(outPng) && fs.statSync(outPng).size > 0;
    } catch {
      ok = false;
    }
  }
  for (const t of tmps) {
    try {
      fs.unlinkSync(t);
    } catch {
      // best-effort cleanup
    }
  }
  return ok;
}

/**
 * Rasterise `srcSwf` to `outPng`, returning true on success. Three strategies,
 * tried in order so one bad file can't abort the batch:
 *   1. swfrender at `scale`% (default 400 = 4×) — normal vector / embedded-PNG art.
 *   2. Embedded-JPEG recovery — for SWFs carrying a JPEG bitmap, which swfrender
 *      (built without a JPEG library) cannot decode.
 *   3. swfrender at smaller scales — large-canvas vector art overflows the
 *      renderer's allocator at 4× (a negative byte claim); the source is already
 *      high-res, so 2×/1× render cleanly.
 */
export function convertSwfToPng(srcSwf: string, outPng: string, scale = 400): boolean {
  if (renderSwf(srcSwf, outPng, scale)) return true;
  if (extractLargestJpegAsPng(srcSwf, outPng)) return true;
  for (const fallbackScale of [200, 100]) {
    if (renderSwf(srcSwf, outPng, fallbackScale)) return true;
  }
  return false;
}
