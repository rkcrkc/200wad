#!/usr/bin/env npx tsx
/**
 * Backfill fixed memory_trigger_text markers for RTF-sourced languages
 * (French / Spanish / German). Italian is EXCLUDED — its triggers come from a
 * CSV column, not RTF, so it is unaffected by the rtf.ts scoping bug.
 *
 * Why this exists
 * ---------------
 * The legacy importer wrote one giant italic / `{{…}}` span per row because the
 * old `extractText` tracked RTF character formatting as flat booleans that
 * leaked past each group's closing brace. `scripts/lib/legacy-import/rtf.ts` is
 * now fixed (group-stack scoping). Re-running the FULL importer is forbidden —
 * it DELETE+INSERTs `words`, orphaning `user_word_progress` FKs — so this script
 * does an in-place UPDATE of ONLY `memory_trigger_text`, keyed on the unique
 * `(language_id, legacy_refn)` pair.
 *
 * Two-pass design (snapshot then apply)
 * -------------------------------------
 * To update only rows that still hold the buggy importer output (and never
 * clobber a manual edit) we need to know what the buggy parser produced for each
 * row. So:
 *
 *   1. `--mode snapshot` — run BEFORE the rtf.ts fix, with the buggy parser. For
 *      each General.csv row compute `oldTrigger = sanitizeText(resolveTrigger)`
 *      and write `{ legacy_refn: oldTrigger }` to
 *      `scripts/.trigger-snapshots/<config>.json`. No DB access.
 *
 *   2. `--mode apply` — run AFTER the fix, with the fixed parser. For each row
 *      compute `newTrigger = sanitizeText(resolveTrigger)`, load the matching
 *      `oldTrigger` from the snapshot, fetch the DB word by
 *      `(language_id, legacy_refn)` and UPDATE only when
 *        db.memory_trigger_text === oldTrigger   (untouched by a human) AND
 *        newTrigger !== oldTrigger                (the fix actually changed it).
 *      Manual edits (db.value !== oldTrigger) and empty/null newTriggers are
 *      skipped and reported; never write NULL over an existing value.
 *
 * CRITICAL: both passes wrap the parser output in `sanitizeText()` EXACTLY as
 * the importer did (import-legacy-database.ts:612), or the untouched-row
 * detection (db === oldTrigger) breaks for every row.
 *
 * Usage
 * -----
 *   # Pass 1 (buggy parser, before the rtf.ts fix):
 *   npx tsx scripts/migrate-trigger-markers.ts \
 *     --language french --data-dir "../DB IMPORT FRENCH" \
 *     --rtf-root /Volumes/Disc --mode snapshot
 *
 *   # Pass 2 dry-run (fixed parser):
 *   npx tsx scripts/migrate-trigger-markers.ts \
 *     --language french --data-dir "../DB IMPORT FRENCH" \
 *     --rtf-root /Volumes/Disc --mode apply
 *
 *   # Pass 2 apply (writes DB):
 *   npx tsx scripts/migrate-trigger-markers.ts \
 *     --language french --data-dir "../DB IMPORT FRENCH" \
 *     --rtf-root /Volumes/Disc --mode apply --apply
 *
 * Options:
 *   --language <key>   Config key: french|french2|spanish|spanish2|german|german2
 *   --data-dir <path>  Directory containing the legacy General.csv
 *   --rtf-root <path>  Mounted disc root holding the <ICC>RtfTrg folders
 *                      (default: /Volumes/Disc)
 *   --mode <m>         snapshot | apply   (default: apply)
 *   --apply            In apply mode, write the DB (otherwise dry-run)
 *   --limit <n>        Process only the first N matching rows (testing)
 *
 * Environment variables required (apply mode):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { readCsv, sanitizeText } from "./lib/legacy-import/text";
import { resolveTrigger } from "./lib/legacy-import/field-source";
import { createRtfResolver } from "./lib/legacy-import/rtf";
import { getLanguageConfig } from "./configs";
import type {
  FieldContext,
  GeneralRow,
  LanguageConfig,
} from "./lib/legacy-import/types";

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

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function getArg(name: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(`--${name}`);
  if (index !== -1 && args[index + 1]) return args[index + 1];
  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

const languageArg = getArg("language");
const dataDirArg = getArg("data-dir");
const rtfRoot = getArg("rtf-root") || "/Volumes/Disc";
const mode = (getArg("mode") || "apply").toLowerCase();
const apply = hasFlag("apply");
const limit = getArg("limit") ? parseInt(getArg("limit")!, 10) : undefined;

function usage(): never {
  console.error(
    "Usage: npx tsx scripts/migrate-trigger-markers.ts --language <key> --data-dir <path> [--rtf-root <path>] [--mode snapshot|apply] [--apply] [--limit <n>]"
  );
  console.error("");
  console.error("  --language <key>   french|french2|spanish|spanish2|german|german2");
  console.error("  --data-dir <path>  Directory containing the legacy General.csv");
  console.error("  --rtf-root <path>  Mounted disc root (default: /Volumes/Disc)");
  console.error("  --mode <m>         snapshot | apply (default: apply)");
  console.error("  --apply            In apply mode, write the DB (else dry-run)");
  console.error("  --limit <n>        Process only the first N matching rows");
  process.exit(1);
}

if (!languageArg || !dataDirArg) usage();
if (mode !== "snapshot" && mode !== "apply") {
  console.error(`Invalid --mode '${mode}'. Expected 'snapshot' or 'apply'.`);
  process.exit(1);
}

const languageKey: string = languageArg;
const dataDir: string = dataDirArg;

function requireConfig(name: string): LanguageConfig {
  const c = getLanguageConfig(name);
  if (!c) {
    console.error(`No import config registered for language '${name}'.`);
    console.error("Expected one of: french, french2, spanish, spanish2, german, german2.");
    process.exit(1);
  }
  if (c.name.toLowerCase() === "italian") {
    console.error("Italian is excluded: its triggers come from a CSV column, not RTF.");
    process.exit(1);
  }
  return c;
}

const config = requireConfig(languageKey);

// Build the RTF resolver from the CLI --rtf-root (NOT the config's hardcoded
// RTF_ROOT): every disc mounts at the same point one-at-a-time, and the config's
// resolveTrigger reads through ctx.rtf, so this is the single source of truth.
const rtf = createRtfResolver(rtfRoot);

// ---------------------------------------------------------------------------
// Snapshot storage
// ---------------------------------------------------------------------------

const SNAP_DIR = path.join(process.cwd(), "scripts", ".trigger-snapshots");
const snapshotPath = path.join(SNAP_DIR, `${languageKey}.json`);

function ensureSnapDir() {
  if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Row → trigger (mirrors the importer's row filtering + sanitize at L612)
// ---------------------------------------------------------------------------

interface RowTrigger {
  refN: number;
  trigger: string | null;
}

/**
 * Walk General.csv exactly as the importer's word pass does for the fields that
 * affect the trigger value & match key: skip Course=0 and missing RefN, resolve
 * the trigger via the config (through ctx.rtf), and apply sanitizeText to match
 * import-legacy-database.ts:612. We deliberately do NOT filter by valid-ICC here
 * — the snapshot/apply key is (language_id, legacy_refn), and any row that never
 * made it into `words` simply won't match a DB row in apply mode.
 */
