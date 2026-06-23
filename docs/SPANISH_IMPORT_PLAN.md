# Spanish 1 Course Import Plan (DL → NL)

Import the Spanish 1 DANELAW (DL) course content into the NormanLaw (NL)
Supabase database, reusing the existing `scripts/import-legacy-database.ts`
pipeline. Spanish 1 is **structurally identical to French 1**, so this is a
config-only addition (`scripts/configs/spanish.ts`) — no pipeline changes.

> Status: **config written; dry-run pending sign-off** — no DB writes yet.

## 1. Goal & scope

Bring Spanish 1 vocab + sentences into NL: courses, lessons, words (English
prompt, headword, lemma, notes, linguistic attributes), lesson↔word ordering,
word relationships, and memory-trigger text.

**In scope (this pass)**
- Courses, lessons, words, lesson_words, word_relationships.
- English prompt via the **hybrid** rule (words → RTF, sentences → `EngDictionary`).
- **Memory-trigger text** from `<ICC>RtfTrg/*.rtf`, preserving the highlight.
- Legacy media file-name references stored on the word rows.

**Deferred to the media pass** (`scripts/import-legacy-media.ts`, run after)
- Image upload (gif/jpg + swf→png) and audio upload (mp3), then rewrite the word
  media columns to public URLs. Handled by the existing media importer.

**Out of scope**
- Spanish 2 (`Spanish 2.iso`) and the Ser/Estar · Por/Para bundle — separate ISOs.

## 2. Decisions locked (from planning Q&A)

| Decision | Choice |
|---|---|
| Scope now | Write config + `--dry-run` only; real DB + media run after dry-run review |
| Vocab course name | Rename existing empty NL `Vocab #1` → **`Spanish Vocab #1`** (`legacy_ref=1`) |
| Sentences course | **Create** `Spanish Sentences` (`legacy_ref=6`) |
| English source | **Hybrid** (reuse French 1): words → `<ICC>RtfEng` body; sentences → `EngDictionary` |
| Gender codes | Canonical mapping covers all but one typo (`adv`) → single override to adverb |

## 3. Source inventory

- Disc image: `/Users/ryancrocombe/Documents/200WAD/COURSES/Spanish 1.iso`
  → mounted read-only at `/Volumes/Spanish1Bundle` (`hdiutil attach`).
- Access DB `MDB/Exceltra Spanish.mdb` exported (via `mdb-export`) to
  `/Users/ryancrocombe/Documents/200WAD/DB IMPORT SPANISH/`:
  `Products.csv`, `Sections.csv`, `General.csv`, `Gender.csv`, and a copy of the
  canonical `200w_lexical_code_mapping.csv` (the importer reads the canonical
  copy under `DB IMPORT ITALIAN/` via `mappingPath`).
- RTF folders on disc: `1RtfEng` (1049 files), `1RtfTrg`, `1RtfFor`, `21RtfEng`,
  `21RtfFor`, `21RtfTrg` (sparse — most sentences have no trigger).
- Media on disc: `1Pictures` (1012 files; gif/jpg/swf mix), `1Sound{Eng,For,Trg}`,
  `21Sound{Eng,For}` (no `21SoundTrg`).

## 4. Source shape (mirrors French 1)

- **Products** → courses: `Ref 1 "200 Words a Day Spanish"` (ProductFlag 0 ⇒
  ICC 1, vocab) and `Ref 6 "Spanish Sentences"` (ProductFlag 21 ⇒ ICC 21).
- **General** → 2299 word rows (physical CSV lines 3461 due to embedded RTF
  newlines). ICC distribution: **1 (vocab) = 1176**, **21 (sentences) = 1017**;
  junk ICC 2 (74) / 0 (30) / 999 (2) are excluded automatically (not in the
  valid-ICC set {1,21} derived from Products).
- **Field mapping** (legacy DL columns, not pre-mapped): English from
  `FileEngSouRTF`→`<ICC>RtfEng` (fallback `EngDictionary`), trigger from
  `FileFgnTrigger`→`<ICC>RtfTrg`, headword `ForeignRTF`, lemma `FgnDictionary`,
  image stem `FileFgnPic` + suffix `FilePSuffix`, false-friend `FlagFalseFriends`,
  relationships `CompoundRef1N`/`CompoundRef2N`/`LinkN` (`MiniLinkN` absent → skipped).

