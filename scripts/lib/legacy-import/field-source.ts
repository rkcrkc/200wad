/**
 * Field-source resolver: maps each NL `words` field to its origin for a given
 * language. Every default here reproduces the original importer's column
 * behaviour verbatim, so a language that overrides nothing (Italian) imports
 * byte-identically. A language can redirect a field to an RTF folder or a
 * derived value by supplying the matching `resolve*` hook on its config.
 */

import { cleanLemma } from "./text";
import type { FieldContext, GeneralRow, LanguageConfig } from "./types";

/** Text feeding the fallback-category heuristic when a gender code is unmapped. */
export function probeEnglish(config: LanguageConfig, row: GeneralRow): string {
  if (config.probeEnglish) return config.probeEnglish(row).trim();
  return (row.english || row.English || "").trim();
}

/** Final NL `english`. Default: pre-mapped column → legacy `English` column. */
export function resolveEnglish(config: LanguageConfig, ctx: FieldContext): string {
  if (config.resolveEnglish) return config.resolveEnglish(ctx);
  return ctx.row.english || ctx.row.English || "";
}

/** Final NL `headword`. Default: pre-mapped column → inline `ForeignRTF`. */
export function resolveHeadword(config: LanguageConfig, ctx: FieldContext): string {
  if (config.resolveHeadword) return config.resolveHeadword(ctx);
  return ctx.row.headword || ctx.row.ForeignRTF || "";
}

/** Raw memory-trigger text. Default: pre-mapped column → legacy `Trigger`. */
export function resolveTrigger(config: LanguageConfig, ctx: FieldContext): string | null {
  if (config.resolveTrigger) return config.resolveTrigger(ctx);
  return ctx.row.memory_trigger_text || ctx.row.Trigger || null;
}

/**
 * NL `lemma`. Shared across languages: clean the dictionary form, then fall
 * back to the headword sources. (No per-language override needed so far.)
 */
export function resolveLemma(row: GeneralRow): string {
  let lemma = cleanLemma(row.FgnDictionary || row.lemma || "");
  if (!lemma && row.headword) lemma = row.headword;
  if (!lemma && row.ForeignRTF) lemma = row.ForeignRTF;
  return lemma;
}
