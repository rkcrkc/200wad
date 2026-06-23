/**
 * German 1 language config (GERMAN_IMPORT_PLAN).
 *
 * German ships ALL volumes on ONE disc/MDB: the `General` table holds Volume-1
 * vocab (ICC 1) + sentences (ICC 21), Volume-2 vocab (ICC 2) + sentences
 * (ICC 22), and the proverbs (ICC 12) side by side. Products only lists the
 * vol-1 product set — Ref 1 "200 Words a Day German" (flag 0 ⇒ ICC 1), Ref 6
 * "German Sentences" (flag 21 ⇒ ICC 21), Ref 3 "101 German Proverbs"
 * (flag 12 ⇒ ICC 12) — but every ICC's rows are physically present.
 *
 * This config imports **German 1 only = vocab + sentences (ICC 1, 21)**. The
 * Volume-2 vocab/sentences and the proverbs are imported separately by
 * `german2.ts` (ICC 2/22/12) from the SAME disc — mirroring the existing
 * Spanish 1 / Spanish 2 split (Spanish 1 = vocab+sentences, Spanish 2 =
 * vocab+sentences+proverbs).
 *
 * The default Products/lesson-id course mapping CANNOT be used: the lesson-id
 * prefix scheme buckets every lesson-id < 1000 into ICC 1, and BOTH vol-1 vocab
 * (lesson-ids −39..39) and vol-2 vocab (lesson-ids −109..109) sit there — so
 * vol-2 vocab would be dragged into the German-1 vocab course. Likewise vol-2
 * sentences (lesson-ids 210401+) share the "21" prefix with vol-1 sentences.
 *
 * So courses are declared EXPLICITLY (`courses[].icc`), which switches the
 * importer to assign/filter each row by its OWN `Course` (ICC) column and sets
 * `validIccs` to exactly {1, 21}. That excludes everything else (vol-2 ICC 2/22,
 * proverbs ICC 12, UI/junk ICC 0/999) cleanly — structurally identical to how
 * French 2 / Spanish 2 scope themselves. Synthetic `legacy_ref`s reuse the ICCs.
 *
 * Notes:
 *   - `matchCoursesByRefOnly` is intentionally NOT set: the German language has
 *     a single empty placeholder course "Vocab #1" (legacy_ref null). The vocab
 *     entry's `matchNames` absorb and rename it (no orphan), exactly as Spanish 1
 *     did. The sentences name doesn't fuzzy-match it, so it's created.
 *   - `deleteScope: "courses"` keeps a re-run idempotent for just these two.
 *   - Field-sourcing is the French hybrid scheme verbatim (word entries → English
 *     from `<ICC>RtfEng`; sentences → `EngDictionary`; trigger from `<ICC>RtfTrg`).
 *     The RTF lookups key on each row's own `Course` value, so they resolve
 *     German's `1RTFEng`/`21RtfEng` folders.
 *   - One gender code, `v. refl.` (reflexive verb, 10 rows), is absent from the
 *     shared canonical mapping (which already carries `v. weak insep.`,
 *     `v. strong sep.`, etc.). Unmapped it would fall back to category "word"
 *     with no part-of-speech and trip `words_word_category_requires_pos`, so a
 *     single override resolves it to a reflexive verb (mirroring the mapping's
 *     existing `reflexive` row). Every other German vol-1 code already resolves.
 *
 * Media (GERMAN_IMPORT_PLAN): vocab images in `1Pictures`; there is no
 * `21Pictures`, so sentence images share `1Pictures`. Audio is split by course:
 * vocab → `1Sound*` (has trigger), sentences → `21Sound{Eng,For}` (no trigger
 * folder). Storage slug "german" isolates this language in the shared buckets.
 *
 * Disc casing note: the German disc mounts CASE-SENSITIVELY and names the ICC-1
 * RTF folders uppercase (`1RTFEng`/`1RTFFor`/`1RTFTrg`) while ICC 21 uses `Rtf`.
 * The shared RTF resolver (rtf.ts) resolves folder names case-insensitively, so
 * the `<ICC>RtfEng`/`<ICC>RtfTrg` lookups still hit.
 */

import type { GenderCodeMapping, LanguageConfig } from "../lib/legacy-import/types";
import { frenchConfig } from "./french";

/** Mounted German disc holding the RTF/media folders (single disc, all volumes). */
const RTF_ROOT = "/Volumes/Disc";

/** Canonical gender-code mapping is shared; it lives with the Italian export. */
const MAPPING_PATH =
  "/Users/ryancrocombe/Documents/200WAD/DB IMPORT ITALIAN/200w_lexical_code_mapping.csv";

/**
 * `v. refl.` (reflexive verb) is the one German vol-1 code missing from the
 * shared canonical mapping. Resolve it like the mapping's existing `reflexive`
 * row: category "word", part-of-speech "verb", tag "reflexive".
 */
const genderOverrides: Record<string, GenderCodeMapping> = {
  "v. refl.": {
    Code: "v. refl.",
    language: "german",
    category: "word",
    part_of_speech: "verb",
    gender: "",
    grammatical_number: "",
    transitivity: "",
    is_irregular: "",
    phrase_type: "",
    tags: "reflexive",
  },
};

export const germanConfig: LanguageConfig = {
  name: "german",
  mappingPath: MAPPING_PATH,
  rtfRoot: RTF_ROOT,

  // Explicit ICC → new course. Synthetic legacy_refs reuse the ICC values.
  courses: [
    {
      icc: 1,
      ref: 1,
      // Absorb + rename the existing empty NL "Vocab #1" placeholder.
      matchNames: ["German Vocab #1", "Vocab #1", "200 Words a Day German"],
      createName: "German Vocab #1",
    },
    { icc: 21, ref: 21, createName: "German Sentences" },
  ],
  deleteScope: "courses",

  genderOverrides,

  // Field-sourcing is identical to French 1 (RTF lookups key on the row's
  // `Course` value, resolving German's 1/21 folders).
  probeEnglish: frenchConfig.probeEnglish,
  resolveEnglish: frenchConfig.resolveEnglish,
  resolveTrigger: frenchConfig.resolveTrigger,

  media: {
    slug: "german",
    mountRoot: RTF_ROOT,
    imagePrefix: "1",
    // Sentence (ICC 21) images share the vocab `1Pictures` folder — there is no
    // `21Pictures` on disc — so map image prefix 21 → "1". Audio is genuinely
    // split (`21SoundEng/For` exist), so audio prefix 21 stays "21".
    imagePrefixByCourseRef: { 1: "1", 21: "1" },
    audioPrefixByCourseRef: { 1: "1", 21: "21" },
  },
};
