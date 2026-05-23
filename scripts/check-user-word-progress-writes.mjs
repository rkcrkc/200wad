#!/usr/bin/env node
/**
 * CI guard for direct writes to `user_word_progress`.
 *
 * Background: lesson status (`user_lesson_progress.status`) is a stored
 * denormalized column. It only stays in sync with the underlying word
 * statuses if every write to `user_word_progress` is followed by a call
 * to `fanOutLessonProgress` (see `src/lib/mutations/wordProgress.ts`).
 *
 * To make that contract enforceable, all direct writes to the table
 * must live in the allowlisted files below. New write sites elsewhere
 * fail this check.
 *
 * If you legitimately need a new writer:
 *   1. Add a call to `fanOutLessonProgress` after the write.
 *   2. Add the file to ALLOWLIST below with a brief justification.
 *
 * Run: `node scripts/check-user-word-progress-writes.mjs`
 * Wired into CI via the `lint:guards` npm script.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIR = join(ROOT, "src");

// Files allowed to write to user_word_progress directly. Anything else
// matching the WRITE_PATTERN fails the check.
const ALLOWLIST = new Set([
  // Per-word test progress writer; calls fanOutLessonProgress in
  // completeTestSession after the per-word loop.
  "src/lib/mutations/test.ts",
  // Mid-study writes (notes, markWordsAsLearning); fan-out happens at
  // session end in completeStudySession.
  "src/lib/mutations/study.ts",
  // Whole-row delete during account reset; no fan-out needed because
  // user_lesson_progress is wiped in the same operation.
  "src/app/api/account/reset/route.ts",
]);

// Matches `.from("user_word_progress")` followed (within ~6 lines) by
// a write verb. Reading the table is fine; only mutations are guarded.
const TABLE_RE = /\.from\(\s*["']user_word_progress["']\s*\)/;
const WRITE_VERBS = /\.(insert|update|upsert|delete)\b/;
const WINDOW_LINES = 6;

const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "build", ".git"]);
const TEXT_EXTS = new Set([".ts", ".tsx", ".mjs", ".cjs", ".js", ".jsx"]);

/** @param {string} dir */
function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      yield* walk(full);
    } else if (TEXT_EXTS.has(extOf(entry))) {
      yield full;
    }
  }
}

/** @param {string} name */
function extOf(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i);
}

/** @param {string} content */
function findWriteHits(content) {
  const lines = content.split("\n");
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (!TABLE_RE.test(lines[i])) continue;
    const windowText = lines.slice(i, i + WINDOW_LINES).join("\n");
    if (WRITE_VERBS.test(windowText)) {
      hits.push(i + 1);
    }
  }
  return hits;
}

const violations = [];

for (const file of walk(SCAN_DIR)) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  const content = readFileSync(file, "utf8");
  const hits = findWriteHits(content);
  if (hits.length === 0) continue;
  if (ALLOWLIST.has(rel)) continue;
  violations.push({ file: rel, lines: hits });
}

if (violations.length === 0) {
  console.log("✓ user_word_progress write guard: no violations");
  process.exit(0);
}

console.error(
  "✗ user_word_progress write guard: direct writes found outside allowlist\n"
);
for (const v of violations) {
  console.error(`  ${v.file}: line(s) ${v.lines.join(", ")}`);
}
console.error(
  "\nEvery status-affecting write to user_word_progress must call " +
    "fanOutLessonProgress (see src/lib/mutations/wordProgress.ts).\n" +
    "If this is intentional, add the file to ALLOWLIST in this script."
);
process.exit(1);