function collectRowTriggers(): { rows: RowTrigger[]; missingRtf: number } {
  const generalPath = path.join(dataDir, "General.csv");
  const generalRows = readCsv<GeneralRow>(generalPath);
  const rows: RowTrigger[] = [];
  let missingRtf = 0;

  for (const row of generalRows) {
    const courseRef = parseInt((row.Course || "").trim(), 10);
    const refN = parseInt((row.RefN || "").trim(), 10);
    if (courseRef === 0) continue;
    if (Number.isNaN(refN)) continue;

    const ctx: FieldContext = { row, category: "", rtf };
    const raw = resolveTrigger(config, ctx);
    const trigger = sanitizeText(raw);

    // A row that references a trigger RTF (FileFgnTrigger) but resolved to null
    // means the matching disc isn't mounted (or the file is missing). Warn so a
    // run against the wrong/absent disc doesn't silently blank everything.
    if (raw === null && (row.FileFgnTrigger || "").trim()) missingRtf++;

    rows.push({ refN, trigger });
    if (limit && rows.length >= limit) break;
  }

  return { rows, missingRtf };
}

// ---------------------------------------------------------------------------
// Snapshot mode (buggy parser, before the fix)
// ---------------------------------------------------------------------------

function runSnapshot() {
  console.log("Trigger-marker SNAPSHOT (pre-fix, buggy parser)");
  console.log("================================================");
  console.log(`Config:     ${languageKey} (NL language: ${config.name})`);
  console.log(`Data dir:   ${dataDir}`);
  console.log(`RTF root:   ${rtfRoot}`);
  console.log(`Output:     ${snapshotPath}`);
  console.log("");

  const { rows, missingRtf } = collectRowTriggers();

  const snapshot: Record<string, string | null> = {};
  let collisions = 0;
  for (const r of rows) {
    const key = String(r.refN);
    if (Object.prototype.hasOwnProperty.call(snapshot, key)) collisions++;
    snapshot[key] = r.trigger;
  }

  ensureSnapDir();
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), "utf-8");

  console.log(`Rows processed:        ${rows.length}`);
  console.log(`Distinct legacy_refn:  ${Object.keys(snapshot).length}`);
  if (collisions > 0) {
    console.log(`WARNING: ${collisions} duplicate RefN within this CSV (last value wins).`);
  }
  if (missingRtf > 0) {
    console.log(
      `WARNING: ${missingRtf} rows reference a trigger RTF that did NOT resolve ` +
        `(disc not mounted / file missing). Snapshot stored null for them.`
    );
  }
  console.log("\nSnapshot written. Now apply the rtf.ts fix and run --mode apply.");
}

