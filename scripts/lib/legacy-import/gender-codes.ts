/**
 * Gender-code (`200w_lexical_code_mapping.csv`) loader + resolver.
 *
 * Resolution order (see FRENCH_IMPORT_PLAN §6):
 *   1. language override  — explicit per-config row keyed by the RAW code
 *   2. exact match        — raw `Code` === incoming gender (last-wins)
 *   3. normalised match   — canonical form on both sides
 *
 * Exact-match-second guarantees the Italian import is byte-identical: every
 * Italian code hits the exact map and never reaches normalisation. French's
 * curly-apostrophe l' forms and capital `Sentence` miss exact and fold onto the
 * shared canonical keys; `le/la` is fixed by a French override.
 */

import { readCsv } from "./text";
import type { GenderCodeMapping } from "./types";

/**
 * Canonical form of a gender code (deliberately scoped — see §6):
 *   1. backtick → curly apostrophe (` → ’) — backtick only appears in l' forms
 *   2. strip periods ONLY inside parentheses — never bare-letter codes (v. ≠ v)
 *   3. lowercase + trim — covers `Sentence` vs `sentence` and future case drift
 */
export function normCode(code: string): string {
  return code
    .replace(/`/g, "\u2019")
    .replace(/\(([^)]*)\)/g, (_, inner: string) => `(${inner.replace(/\./g, "")})`)
    .toLowerCase()
    .trim();
}

export interface GenderResolver {
  resolve(rawCode: string): GenderCodeMapping | undefined;
}

export function buildGenderResolver(
  rows: GenderCodeMapping[],
  overrides?: Record<string, GenderCodeMapping>,
): GenderResolver {
  // Exact map — preserves current last-row-wins behaviour exactly.
  const exact = new Map<string, GenderCodeMapping>();
  for (const r of rows) exact.set(r.Code, r);

  // Normalised fallback map — multiple synonym codes may collapse to one key
  // (last-wins, all merges are synonyms so the result is unchanged).
  const normalised = new Map<string, GenderCodeMapping>();
  for (const r of rows) normalised.set(normCode(r.Code), r);

  const overrideMap = new Map<string, GenderCodeMapping>(
    Object.entries(overrides ?? {}),
  );

  return {
    resolve(rawCode: string): GenderCodeMapping | undefined {
      if (overrideMap.has(rawCode)) return overrideMap.get(rawCode);
      const e = exact.get(rawCode);
      if (e) return e;
      return normalised.get(normCode(rawCode));
    },
  };
}

export function loadGenderMapping(mappingPath: string): GenderCodeMapping[] {
  return readCsv<GenderCodeMapping>(mappingPath);
}
