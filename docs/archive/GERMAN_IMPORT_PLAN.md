# German 1 + 2 Course Import Plan (DL → NL)

Import the German DANELAW (DL) content into the NormanLaw (NL) Supabase database,
reusing the existing `scripts/import-legacy-database.ts` pipeline. German differs
from Spanish/French in one structural way: **all volumes ship on one disc/MDB**.
The single `General` table holds Volume-1 (ICC 1/21), Volume-2 (ICC 2/22) and the
proverbs (ICC 12) side by side, and all of their media is on the one disc too — so
the separate **"German 2.iso" is redundant** (its content is byte-identical) and
everything is imported from the German-1 disc at `/Volumes/Disc`.

Because the combined MDB mixes volumes, the default Products/lesson-id course
mapping cannot be used (it would drag vol-2 into the vol-1 courses), so both
configs use **explicit-ICC** scoping (the French 2 / Spanish 2 pattern). This is
two config files (`scripts/configs/german.ts`, `german2.ts`) — no shared-pipeline
changes (the case-insensitive RTF resolver added for Spanish 2 already covers
German's mixed folder casing).

> Status: **DONE** — both volumes imported (4178 words across 5 published courses),
> media uploaded, verified. Two follow-ups landed during the real run: (1) German
> nouns use a new `mn` gender (der/das, masc-or-neut) that the `words_gender_check`
> constraint didn't allow — added `mn` as a first-class gender (DB constraint + app
> color/abbrev/validation), mirroring `mf`; (2) the legacy "Tutorial" UI lesson in
> German Sentences carried two junk `information` rows ("Drill down" / "Link to 200
> Words a Day") — removed, along with the now-empty lesson, matching the other
> languages. The vocab course was renamed `Vocab #1` → `German Vocab #1`.

## 1. Goal & scope

Bring German into NL as **five new courses** under the existing (empty) NL
`German` language, split into two volumes to mirror the Spanish 1/2 layout:
courses, lessons, words, lesson↔word ordering, word relationships, and
memory-trigger text.

- **German 1** (`--language german`, ICC 1/21): **German Vocab #1** (ref 1, renames
  the empty placeholder) + **German Sentences** (ref 21) ≈ **2070 words**.
- **German 2** (`--language german2`, ICC 2/22/12): **German Vocab #2** (ref 2) +
  **German Sentences 2** (ref 22) + **101 German Proverbs** (ref 12) ≈ **2110
  words**. Proverbs are grouped with vol-2 to match the existing Spanish 2.

**In scope (this pass)**
- Five courses, lessons, words, lesson_words, word_relationships.
- English prompt via the **hybrid** rule (words → RTF, sentences/proverbs → `EngDictionary`).
- **Memory-trigger text** from `<ICC>RtfTrg/*.rtf`, preserving the highlight.
- Legacy media file-name references stored on the word rows.

**Deferred to the media pass** (`scripts/import-legacy-media.ts`, run after)
- Image upload (gif/jpg + swf→png) and audio upload (mp3), then rewrite the word
  media columns to public URLs. Handled by the existing media importer.

**Out of scope**
- The separate `German 2.iso` (redundant — same content, same media, already on
  the German-1 disc).

## 2. Decisions (mirroring the Spanish convention)

| Decision | Choice |
|---|---|
| Course names | **German Vocab #1** (ref 1), **German Sentences** (ref 21), **101 German Proverbs** (ref 12) |
| Scoping mode | **Explicit ICC** {1,21,12} — required because the MDB also holds vol-2 (ICC 2/22) |
| Existing placeholder | Vocab entry `matchNames` absorb + rename the empty NL "Vocab #1" course |
| English source | **Hybrid** (reuse French 1): words → `<ICC>RtfEng` body; sentences/proverbs → `EngDictionary` |
| Gender codes | All resolve via the shared mapping except `v. refl.` → one-off override (reflexive verb) |
| Scope now | Config + `--dry-run` only; real DB + media run after dry-run review |

## 3. Source inventory