// ---------------------------------------------------------------------------
// Apply mode (fixed parser, after the fix)
// ---------------------------------------------------------------------------

interface DbWord {
  id: string;
  legacy_refn: number;
  memory_trigger_text: string | null;
}

async function runApply() {
  console.log("Trigger-marker APPLY (post-fix, fixed parser)");
  console.log("==============================================");
  console.log(`Config:     ${languageKey} (NL language: ${config.name})`);
  console.log(`Data dir:   ${dataDir}`);
  console.log(`RTF root:   ${rtfRoot}`);
  console.log(`Mode:       ${apply ? "APPLY (writing DB)" : "DRY RUN"}`);
  if (limit) console.log(`Limit:      ${limit}`);
  console.log("");

  if (!fs.existsSync(snapshotPath)) {
    console.error(`Snapshot not found: ${snapshotPath}`);
    console.error("Run `--mode snapshot` with the BUGGY parser (pre-fix) first.");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing required environment variables:");
    if (!supabaseUrl) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceRoleKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Resolve the NL language_id from the config name (french2 → "french", etc.).
  const { data: language, error: langError } = await supabase
    .from("languages")
    .select("id, name")
    .ilike("name", config.name)
    .single();
  if (langError || !language) {
    console.error(`Language '${config.name}' not found in database`);
    process.exit(1);
  }
  console.log(`Language: ${language.name} (${language.id})`);

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8")) as Record<
    string,
    string | null
  >;

  const { rows, missingRtf } = collectRowTriggers();
  if (missingRtf > 0) {
    console.log(
      `WARNING: ${missingRtf} rows reference a trigger RTF that did NOT resolve ` +
        `(disc not mounted / file missing). They will be reported as empty and skipped.`
    );
  }

  // Fetch all DB words for this language with a legacy_refn, keyed by refn.
  const dbByRefn = new Map<number, DbWord>();
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("words")
      .select("id, legacy_refn, memory_trigger_text")
      .eq("language_id", language.id)
      .not("legacy_refn", "is", null)
      .order("legacy_refn", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("Error fetching words:", error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    for (const w of data as DbWord[]) dbByRefn.set(w.legacy_refn, w);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`DB words (with legacy_refn): ${dbByRefn.size}`);
  console.log("");

  let noDbRow = 0;
  let manuallyEdited = 0;
  let unchanged = 0;
  let emptyNew = 0;
  let noSnapshot = 0;

  const updates: { id: string; refN: number; oldDb: string | null; value: string }[] = [];

  for (const r of rows) {
    const db = dbByRefn.get(r.refN);
    if (!db) {
      noDbRow++;
      continue;
    }

    const key = String(r.refN);
    if (!Object.prototype.hasOwnProperty.call(snapshot, key)) {
      noSnapshot++;
      continue;
    }
    const oldTrigger = snapshot[key];
    const newTrigger = r.trigger;

    // Never write NULL/empty over an existing value.
    if (newTrigger === null || newTrigger.trim() === "") {
      emptyNew++;
      continue;
    }

    // Preserve manual edits: only touch rows still holding the buggy output.
    if (db.memory_trigger_text !== oldTrigger) {
      manuallyEdited++;
      continue;
    }

    if (newTrigger === oldTrigger) {
      unchanged++;
      continue;
    }

    updates.push({ id: db.id, refN: r.refN, oldDb: db.memory_trigger_text, value: newTrigger });
  }

  console.log("Summary");
  console.log("-------");
  console.log(`Rows in CSV (post-filter): ${rows.length}`);
  console.log(`Would update:              ${updates.length}`);
  console.log(`Skipped — manual edit:     ${manuallyEdited}`);
  console.log(`Skipped — unchanged:       ${unchanged}`);
  console.log(`Skipped — empty new:       ${emptyNew}`);
  console.log(`Skipped — no DB row:       ${noDbRow}`);
  console.log(`Skipped — no snapshot:     ${noSnapshot}`);

  // Show a few sample diffs.
  for (const u of updates.slice(0, 8)) {
    console.log(`\n[refn ${u.refN}]`);
    console.log(`  old: ${JSON.stringify((u.oldDb ?? "").slice(0, 90))}`);
    console.log(`  new: ${JSON.stringify(u.value.slice(0, 90))}`);
  }

  if (!apply) {
    console.log("\n[DRY RUN] No database changes made. Re-run with --apply to write.");
    return;
  }

  if (updates.length === 0) {
    console.log("\nNothing to update.");
    return;
  }

  // Backup prior DB values to a timestamped JSON before writing (rollback aid).
  ensureSnapDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(SNAP_DIR, `${languageKey}.backup-${stamp}.json`);
  const backup: Record<string, string | null> = {};
  for (const u of updates) backup[String(u.refN)] = u.oldDb;
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf-8");
  console.log(`\nBackup of prior DB values: ${backupPath}`);

  console.log(`Applying ${updates.length} updates...`);
  const BATCH = 200;
  let written = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    for (const u of batch) {
      const { error } = await supabase
        .from("words")
        .update({ memory_trigger_text: u.value })
        .eq("id", u.id);
      if (error) {
        console.error(`Error updating word ${u.id} (refn ${u.refN}):`, error);
      } else {
        written++;
      }
    }
    console.log(`  ${Math.min(i + BATCH, updates.length)} / ${updates.length}`);
  }

  console.log(`\nDone. Updated ${written} of ${updates.length} rows.`);
}

async function main() {
  if (mode === "snapshot") {
    runSnapshot();
  } else {
    await runApply();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