## 5. Gender-code coverage

The shared `200w_lexical_code_mapping.csv` already contains every Spanish code
in use (articles `el`/`la`/`los`/`las`/`el (f)`/`el/la`, `num.`/`adj.`/`v.`/…,
sentence `Sentence`, info `Info`/`rel.clause`). The **only** unmapped code is
`adv` (×1 vocab row) — a typo for `adv.`. `scripts/configs/spanish.ts` adds a
one-entry override resolving it to category `word` / part-of-speech `adverb`,
satisfying the `words_word_category_requires_pos` constraint.

No constraint-risk codes appear in Spanish 1 (the `Ser/Estar`, `por`/`para`
codes that resolve to empty-pos `word` live only in the separate Ser/Estar ·
Por/Para bundle, not here).

## 6. Config (`scripts/configs/spanish.ts`)

A near-clone of `frenchConfig`, reusing its `probeEnglish` / `resolveEnglish` /
`resolveTrigger` (the RTF lookups key on each row's `Course` value, so they
resolve Spanish's 1/21 folders unchanged). Differences: `rtfRoot =
/Volumes/Spanish1Bundle`, the `adv` gender override, the two course names, and
a `media` block (`slug "spanish"`, `imagePrefix "1"`,
`audioPrefixByCourseRef {1:"1", 6:"21"}`). Registered as `spanish` in
`scripts/configs/index.ts`.

## 7. States / edge cases

- **Junk ICCs (2/0/999):** excluded by the valid-ICC set — no course, no words.
- **Sparse sentence triggers:** `21RtfTrg` missing/blank → trigger resolves to
  `null` gracefully.
- **Mixed image formats:** gif/jpg uploaded as-is; swf (incl. uppercase `SWF`)
  rasterised to png by the media importer (swftools installed). Handled in the
  media pass.
- **Blank image suffix (262 rows):** no image reference; media pass skips.
- **Re-run:** `deleteScope` defaults to `"language"`; with 0 existing Spanish
  words the first run is clean, and a re-run is idempotent.

## 8. Data & permissions

- NL `Spanish` language exists (`39e8b5a2-269c-422e-9b84-06722b4f91ff`, visible).
- Existing empty `Vocab #1` course (no lessons/words) → renamed to
  `Spanish Vocab #1` at real-run time (see §9).
- Import runs with the service-role key (bypasses RLS); courses/lessons created
  unpublished by the lesson step (vocab course already published).

## 9. Implementation order (on approval)

1. **Done:** mount ISO, export MDB CSVs, write `scripts/configs/spanish.ts`,
   register in `configs/index.ts`.
2. **Dry-run (this step):**
   `npx tsx scripts/import-legacy-database.ts --language spanish --data-dir "/Users/ryancrocombe/Documents/200WAD/DB IMPORT SPANISH" --dry-run`
   — verify course matching, lesson/word counts (~1176 + 1017), gender
   resolution (0 unmapped), and RTF reads. Optionally `--dump-words` for review.
3. **Rename** the existing empty course: `UPDATE courses SET name='Spanish Vocab #1'
   WHERE id='66c44c81-c1e0-4bbd-ad77-c6ec2c68e2fb';` (so the importer matches it
   by name and only stamps `legacy_ref=1`).
4. **Real DB import:** same command without `--dry-run`.
5. **Media pass:** `npx tsx scripts/import-legacy-media.ts --language spanish`
   (optionally `--dry-run` / `--limit` first).
6. **Verify** in NL: course names, lesson/word counts, a few words' English /
   trigger / image / audio, and the published state.

## 10. Verification checklist (before "done")

- [ ] Dry-run: valid refs {1,6}, valid ICCs {1,21}, 0 unmapped gender codes.
- [ ] Word count ≈ 2193 (1176 vocab + 1017 sentences) across the two courses.
- [ ] Spot-check English (RTF-sourced infinitives), trigger highlight, lemma marker-strip.
- [ ] Media pass: image/audio resolved vs missing counts sane; sample public URLs load.
