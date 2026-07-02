#!/usr/bin/env npx tsx
/**
 * READ-ONLY audit: compare current DB memory_trigger_text for a language
 * against (a) the FIXED rtf.ts parser output and (b) the buggy snapshot.
 * Writes nothing. Reports category counts + samples so we can see which rows
 * still hold buggy scoping.
 *
 *   npx tsx scripts/audit-trigger-markers.ts --language french \
 *     --data-dir "../DB IMPORT FRENCH" --rtf-root /Volumes/Disc
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

const languageKey = arg("language")!;
const dataDir = arg("data-dir")!;
const rtfRoot = arg("rtf-root") || "/Volumes/Disc";
const config = getLanguageConfig(languageKey)!;
const rtf = createRtfResolver(rtfRoot);

const snapPath = path.join(process.cwd(), "scripts", ".trigger-snapshots", `${languageKey}.json`);
const snapshot: Record<string, string | null> = fs.existsSync(snapPath)
  ? JSON.parse(fs.readFileSync(snapPath, "utf-8"))
  : {};

// Heuristic for buggy scoping in an arbitrary string (for rows w/o snapshot):
// a marker span that swallows many words is suspicious. We flag:
//  - an italic span *...* containing >4 words, OR
//  - a {{...}} span containing >3 words.
// A colour mnemonic span ({{...}}) is the sound-alike cue and is essentially
// always ALL-CAPS. If a {{...}} span contains a lowercase alphabetic word
// (>=2 letters, e.g. "in", "your", "would"), the colour has leaked into the
// surrounding normal prose — the classic scoping bug. This is the primary,
// high-precision signal. We ignore the leading tag ("m|", "f|", ...).
function colorLeak(s: string): boolean {
  return [...s.matchAll(/\{\{([^}]*)\}\}/g)].some((m) => {
    const inner = m[1].replace(/^[a-z]+\|/, "");
    return /\b[a-z]{2,}\b/.test(inner);
  });
}
// An italic span (*...*) wraps the short English gloss. A well-formed nested
// colour reads *{{X}}* (the italic == the coloured word). If, after removing
// any {{...}} spans, the italic still contains an ALL-CAPS mnemonic token, the
// italic has swallowed coloured text — the italic-leak variant (e.g. refn 35).
function italicLeak(s: string): boolean {
  return [...s.matchAll(/\*([^*]+)\*/g)].some((m) => {
    const stripped = m[1].replace(/\{\{[^}]*\}\}/g, "");
    return /\b[A-Z]{2,}\b/.test(stripped);
  });
}
function looksBuggy(s: string): boolean {
  return colorLeak(s) || italicLeak(s);
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

  const dbByRefn = new Map<number, { headword: string; trigger: string | null }>();
  let from = 0;
  for (;;) {
    const { data } = await supabase
      .from("words")
      .select("legacy_refn, headword, memory_trigger_text")
      .eq("language_id", language!.id)
      .not("legacy_refn", "is", null)
      .not("memory_trigger_text", "is", null)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const w of data as any[])
      dbByRefn.set(w.legacy_refn, { headword: w.headword, trigger: w.memory_trigger_text });
    if (data.length < 1000) break;
    from += 1000;
  }

  let matchesFixed = 0, stillBuggySnapshot = 0, divergentButClean = 0,
    divergentAndBuggyLooking = 0, noRtf = 0;
  const buggySamples: { refn: number; hw: string; db: string; fixed: string | null | undefined; cat: string }[] = [];
  const divergentSamples: { refn: number; hw: string; db: string; fixed: string | null }[] = [];

  for (const [refn, dbRow] of dbByRefn) {
    const db = dbRow.trigger!;
    const fixed = fixedByRefn.has(refn) ? fixedByRefn.get(refn)! : undefined;
    const buggy = Object.prototype.hasOwnProperty.call(snapshot, String(refn))
      ? snapshot[String(refn)] : undefined;

    if (fixed === undefined) noRtf++;

    if (fixed !== undefined && fixed !== null && db === fixed) { matchesFixed++; continue; }
    if (buggy !== undefined && buggy !== null && db === buggy) {
      stillBuggySnapshot++;
      buggySamples.push({ refn, hw: dbRow.headword, db, fixed, cat: "STILL==buggy snapshot (never fixed)" });
      continue;
    }
    // DB differs from both fixed and buggy snapshot -> manual edit or new content.
    if (looksBuggy(db)) {
      divergentAndBuggyLooking++;
      buggySamples.push({ refn, hw: dbRow.headword, db, fixed, cat: "divergent+looks-buggy (manual edit skipped by migration)" });
    } else {
      divergentButClean++;
      if (fixed && fixed !== null && divergentSamples.length < 15)
        divergentSamples.push({ refn, hw: dbRow.headword, db, fixed });
    }
  }

  // ---- Objective malformed-marker scan (disc-independent) ----------------
  // A trigger is malformed if its markers can't be parsed cleanly:
  //   - unbalanced {{ vs }}
  //   - odd number of * (unclosed italic)
  //   - a * character sitting INSIDE a {{...}} colour span (interleaved markers)
  // These are wrong regardless of authoring intent and the renderer mishandles
  // them. This does not depend on the RTF/disc.
  function malformed(s: string): string | null {
    const opens = (s.match(/\{\{/g) || []).length;
    const closes = (s.match(/\}\}/g) || []).length;
    if (opens !== closes) return "unbalanced {{ }}";
    if (((s.match(/\*/g) || []).length) % 2 !== 0) return "odd number of *";
    // any * inside a {{...}} span?
    for (const m of s.matchAll(/\{\{([^}]*)\}\}/g)) {
      if (m[1].includes("*")) return "* inside {{ }}";
    }
    return null;
  }
  const malformedRows: { refn: number; hw: string; db: string; why: string }[] = [];
  for (const [refn, dbRow] of dbByRefn) {
    const why = malformed(dbRow.trigger!);
    if (why) malformedRows.push({ refn, hw: dbRow.headword, db: dbRow.trigger!, why });
  }

  console.log(`\n=== AUDIT: ${languageKey} (NL language ${config.name}) ===`);
  console.log(`DB words with a trigger:            ${dbByRefn.size}`);
  console.log(`  MATCHES fixed parser (correct):   ${matchesFixed}`);
  console.log(`  STILL == buggy snapshot:          ${stillBuggySnapshot}`);
  console.log(`  Divergent & LOOKS buggy:          ${divergentAndBuggyLooking}`);
  console.log(`  Divergent but clean (manual/ok):  ${divergentButClean}`);
  console.log(`  (rows with no RTF row in CSV:     ${noRtf})`);

  console.log(`\n=== MALFORMED MARKERS (objective, disc-independent): ${malformedRows.length} ===`);
  for (const m of malformedRows.sort((a, b) => a.refn - b.refn)) {
    const fixed = fixedByRefn.has(m.refn) ? fixedByRefn.get(m.refn) : undefined;
    console.log(`[refn ${m.refn}] ${m.hw}  <${m.why}>`);
    console.log(`   db:    ${JSON.stringify(m.db)}`);
    console.log(`   fixed: ${JSON.stringify(fixed === undefined ? "(not in this CSV)" : fixed)}`);
  }

  if (buggySamples.length) {
    console.log(`\n--- Buggy-looking rows: DB vs FIXED-parser (${buggySamples.length}) ---`);
    for (const s of buggySamples) {
      console.log(`[refn ${s.refn}] ${s.hw}  <${s.cat}>`);
      console.log(`   db:    ${JSON.stringify(s.db)}`);
      console.log(`   fixed: ${JSON.stringify(s.fixed === undefined ? "(no RTF in this CSV)" : s.fixed)}`);
    }
  }
  if (divergentSamples.length) {
    console.log(`\n--- Divergent-but-clean samples (DB vs fixed parser) ---`);
    for (const s of divergentSamples) {
      console.log(`[refn ${s.refn}] ${s.hw}`);
      console.log(`   db:    ${JSON.stringify(s.db.slice(0, 110))}`);
      console.log(`   fixed: ${JSON.stringify((s.fixed || "").slice(0, 110))}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