- Disc image: `/Users/ryancrocombe/Documents/200WAD/COURSES/German_ISO.iso`
  → mounted read-only at `/Volumes/Disc` (`hdiutil attach`). **Mounts
  case-sensitively** (see §6).
- Access DB `MDB/Exceltra German.mdb` exported (via `mdb-export`) to
  `/Users/ryancrocombe/Documents/200WAD/DB IMPORT GERMAN/`: `Products.csv`,
  `Sections.csv`, `General.csv`, `Gender.csv`. The importer reads the canonical
  `200w_lexical_code_mapping.csv` under `DB IMPORT ITALIAN/` via `mappingPath`.
- RTF folders on disc (mixed casing): `1RTFEng`/`1RTFFor`/`1RTFTrg` (UPPER),
  `21RtfEng`/`21RtfFor`/`21RtfTrg`, `12RtfEng`/`12RtfFor`/`12RtfTrg`, plus
  leftover vol-2 `2Rtf*`/`22Rtf*` and UI `0Rtf*`.
- Media on disc: `1Pictures`, `12Pictures` (gif/jpg/swf mix), `1Sound{Eng,For,Trg}`,
  `21Sound{Eng,For}` (no trigger), `12Sound{Eng,For}` (no trigger). No
  `21Pictures` → sentence images share `1Pictures`.

## 4. Source shape (single-disc, both volumes present)

- **Products** (Refs 1/6/3, flags 0/21/12): Ref 1 "200 Words a Day German"
  (flag 0 ⇒ ICC 1), Ref 6 "German Sentences" (flag 21 ⇒ ICC 21), Ref 3
  "101 German Proverbs" (flag 12 ⇒ ICC 12).
- **General** → 4588 rows. `Course` (ICC) distribution (with-headword):
  - **1 (vocab)** = 1225 rows (1038 with headword)
  - **21 (sentences)** = 1034 (1032 with headword)
  - **12 (proverbs)** = 101 (101 with headword)
  - Excluded by the explicit ICC set {1,21,12}: vol-2 **ICC 2** (1196/1009 hw) /
    **ICC 22** (1000/1000 hw), and UI/junk **ICC 0** (30) / **999** (2).
  - Expected importable ≈ **2171 words** (1038 + 1032 + 101).
- **Why explicit mode is mandatory:** lesson-ids for vol-1 vocab (ICC 1) are
  −39..39 and for vol-2 vocab (ICC 2) are −109..109 — both < 1000, which the
  default `deriveIcc` maps to ICC 1. Vol-2 sentences (210401+) share the "21"
  prefix with vol-1 sentences. The default lesson-id scheme would therefore merge
  vol-2 into the German-1 courses. Explicit ICC mode assigns/filters by each
  row's own `Course` column, keeping {1,21,12} clean.
- **Field mapping** (legacy DL columns): English from `FileEngSouRTF`→`<ICC>RtfEng`
  (sentences/proverbs use `EngDictionary`), trigger from `FileFgnTrigger`→
  `<ICC>RtfTrg`, headword `ForeignRTF`, lemma `FgnDictionary`, image stem
  `FileFgnPic` + suffix `FilePSuffix`, relationships `CompoundRef1N`/
  `CompoundRef2N`/`LinkN`.

## 5. Gender-code coverage

Of the gender codes used by the importable ICCs {1,21,12}, **all resolve through
the shared `200w_lexical_code_mapping.csv` except one**: `v. refl.` (reflexive
verb, 10 rows). The mapping already carries the German verb codes (`v. weak
insep.`, `v. strong sep.`, `v. modal`, etc.) and a generic `reflexive` row
(category word / pos verb / tag reflexive); `v. refl.` was simply missed. A
single `genderOverrides` entry resolves it identically (verb + reflexive tag).
**0 remaining unmapped, 0 constraint-risk** (no empty-pos `word` codes).

## 6. Config (no resolver change needed)

