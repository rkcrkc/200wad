/**
 * German 2 language config (GERMAN_IMPORT_PLAN).
 *
 * German 2 is "Volume 2" content for the SAME NL "German" language — three NEW
 * courses (vocab, sentences, proverbs) imported alongside the German 1 courses
 * (vocab + sentences). It is structurally identical to Spanish 2.
 *
 * Single-disc note: the German disc holds ALL volumes in one MDB, so German 2's
 * vocab/sentences (ICC 2/22) and the proverbs (ICC 12) live on the SAME disc as
 * German 1 and are imported from it — there is no need for the separate
 * "German 2.iso" (its content is byte-identical). Both configs point at
 * `/Volumes/Disc` and the `DB IMPORT GERMAN` export.
 *
 * Course mapping is EXPLICIT (`courses[].icc`): Products only describes the
 * vol-1 set and the lesson-id prefix scheme misfiles vol-2 (vocab lesson-ids
 * −109..109 decode to ICC 1; sentences 210401+ decode to "21" ≠ 22). Declaring
 * ICC 2/22/12 directly makes the importer assign/filter by each row's own
 * `Course` column and sets `validIccs` to exactly {2, 22, 12}, excluding the
 * German-1 rows (ICC 1/21) and UI/junk (ICC 0/999). Synthetic `legacy_ref`s
 * reuse the ICC values (distinct from German 1's 1/21).
 *
 *   - `matchCoursesByRefOnly` stops "German Sentences 2" fuzzy-matching (and
 *     re-pointing) German 1's existing "German Sentences" course.
 *   - `deleteScope: "courses"` makes a re-run wipe only these three courses,
 *     leaving German 1 intact.
 *   - Media prefixes are per-course: vocab images in `2Pictures`, proverb images
 *     in `12Pictures`; sentence images share `2Pictures` (no `22Pictures`).
 *     Audio in `2/22/12Sound*`; sentences/proverbs have no trigger audio
 *     (`22SoundTrg`/`12SoundTrg` absent) — skipped gracefully. The storage
 *     `slug` stays "german" so both volumes share one namespace.
 *
 * Gender codes: German 2's vocab (ICC 2) uses seven codes the shared canonical
 * mapping doesn't carry. Unmapped they would fall back to category "word" with
 * no part-of-speech and trip `words_word_category_requires_pos`, so each gets a
 * one-off override mirroring the mapping's existing analogues:
 *   - `indef. prn.` (sämtlich, mehrere) → pronoun, tag "indefinite" (cf. `prn.`)
 *   - `prep. gen.`  (statt, trotz, wegen) → preposition, tag "governs_gen"
 *     (cf. `prep. dative` → governs_dat)
 *   - `neg. adj.`   (vergebens) → adjective, tag "negative" (cf. `adj.`)
 *   - `ein`         (ein paar) → article, tag "indefinite" (cf. `art.`)
 *   - `adv. conj.`  (minus) → part-of-speech "adverb_conjunction"
 *     (cf. `adj. adv.` → "adjective_adverb")
 *   - `suffix`      (los/-less) → part-of-speech "suffix"
 *   - `abbr.`       (und so weiter) → part-of-speech "abbreviation"
 * Every other German 2 code already resolves through the shared mapping.
 *
 * Disc casing note: the German disc mounts CASE-SENSITIVELY and its RTF folders
 * for ICC 2 are `2RtfEng`/`2RtfFor`/`2RtfTrg`, ICC 22 `22RtfEng`/`22RtfFor` (no
 * trigger), ICC 12 `12RtfEng`/`12RtfFor`/`12RtfTrg`. The shared RTF resolver
 * resolves folder names case-insensitively, so the lookups hit.
 */

import type { GenderCodeMapping, LanguageConfig } from "../lib/legacy-import/types";
import { frenchConfig } from "./french";

/** Mounted German disc holding the RTF/media folders (single disc, all volumes). */
const RTF_ROOT = "/Volumes/Disc";

/** Canonical gender-code mapping is shared; it lives with the Italian export. */
const MAPPING_PATH =
  "/Users/ryancrocombe/Documents/200WAD/DB IMPORT ITALIAN/200w_lexical_code_mapping.csv";

/** Seven German-2 vocab codes absent from the shared mapping (see header). */
const genderOverrides: Record<string, GenderCodeMapping> = {
  "indef. prn.": {
    Code: "indef. prn.", language: "german", category: "word",
    part_of_speech: "pronoun", gender: "", grammatical_number: "",
    transitivity: "", is_irregular: "", phrase_type: "", tags: "indefinite",
  },
  "prep. gen.": {
    Code: "prep. gen.", language: "german", category: "word",
    part_of_speech: "preposition", gender: "", grammatical_number: "",
    transitivity: "", is_irregular: "", phrase_type: "", tags: "governs_gen",
  },
  "neg. adj.": {
    Code: "neg. adj.", language: "german", category: "word",
    part_of_speech: "adjective", gender: "", grammatical_number: "",
    transitivity: "", is_irregular: "", phrase_type: "", tags: "negative",
  },
  ein: {
    Code: "ein", language: "german", category: "word",
    part_of_speech: "article", gender: "", grammatical_number: "",
    transitivity: "", is_irregular: "", phrase_type: "", tags: "indefinite",
  },
  "adv. conj.": {
    Code: "adv. conj.", language: "german", category: "word",
    part_of_speech: "adverb_conjunction", gender: "", grammatical_number: "",
    transitivity: "", is_irregular: "", phrase_type: "", tags: "",
  },
  suffix: {
    Code: "suffix", language: "german", category: "word",
    part_of_speech: "suffix", gender: "", grammatical_number: "",
    transitivity: "", is_irregular: "", phrase_type: "", tags: "",
  },
  "abbr.": {
    Code: "abbr.", language: "german", category: "word",
    part_of_speech: "abbreviation", gender: "", grammatical_number: "",
    transitivity: "", is_irregular: "", phrase_type: "", tags: "",
  },
};

export const german2Config: LanguageConfig = {
  // Targets the existing NL "German" language (the `--language german2` arg is
  // only the config-registry key; Step 1 looks the language up by this `name`).
  name: "german",
  mappingPath: MAPPING_PATH,
  rtfRoot: RTF_ROOT,

  // Explicit ICC → new course. Synthetic legacy_refs reuse the ICC values and
  // do not collide with German 1's refs 1 and 21.
  courses: [
    { icc: 2, ref: 2, createName: "German Vocab #2" },
    { icc: 22, ref: 22, createName: "German Sentences 2" },
    { icc: 12, ref: 12, createName: "101 German Proverbs" },
  ],
  matchCoursesByRefOnly: true,
  deleteScope: "courses",

  genderOverrides,

  // Field-sourcing is identical to French 1 (the RTF lookups already key on the
  // row's `Course` value, so they resolve German 2's 2/22/12 folders).
  probeEnglish: frenchConfig.probeEnglish,
  resolveEnglish: frenchConfig.resolveEnglish,
  resolveTrigger: frenchConfig.resolveTrigger,

  media: {
    slug: "german",
    mountRoot: RTF_ROOT,
    imagePrefix: "2",
    // Sentence (ICC 22) images share the vocab `2Pictures` folder — there is no
    // `22Pictures` on disc — so map image prefix 22 → "2". Audio is genuinely
    // split (`22SoundEng/For` exist), so audio prefix 22 stays "22".
    imagePrefixByCourseRef: { 2: "2", 22: "2", 12: "12" },
    audioPrefixByCourseRef: { 2: "2", 22: "22", 12: "12" },
  },
};
