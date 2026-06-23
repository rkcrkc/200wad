/**
 * Spanish 1 language config (SPANISH_IMPORT_PLAN).
 *
 * Spanish 1 is structurally identical to French 1. Products carry Ref 1
 * "200 Words a Day Spanish" (ProductFlag 0 ⇒ ICC 1, vocab) and Ref 6
 * "Spanish Sentences" (ProductFlag 21 ⇒ ICC 21, sentences), so the default
 * Products-driven course mapping (icc = flag || ref) yields valid ICCs {1, 21}
 * and the junk rows (ICC 2/0/999) fall out automatically — exactly as French 1.
 *
 * Field-sourcing is the French hybrid scheme verbatim, so this config reuses
 * French 1's resolvers wholesale:
 *   - English: word entries from the `<ICC>RtfEng` RTF body, sentences from the
 *     `EngDictionary` column (RTF fallback to the same column).
 *   - Memory-trigger text: `<ICC>RtfTrg`, highlight-coloured.
 *   - Headword: inline `ForeignRTF`; lemma: `FgnDictionary` (shared default).
 * The RTF lookups key on each row's own `Course` (ICC) value, so they resolve
 * Spanish's `1RtfEng`/`21RtfEng` and `1RtfTrg`/`21RtfTrg` folders unchanged.
 *
 * Two Spanish-specific points:
 *   - The disc mounts at /Volumes/Spanish1Bundle (RTF + media live there).
 *   - One vocab row stores the gender code `adv` — a typo for the canonical
 *     `adv.` — which is absent from `200w_lexical_code_mapping.csv`. Unmapped it
 *     falls back to category "word" with no part-of-speech, which the
 *     `words_word_category_requires_pos` constraint rejects. A single override
 *     resolves it to an adverb, mirroring French's `le/la` fix. Every other
 *     Spanish code (articles el/la/los/las, verb tenses, etc.) already resolves
 *     through the shared canonical mapping.
 *
 * Media (SPANISH_IMPORT_PLAN): images (a gif/jpg/swf mix, SWF rasterised to
 * PNG) all live under `1Pictures`; audio is split by course (vocab → `1Sound*`,
 * sentences → `21Sound*`). Storage slug "spanish" isolates this language inside
 * the shared buckets.
 */

import type { GenderCodeMapping, LanguageConfig } from "../lib/legacy-import/types";
import { frenchConfig } from "./french";

/** Mounted Spanish 1 disc holding the RTF/media folders. */
const RTF_ROOT = "/Volumes/Spanish1Bundle";

/** Canonical gender-code mapping is shared; it lives with the Italian export. */
const MAPPING_PATH =
  "/Users/ryancrocombe/Documents/200WAD/DB IMPORT ITALIAN/200w_lexical_code_mapping.csv";

/**
 * Single vocab row carries `adv` instead of the canonical `adv.`. It is plainly
 * an adverb (cf. the `adv.` mapping row: category "word", part-of-speech
 * "adverb").
 */
const genderOverrides: Record<string, GenderCodeMapping> = {
  adv: {
    Code: "adv",
    language: "spanish",
    category: "word",
    part_of_speech: "adverb",
    gender: "",
    grammatical_number: "",
    transitivity: "",
    is_irregular: "",
    phrase_type: "",
    tags: "",
  },
};

export const spanishConfig: LanguageConfig = {
  name: "spanish",
  mappingPath: MAPPING_PATH,
  rtfRoot: RTF_ROOT,

  courses: [
    // The existing empty NL "Vocab #1" course is renamed to "Spanish Vocab #1"
    // (a one-line SQL update) before the real run; the importer then matches it
    // by name and only stamps legacy_ref=1, leaving the new name intact.
    {
      ref: 1,
      matchNames: ["Spanish Vocab #1", "Vocab #1", "200 Words a Day Spanish"],
      createName: "Spanish Vocab #1",
    },
    // New sentences course.
    { ref: 6, createName: "Spanish Sentences" },
  ],

  genderOverrides,

  // Field-sourcing identical to French 1 (see header).
  probeEnglish: frenchConfig.probeEnglish,
  resolveEnglish: frenchConfig.resolveEnglish,
  resolveTrigger: frenchConfig.resolveTrigger,

  media: {
    slug: "spanish",
    mountRoot: RTF_ROOT,
    imagePrefix: "1",
    audioPrefixByCourseRef: { 1: "1", 6: "21" },
  },
};
