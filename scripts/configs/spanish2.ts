/**
 * Spanish 2 language config (SPANISH2_IMPORT_PLAN).
 *
 * Spanish 2 is "Volume 2" content for the SAME NL "Spanish" language — three NEW
 * courses (vocab, sentences, proverbs) imported alongside the untouched Spanish
 * 1 courses. It is structurally identical to French 2, so it reuses French 1's
 * field-sourcing wholesale (hybrid English, RTF-keyed-by-`Course` trigger text)
 * and only diverges in how courses are mapped/scoped and where media lives:
 *
 *   - Course mapping is EXPLICIT (`courses[].icc`). Spanish 2's Products flags
 *     misencode the content ICCs (Refs 1/6/3 ⇒ flags {0,21,12}) while the real
 *     `General.Course` codes are {2,22,12}, and its Product Refs (1/6/3) collide
 *     with Spanish 1. So courses are declared directly with synthetic
 *     `legacy_ref`s (= the ICCs 2/22/12, distinct from Spanish 1's 1 and 6), and
 *     the importer assigns lessons/words from each row's own `Course` column.
 *   - `matchCoursesByRefOnly` stops "Spanish Sentences 2" fuzzy-matching (and
 *     re-pointing) Spanish 1's existing "Spanish Sentences" course.
 *   - `deleteScope: "courses"` makes a re-run wipe only these three courses,
 *     leaving Spanish 1 intact.
 *   - Media prefixes are per-course (vocab images in `2Pictures`, the proverb
 *     images in `12Pictures`; audio in `2/22/12Sound*`). Sentences and proverbs
 *     have no trigger audio (`22SoundTrg`/`12SoundTrg` empty/absent) — skipped
 *     gracefully. The storage `slug` stays "spanish" so both volumes share one
 *     namespace.
 *
 * The Spanish-1 overlap rows (ICC 1 + ICC 21) and UI/junk rows (ICC 0/999) are
 * excluded automatically: they are not in the explicit ICC set {2,22,12}.
 *
 * Gender codes: every Spanish 2 code already resolves through the shared
 * canonical mapping (0 unmapped, 0 constraint-risk), so no gender override is
 * needed — unlike Spanish 1's one-off `adv` typo fix.
 *
 * Disc casing note: the Spanish 2 disc mounts CASE-SENSITIVELY and its RTF
 * folders for ICC 2/22 are uppercase (`2RTFEng`/`22RTFEng`) while ICC 12 uses
 * `12RtfEng`. The shared RTF resolver (rtf.ts) resolves folder names
 * case-insensitively, so the `<ICC>RtfEng`/`<ICC>RtfTrg` lookups still hit.
 */

import type { LanguageConfig } from "../lib/legacy-import/types";
import { frenchConfig } from "./french";

/** Mounted Spanish 2 disc holding the RTF/media folders. */
const RTF_ROOT = "/Volumes/Spanish2Bundle";

/** Canonical gender-code mapping is shared; it lives with the Italian export. */
const MAPPING_PATH =
  "/Users/ryancrocombe/Documents/200WAD/DB IMPORT ITALIAN/200w_lexical_code_mapping.csv";

export const spanish2Config: LanguageConfig = {
  // Targets the existing NL "Spanish" language (the `--language spanish2` arg is
  // only the config-registry key; Step 1 looks the language up by this `name`).
  name: "spanish",
  mappingPath: MAPPING_PATH,
  rtfRoot: RTF_ROOT,

  // Explicit ICC → new course. Synthetic legacy_refs reuse the ICC values and
  // do not collide with Spanish 1's refs 1 and 6.
  courses: [
    { icc: 2, ref: 2, createName: "Spanish Vocab #2" },
    { icc: 22, ref: 22, createName: "Spanish Sentences 2" },
    { icc: 12, ref: 12, createName: "101 Spanish Proverbs" },
  ],
  matchCoursesByRefOnly: true,
  deleteScope: "courses",

  // Field-sourcing is identical to French 1 (the RTF lookups already key on the
  // row's `Course` value, so they resolve Spanish 2's 2/22/12 folders).
  probeEnglish: frenchConfig.probeEnglish,
  resolveEnglish: frenchConfig.resolveEnglish,
  resolveTrigger: frenchConfig.resolveTrigger,

  media: {
    slug: "spanish",
    mountRoot: RTF_ROOT,
    imagePrefix: "2",
    // Sentence (ICC 22) images share the vocab `2Pictures` folder — there is no
    // `22Pictures` on disc — so map image prefix 22 → "2". Audio is genuinely
    // split (`22SoundEng/For` exist), so audio prefix 22 stays "22".
    imagePrefixByCourseRef: { 2: "2", 22: "2", 12: "12" },
    audioPrefixByCourseRef: { 2: "2", 22: "22", 12: "12" },
  },
};
