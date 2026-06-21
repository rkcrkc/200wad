/**
 * French 2 language config (FRENCH2_IMPORT_PLAN).
 *
 * French 2 is "Volume 2" content for the SAME NL "French" language — three NEW
 * courses (vocab, sentences, proverbs) imported alongside the untouched French
 * 1 courses. It reuses French 1's field-sourcing wholesale (hybrid English,
 * RTF-keyed-by-`Course` trigger text, the `le/la → mf` gender override) and only
 * diverges in how courses are mapped, scoped and where media lives:
 *
 *   - Course mapping is EXPLICIT (`courses[].icc`). French 2's Products flags
 *     misencode the content ICCs (flags ⇒ {1,21,12} while the real
 *     `General.Course` codes are {2,22,12}) and its Product Refs (1/6/3) collide
 *     with French 1. So courses are declared directly with synthetic
 *     `legacy_ref`s (= the ICCs 2/22/12, distinct from French 1's 1 and 6), and
 *     the importer assigns lessons/words from each row's own `Course` column.
 *   - `matchCoursesByRefOnly` stops "French Sentences 2" fuzzy-matching (and
 *     re-pointing) French 1's existing "French Sentences" course.
 *   - `deleteScope: "courses"` makes a re-run wipe only these three courses,
 *     leaving French 1 intact.
 *   - Media prefixes are per-course (vocab images in `2Pictures`, the 3 proverb
 *     images in `12Pictures`; audio in `2/22/12Sound*`). Sentences and proverbs
 *     have no trigger audio (`22SoundTrg`/`12SoundTrg` empty) — skipped
 *     gracefully. The storage `slug` stays "french" so both volumes share one
 *     namespace.
 *
 * The 145 French-1 overlap/junk rows (ICC 1 + ICC 21) and UI rows (ICC 0/999)
 * are excluded automatically: they are not in the explicit ICC set {2,22,12}.
 */

import type { GenderCodeMapping, LanguageConfig } from "../lib/legacy-import/types";
import { frenchConfig } from "./french";

/** Mounted French 2 disc holding the RTF/media folders. */
const RTF_ROOT = "/Volumes/Disc";

/** Helper for the singular-noun article overrides below. */
function nounArticle(code: string, gender: "m" | "f"): GenderCodeMapping {
  return {
    Code: code,
    language: "french",
    category: "word",
    part_of_speech: "noun",
    gender,
    grammatical_number: "sg",
    transitivity: "",
    is_irregular: "",
    phrase_type: "",
    tags: "",
  };
}

/**
 * French 2 adds two indefinite-article gender codes absent from the canonical
 * mapping: `un` (masculine, e.g. "un carré", "un million") and `une` (feminine).
 * Unmapped they fall back to category "word" with no part-of-speech, which the
 * `words_word_category_requires_pos` constraint rejects. They denote singular
 * nouns, mirroring the existing `le/la` override.
 */
const genderOverrides: Record<string, GenderCodeMapping> = {
  ...frenchConfig.genderOverrides,
  un: nounArticle("un", "m"),
  une: nounArticle("une", "f"),
};

export const french2Config: LanguageConfig = {
  // Targets the existing NL "French" language (the `--language french2` arg is
  // only the config-registry key; Step 1 looks the language up by this `name`).
  name: "french",
  mappingPath: frenchConfig.mappingPath,
  rtfRoot: RTF_ROOT,

  // Explicit ICC → new course. Synthetic legacy_refs reuse the ICC values and
  // do not collide with French 1's refs 1 and 6.
  courses: [
    { icc: 2, ref: 2, createName: "Vocab #2" },
    { icc: 22, ref: 22, createName: "French Sentences 2" },
    { icc: 12, ref: 12, createName: "101 French Proverbs" },
  ],
  matchCoursesByRefOnly: true,
  deleteScope: "courses",

  // Field-sourcing is identical to French 1 (the RTF lookups already key on the
  // row's `Course` value, so they resolve French 2's 2/22/12 folders).
  genderOverrides,
  probeEnglish: frenchConfig.probeEnglish,
  resolveEnglish: frenchConfig.resolveEnglish,
  resolveTrigger: frenchConfig.resolveTrigger,

  media: {
    slug: "french",
    mountRoot: RTF_ROOT,
    imagePrefix: "2",
    imagePrefixByCourseRef: { 2: "2", 22: "22", 12: "12" },
    audioPrefixByCourseRef: { 2: "2", 22: "22", 12: "12" },
  },
};
