#!/usr/bin/env npx tsx
/**
 * Re-derive memory_trigger_text for rows whose stored markers are MALFORMED,
 * using the fixed rtf.ts parser. Malformed = unbalanced {{ }}, odd number of *,
 * or a * sitting inside a {{ }} colour span. These are produced by the old
 * reconcile() bug (colour opened before italic / a whitespace run formatted as
 * both), NOT by authoring intent, so the two-pass migrate script can't touch
 * them (their DB value already equals the *old fixed* output, not the buggy
 * snapshot).
 *
 * SAFETY: a row is only rewritten when ALL hold:
 *   - malformed(db)            the current value is objectively broken
 *   - fixed != null            the RTF resolved for this language/CSV
 *   - !malformed(fixed)        the new parser output is well-formed
 *   - fixed !== db             it actually changes
 *   - stripMarkers(db) === stripMarkers(fixed)
 *                              the underlying TEXT is identical — only the
 *                              marker placement differs. This protects manual
 *                              text edits (e.g. refn 14 "et", whose prose was
 *                              shortened by hand) from being reverted.
 *
 * Writes a timestamped backup of every {refn: oldValue} it changes before
 * touching the DB. Dry-run by default; pass --apply to write.
 *
 *   npx tsx scripts/fix-malformed-markers.ts --language french  \
 *     --data-dir "../DB IMPORT FRENCH"  --rtf-root "/Volumes/Disc"        [--apply]
 *   npx tsx scripts/fix-malformed-markers.ts --language french2 \
 *     --data-dir "../DB IMPORT FRENCH2" --rtf-root "/Volumes/Disc 1"      [--apply]
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { readCsv, sanitizeText } from "./lib/legacy-import/text";
import { resolveTrigger } from "./lib/legacy-import/field-source";
import { createRtfResolver } from "./lib/legacy-import/rtf";
import { getLanguageConfig } from "./configs";
import type { FieldContext, GeneralRow } from "./lib/legacy-import/types";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const arg = (n: string) => {
  const a = process.argv.slice(2);
  const i = a.indexOf(`--${n}`);
  return i !== -1 ? a[i + 1] : undefined;
};
const has = (n: string) => process.argv.slice(2).includes(`--${n}`);

const languageKey = arg("language")!;
const dataDir = arg("data-dir")!;
const rtfRoot = arg("rtf-root") || "/Volumes/Disc";
const apply = has("apply");
const config = getLanguageConfig(languageKey)!;
const rtf = createRtfResolver(rtfRoot);

// Objective malformed-marker test (disc-independent).
function malformed(s: string): string | null {
  const opens = (s.match(/\{\{/g) || []).length;
  const closes = (s.match(/\}\}/g) || []).length;
  if (opens !== closes) return "unbalanced {{ }}";
  if (((s.match(/\*/g) || []).length) % 2 !== 0) return "odd number of *";
  for (const m of s.matchAll(/\{\{([^}]*)\}\}/g)) {
    if (m[1].includes("*")) return "* inside {{ }}";
  }
  return null;
}

// Marker-free normalised text: identical between db & fixed iff only the marker
// placement (not the words) changed.
function stripMarkers(s: string): string {
  return s.replace(/\{\{|\}\}|\*/g, "").replace(/\s+/g, " ").trim();
}

async function main() {
  const generalRows = readCsv<GeneralRow>(path.join(dataDir, "General.csv"));
  const fixedByRefn = new Map<number, string | null>();
  for (const row of generalRows) {
    const courseRef = parseInt((row.Course || "").trim(), 10);
    const refN = parseInt((row.RefN || "").trim(), 10);
    if (courseRef === 0 || Number.isNaN(refN)) continue;
    const ctx: FieldContext = { row, category: "", rtf };
    fixedByRefn.set(refN, sanitizeText(resolveTrigger(config, ctx)));
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: language } = await supabase
    .from("languages").select("id, name").ilike("name", config.name).single();

  const rows: { id: string; refn: number; hw: string; trigger: string }[] = [];
  let from = 0;
  for (;;) {
    const { data } = await supabase
      .from("words")
      .select("id, legacy_refn, headword, memory_trigger_text")
      .eq("language_id", language!.id)
      .not("legacy_refn", "is", null)
      .not("memory_trigger_text", "is", null)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const w of data as {
      id: string; legacy_refn: number; headword: string; memory_trigger_text: string;
    }[])
      rows.push({ id: w.id, refn: w.legacy_refn, hw: w.headword, trigger: w.memory_trigger_text });
    if (data.length < 1000) break;
    from += 1000;
  }

  const updates: { id: string; refn: number; hw: string; old: string; next: string }[] = [];
  const skipped: { refn: number; hw: string; why: string }[] = [];

  for (const r of rows) {
    if (!malformed(r.trigger)) continue; // only ever touch broken rows
    const fixed = fixedByRefn.has(r.refn) ? fixedByRefn.get(r.refn) : undefined;
    if (fixed === undefined || fixed === null) {
      skipped.push({ refn: r.refn, hw: r.hw, why: "no RTF in this CSV/disc" });
      continue;
    }
    if (malformed(fixed)) {
      skipped.push({ refn: r.refn, hw: r.hw, why: `parser STILL malformed: ${malformed(fixed)}` });
      continue;
    }
    if (fixed === r.trigger) {
      skipped.push({ refn: r.refn, hw: r.hw, why: "fixed == db (no change)" });
      continue;
    }
    if (stripMarkers(r.trigger) !== stripMarkers(fixed)) {
      skipped.push({ refn: r.refn, hw: r.hw, why: "TEXT differs (manual edit — protected)" });
      continue;
    }
    updates.push({ id: r.id, refn: r.refn, hw: r.hw, old: r.trigger, next: fixed });
  }

  console.log(`\n=== FIX MALFORMED MARKERS: ${languageKey} (NL ${config.name}) ${apply ? "[APPLY]" : "[DRY-RUN]"} ===`);
  console.log(`DB rows with a trigger:       ${rows.length}`);
  console.log(`Malformed & fixable (write):  ${updates.length}`);
  console.log(`Malformed but skipped:        ${skipped.length}`);

  for (const u of updates.sort((a, b) => a.refn - b.refn)) {
    console.log(`\n[refn ${u.refn}] ${u.hw}`);
    console.log(`   old: ${JSON.stringify(u.old)}`);
    console.log(`   new: ${JSON.stringify(u.next)}`);
  }
  if (skipped.length) {
    console.log(`\n--- Skipped malformed rows ---`);
    for (const s of skipped.sort((a, b) => a.refn - b.refn))
      console.log(`[refn ${s.refn}] ${s.hw}  <${s.why}>`);
  }

  if (!apply) {
    console.log(`\n(dry-run: no writes. Re-run with --apply to update ${updates.length} rows.)`);
    return;
  }
  if (updates.length === 0) {
    console.log(`\nNothing to write.`);
    return;
  }

  const backupDir = path.join(process.cwd(), "scripts", ".trigger-fix-backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `${languageKey}-${stamp}.json`);
  fs.writeFileSync(
    backupPath,
    JSON.stringify(updates.map((u) => ({ id: u.id, refn: u.refn, old: u.old, new: u.next })), null, 2)
  );
  console.log(`\nBackup written: ${backupPath}`);

  let ok = 0;
  for (const u of updates) {
    const { error } = await supabase
      .from("words")
      .update({ memory_trigger_text: u.next })
      .eq("id", u.id);
    if (error) console.error(`  FAILED refn ${u.refn}: ${error.message}`);
    else ok++;
  }
  console.log(`\nUpdated ${ok}/${updates.length} rows.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
