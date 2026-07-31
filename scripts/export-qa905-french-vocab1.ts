#!/usr/bin/env npx tsx
/**
 * One-off export: QA lesson 905 (Re-record Audio) for French Vocab #1.
 *
 * QA lesson numbers are `900 + flagIndex` (see getWords / QA_FLAG_DEFINITIONS);
 * index 5 is the combined `audio_rerecord` flag — every word in the course
 * where any of audio_rerecord_{english,foreign,trigger} is true. A word can
 * carry more than one audio flag, so we emit one row per set flag and group by
 * flag. Output columns: Flag, English, Foreign, Gender, Descriptor,
 * Memory Trigger, File Name.
 *
 *   npx tsx scripts/export-qa905-french-vocab1.ts
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load env from .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const COURSE_ID = "259be61f-8d9d-4320-b572-2d301f802fc0"; // French Vocab #1
const supabase = createClient(url, key);

// The three audio flags this QA lesson combines, in display order.
const AUDIO_FLAGS = [
  { col: "audio_rerecord_english", urlCol: "audio_url_english", label: "Re-record English audio" },
  { col: "audio_rerecord_foreign", urlCol: "audio_url_foreign", label: "Re-record foreign audio" },
  { col: "audio_rerecord_trigger", urlCol: "audio_url_trigger", label: "Re-record trigger audio" },
] as const;

function genderLabel(g: string | null): string {
  if (g === "f") return "female";
  if (g === "m") return "male";
  if (g === "mf") return "male/female";
  return "";
}

// Basename of a storage URL, with %-escapes decoded and the ?v= cache-buster
// stripped, e.g. ".../trigger.mp3?v=123" -> "trigger.mp3".
function fileName(u: string | null): string {
  if (!u) return "";
  const noQuery = u.split("?")[0];
  const base = noQuery.substring(noQuery.lastIndexOf("/") + 1);
  try {
    return decodeURIComponent(base);
  } catch {
    return base;
  }
}

function csvCell(v: string): string {
  return `"${(v ?? "").replace(/"/g, '""')}"`;
}

async function main() {
  // Pull every (lesson_words -> lessons -> words) row in the course, keeping
  // the ordering info so QA study order (lesson sort, lesson number, word sort)
  // is reproduced. Paginate to avoid the 1000-row default cap.
  type Row = {
    word_id: string;
    sort_order: number | null;
    lessons: { sort_order: number | null; number: number | null } | null;
    words: Record<string, unknown> | null;
  };

  const rows: Row[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("lesson_words")
      .select(
        "word_id, sort_order, lessons!inner(course_id, sort_order, number), words!inner(english, headword, gender, memory_trigger_text, audio_url_english, audio_url_foreign, audio_url_trigger, audio_rerecord_english, audio_rerecord_foreign, audio_rerecord_trigger)"
      )
      .eq("lessons.course_id", COURSE_ID)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data as unknown as Row[]) ?? []));
    if (!data || data.length < pageSize) break;
  }

  // Dedupe by word_id, keeping the earliest (lessonSort, lessonNumber, wordSort).
  type CW = { row: Row; ls: number; ln: number; ws: number };
  const byWord = new Map<string, CW>();
  const cmp = (a: CW, b: CW) =>
    a.ls - b.ls || a.ln - b.ln || a.ws - b.ws || a.row.word_id.localeCompare(b.row.word_id);
  for (const row of rows) {
    if (!row.word_id || !row.words) continue;
    const cw: CW = {
      row,
      ls: row.lessons?.sort_order ?? 0,
      ln: row.lessons?.number ?? 0,
      ws: row.sort_order ?? 0,
    };
    const existing = byWord.get(row.word_id);
    if (!existing || cmp(cw, existing) < 0) byWord.set(row.word_id, cw);
  }
  const words = Array.from(byWord.values()).sort(cmp);

  // Emit one row per set audio flag, grouped by flag (flag order, then course
  // study order within the flag).
  const out: { flagOrder: number; ls: number; ln: number; ws: number; cells: string[] }[] = [];
  for (const cw of words) {
    const w = cw.row.words as Record<string, unknown>;
    AUDIO_FLAGS.forEach((f, flagOrder) => {
      if (w[f.col] !== true) return;
      const gLabel = genderLabel((w.gender as string) ?? null);
      const descriptor = gLabel ? `${f.label}, ${gLabel}` : f.label;
      out.push({
        flagOrder,
        ls: cw.ls,
        ln: cw.ln,
        ws: cw.ws,
        cells: [
          f.label,
          (w.english as string) ?? "",
          (w.headword as string) ?? "",
          gLabel,
          descriptor,
          (w.memory_trigger_text as string) ?? "",
          fileName((w[f.urlCol] as string) ?? null),
        ].map(csvCell),
      });
    });
  }
  out.sort((a, b) => a.flagOrder - b.flagOrder || a.ls - b.ls || a.ln - b.ln || a.ws - b.ws);

  const header = ["Flag", "English", "Foreign", "Gender", "Descriptor", "Memory Trigger", "File Name"]
    .map(csvCell)
    .join(",");
  const body = out.map((r) => r.cells.join(",")).join("\n");
  const csv = `${header}\n${body}\n`;

  const outPath = path.join(process.cwd(), "docs", "exports", "qa905-rerecord-audio-french-vocab-1.csv");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, csv, "utf-8");

  const counts = AUDIO_FLAGS.map((f, i) => `${f.label}: ${out.filter((r) => r.flagOrder === i).length}`);
  console.log(`Wrote ${out.length} rows (${words.length} distinct words) to ${outPath}`);
  console.log(counts.join(" | "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