**`scripts/configs/german.ts`** — explicit-ICC, French-hybrid:
- `name: "german"`, `rtfRoot = /Volumes/Disc`.
- **Explicit courses** with synthetic `legacy_ref`s = the ICCs:
  `{icc:1,ref:1,"German Vocab #1"}` (with `matchNames` to absorb the empty
  placeholder), `{icc:21,ref:21,"German Sentences"}`,
  `{icc:12,ref:12,"101 German Proverbs"}`.
- `deleteScope: "courses"` (re-run wipes only these three). `matchCoursesByRefOnly`
  intentionally unset so the vocab entry can rename the existing empty "Vocab #1".
- `genderOverrides`: `v. refl.` → reflexive verb.
- Reuses French 1's `probeEnglish`/`resolveEnglish`/`resolveTrigger`.
- `media`: `slug "german"`, `imagePrefix "1"`,
  `imagePrefixByCourseRef {1:"1",21:"1",12:"12"}`,
  `audioPrefixByCourseRef {1:"1",21:"21",12:"12"}`.
- Registered as `german` in `scripts/configs/index.ts`.

**Shared RTF resolver:** no change. The case-insensitive folder lookup added for
Spanish 2 already resolves German's uppercase `1RTFEng` against the resolver's
`1RtfEng` request. (Media `Pictures`/`Sound` folder names match what the media
resolver builds, so no media-side casing fix is needed.)

## 7. States / edge cases

- **Vol-2 leftover + junk ICCs (2/22/0/999):** excluded by the explicit ICC set —
  no course, no words.
- **Empty-headword vocab rows:** skipped by the importer's headword guard.
- **Sentences/proverbs have no trigger audio** (`21SoundTrg`/`12SoundTrg` absent)
  → resolves to missing gracefully in the media pass.
- **Sentence images:** no `21Pictures` → mapped to `1Pictures` (shared with vocab).
- **Tutorial lesson (210000) in sentences:** a legacy UI lesson; verify post-run
  whether it carries any junk word (as Spanish 1's "Drill down" did).
- **Mixed image formats:** gif/jpg as-is; swf rasterised to png by the media
  importer (swftools), with the known JPEG-embedded / large-vector SWF recovery
  techniques from the Spanish runs as fallback.
- **Re-run:** `deleteScope: "courses"` makes a re-run idempotent for these three.

## 8. Data & permissions

- NL `German` language exists (`7bb57c89-e01b-404b-a3d7-ab7d087ac925`) with a
  single empty placeholder course "Vocab #1" (legacy_ref null, 0 words) — the
  vocab entry's `matchNames` rename it; no collision with the synthetic refs.
- Import runs with the service-role key (bypasses RLS); new courses published.

## 9. Implementation order (on approval)

1. **Done:** mount ISO, export MDB CSVs, write `scripts/configs/german.ts`,
   register in `configs/index.ts`.
2. **Dry-run (this step):**
   `npx tsx scripts/import-legacy-database.ts --language german --data-dir "/Users/ryancrocombe/Documents/200WAD/DB IMPORT GERMAN" --dry-run`
   — verify valid refs {1,21,12}, ICCs {1,21,12}, word counts (~2171), gender
   resolution (0 unmapped), and that ICC-1 RTF English/trigger reads succeed
   (the casing fix). Optionally `--dump-words`.
3. **Real DB import:** same command without `--dry-run`.
4. **Media pass:** `npx tsx scripts/import-legacy-media.ts --language german`
   (optionally `--dry-run` / `--limit` first).
5. **Verify** in NL: three new course names + counts, a few words' English /
   trigger / image / audio, vol-2 absent, published state.

## 10. Verification checklist (before "done")

- [ ] Dry-run: valid refs {1,21,12}, valid ICCs {1,21,12}, 0 unmapped gender codes.
- [ ] Word count ≈ 2171 (1038 vocab + 1032 sentences + 101 proverbs).
- [ ] ICC-1 English/trigger RTF reads non-empty (confirms the casing fix).
- [ ] Vol-2 (ICC 2/22) absent; only three German-1 courses created.
- [ ] Media pass: image/audio resolved vs missing counts sane; sample URLs load.
