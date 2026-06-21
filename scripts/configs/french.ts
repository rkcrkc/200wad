/**
 * French language config (FRENCH_IMPORT_PLAN).
 *
 * French diverges from Italian in three ways the generalised pipeline absorbs:
 *   - English is hybrid: word entries come from the `1RtfEng` RTF body, while
 *     sentence/phrase/proverb entries use the `EngDictionary` column (the RTF
 *     only holds a focus keyword there). Fallback to `EngDictionary` when the
 *     RTF key is blank or the file is missing.
 *   - Memory-trigger text lives in the `<ICC>RtfTrg` folder, highlight-coloured.
 *   - The `le/la` gender code means `mf` in French (vs `f` in the Italian table),
 *     fixed with a single override; all other codes resolve via canonical
 *     normalisation (curly apostrophe + in-paren period strip + case-insensitive).
 *
 * Headword (inline `ForeignRTF`), lemma (`FgnDictionary`), notes, image/audio
 * filename refs and false-friend flag all use the shared field-source defaults.
 */

import type { FieldContext, GeneralRow, LanguageConfig } from "../lib/legacy-import/types";

/** Mounted French disc holding the RTF folders. */
const RTF_ROOT = "/Volumes/Disc";

/** Canonical gender-code mapping is shared; it lives with the Italian export. */
const MAPPING_PATH =
  "/Users/ryancrocombe/Documents/200WAD/DB IMPORT ITALIAN/200w_lexical_code_mapping.csv";

/** Categories whose English prompt is the full `EngDictionary` sentence. */
const SENTENCE_LIKE = new Set(["sentence", "phrase", "proverb"]);

/**
 * Strip a trailing grammatical marker appended after a comma, e.g.
 * "the house, f." → "the house", "to go, v." → "to go". Mirrors the validated
 * `strip_marker` used in the import analysis.
 */
function stripMarker(s: string): string {
  return (s || "").replace(/,\s*[a-zàâA-Z.&/ ]+\.?\s*$/, "").trim();
}

/** ICC prefix (1 = vocab, 21 = sentences) used to pick the RTF folder. */
function iccPrefix(row: GeneralRow): string {
  return (row.Course || "").trim();
}

export const frenchConfig: LanguageConfig = {
  name: "french",
  mappingPath: MAPPING_PATH,
  rtfRoot: RTF_ROOT,

  courses: [
    // Keep the existing NL course "Vocab #1" (set legacy_ref=1, don't rename).
    { ref: 1, matchNames: ["Vocab #1", "200 Words a Day French"] },
    // Create a dedicated sentences course.
    { ref: 6, createName: "French Sentences" },
  ],

  genderOverrides: {
    // Genuine cross-language divergence: French le/la is masculine-or-feminine.
    "le/la": {
      Code: "le/la",
      language: "french",
      category: "word",
      part_of_speech: "noun",
      gender: "mf",
      grammatical_number: "sg",
      transitivity: "",
      is_irregular: "",
      phrase_type: "",
      tags: "",
    },
  },

  // Fallback-category heuristic should probe the French gloss, not the absent
  // pre-mapped/`English` columns. (In practice every French code maps, so this
  // only matters defensively.)
  probeEnglish: (row) => stripMarker(row.EngDictionary || ""),

  resolveEnglish: (ctx: FieldContext): string => {
    const { row, category, rtf } = ctx;
    const engDict = stripMarker(row.EngDictionary || "");

    // Sentence/phrase/proverb → the full gloss column.
    if (SENTENCE_LIKE.has(category)) return engDict;

    // Word entries → the English RTF body (gives "to …" infinitives and
    // (disambiguator) forms), falling back to the gloss column.
    const key = (row.FileEngSouRTF || "").trim();
    if (rtf && key) {
      const body = rtf.readPlain(`${iccPrefix(row)}RtfEng`, key);
      if (body && body.trim()) return body.trim();
    }
    return engDict;
  },

  resolveTrigger: (ctx: FieldContext): string | null => {
    const { row, rtf } = ctx;
    const key = (row.FileFgnTrigger || "").trim();
    if (rtf && key) {
      const trigger = rtf.readFormatted(`${iccPrefix(row)}RtfTrg`, key);
      if (trigger && trigger.trim()) return trigger;
    }
    return null;
  },
};
