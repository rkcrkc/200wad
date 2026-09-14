# Spanish 2 Course Import Plan (DL → NL)

Import the Spanish 2 DANELAW (DL) "Volume 2" content into the NormanLaw (NL)
Supabase database, reusing the existing `scripts/import-legacy-database.ts`
pipeline. Spanish 2 is **structurally identical to French 2** — three new
courses (vocab, sentences, proverbs) added alongside the untouched Spanish 1
courses. This is a config addition (`scripts/configs/spanish2.ts`) plus one
small, language-agnostic robustness fix to the shared RTF resolver (see §6).

> Status: **config + resolver fix written; dry-run pending sign-off** — no DB writes yet.

## 1. Goal & scope

Bring Spanish 2 vocab + sentences + proverbs into NL as **three new courses**
under the existing NL `Spanish` language, leaving Spanish 1 (refs 1/6) intact:
courses, lessons, words, lesson↔word ordering, word relationships, and
memory-trigger text.

**In scope (this pass)**
- Three new courses (ICC 2/22/12), lessons, words, lesson_words, word_relationships.
- English prompt via the **hybrid** rule (words → RTF, sentences/proverbs → `EngDictionary`).
- **Memory-trigger text** from `<ICC>RtfTrg/*.rtf`, preserving the highlight.
- Legacy media file-name references stored on the word rows.

**Deferred to the media pass** (`scripts/import-legacy-media.ts`, run after)
- Image upload (gif/jpg + swf→png) and audio upload (mp3), then rewrite the word
  media columns to public URLs. Handled by the existing media importer.

**Out of scope**
- The separate Ser/Estar · Por/Para bundle (a different ISO).

## 2. Decisions locked (from planning Q&A)

| Decision | Choice |
|---|---|
| Course names | **Spanish Vocab #2** (ref 2), **Spanish Sentences 2** (ref 22), **101 Spanish Proverbs** (ref 12) |
| Casing fix | Make the **shared RTF resolver folder-lookup case-insensitive** (no-op for existing langs) |
| Scope now | Write config + resolver fix + `--dry-run` only; real DB + media run after dry-run review |
| English source | **Hybrid** (reuse French 1): words → `<ICC>RtfEng` body; sentences/proverbs → `EngDictionary` |
| Gender codes | All resolve via the shared canonical mapping — **no override needed** |

## 3. Source inventory

- Disc image: `/Users/ryancrocombe/Documents/200WAD/COURSES/Spanish 2.iso`
  → mounted read-only at `/Volumes/Spanish2Bundle` (`hdiutil attach`).
  **Mounts case-sensitively** (see §6).
- Access DB `MDB/Exceltra Spanish.mdb` exported (via `mdb-export`) to
  `/Users/ryancrocombe/Documents/200WAD/DB IMPORT SPANISH 2/`:
  `Products.csv`, `Sections.csv`, `General.csv`, `Gender.csv`. The importer
  reads the canonical `200w_lexical_code_mapping.csv` under `DB IMPORT ITALIAN/`
  via `mappingPath`.
- RTF folders on disc (mixed casing): `2RTFEng`/`2RTFFor`/`2RTFTrg`,
  `22RTFEng`/`22RTFFor` (no `22…Trg`), `12RtfEng`/`12RtfFor`/`12RtfTrg`, plus
  leftover Spanish-1 `1Rtf*`/`21Rtf*` and UI `0Rtf*`.
- Media on disc: `2Pictures`, `12Pictures` (gif/jpg/swf mix), `2Sound{Eng,For,Trg}`,
  `22Sound{Eng,For}` (no trigger), `12Sound{Eng,For,Trg}`.

## 4. Source shape (mirrors French 2)

- **Products** (Refs 1/6/3, flags 0/21/12) misencode the content ICCs and the
  Refs collide with Spanish 1, so course mapping is **explicit** (see §6).
- **General** → 1978 word rows. `Course` (ICC) distribution:
  - **2 (vocab)** = 1091 rows (1017 with headword; 74 empty-headword drops)
  - **22 (sentences)** = 627 (all with headword)
  - **12 (proverbs)** = 101 (all with headword)
  - Excluded automatically (not in the explicit ICC set {2,22,12}): Spanish-1
    overlap ICC **1** (124) / **21** (5), UI/junk ICC **0** (28) / **999** (2).
  - Expected importable ≈ **1745 words** (1017 + 627 + 101).
- **Field mapping** (legacy DL columns): English from `FileEngSouRTF`→`<ICC>RtfEng`
  (fallback `EngDictionary`; sentences/proverbs use `EngDictionary` directly),
  trigger from `FileFgnTrigger`→`<ICC>RtfTrg`, headword `ForeignRTF`, lemma
  `FgnDictionary`, image stem `FileFgnPic` + suffix `FilePSuffix`, relationships
  `CompoundRef1N`/`CompoundRef2N`/`LinkN`.

## 5. Gender-code coverage

Every Spanish 2 gender code in the vocab/sentence/proverb ICCs already resolves
through the shared `200w_lexical_code_mapping.csv`: articles `el`/`la`/`los`/
`las`/`el (f)`/`el/la`/`una`, `adj.`/`adv.`/`v.`/`prep.`/`conj.`/`prn.`/`exc.`,
`Sentence`/`q.` (category sentence), `prov.` (category proverb), `phr.`
(category phrase). **0 unmapped, 0 constraint-risk** (no empty-pos `word`
codes), so — unlike Spanish 1's `adv` typo — no gender override is required.

## 6. Config & resolver fix

**`scripts/configs/spanish2.ts`** — a near-clone of `french2Config`:
- `name: "spanish"` (targets the existing NL Spanish language; `--language
  spanish2` is only the registry key), `rtfRoot = /Volumes/Spanish2Bundle`.
- **Explicit courses** with synthetic `legacy_ref`s = the ICCs (distinct from
  Spanish 1's 1/6): `{icc:2,ref:2,"Spanish Vocab #2"}`,
  `{icc:22,ref:22,"Spanish Sentences 2"}`, `{icc:12,ref:12,"101 Spanish Proverbs"}`.
- `matchCoursesByRefOnly: true` (don't fuzzy-match Spanish 1's "Spanish
  Sentences"), `deleteScope: "courses"` (re-run wipes only these three).
- Reuses French 1's `probeEnglish`/`resolveEnglish`/`resolveTrigger`.
- `media`: `slug "spanish"`, `imagePrefix "2"`,
  `imagePrefixByCourseRef {2,22,12}`, `audioPrefixByCourseRef {2,22,12}`.
- Registered as `spanish2` in `scripts/configs/index.ts`.

**Shared RTF resolver fix (`scripts/lib/legacy-import/rtf.ts`)** — the Spanish 2
disc mounts case-sensitively and names the ICC-2/22 RTF folders `2RTFEng`/
`22RTFEng` (uppercase), while the resolver builds `2RtfEng`. `createRtfResolver`
now resolves the top-level folder name **case-insensitively** against the actual
directories under `rtfRoot`. This is a no-op when the requested case already
matches (French/Italian/Spanish 1 unaffected) and mirrors the resolver's
existing case-insensitive *file* lookup.

## 7. States / edge cases

- **Spanish-1 overlap + junk ICCs (1/21/0/999):** excluded by the explicit ICC
  set — no course, no words; Spanish 1 untouched.
- **Empty-headword vocab rows (74):** skipped by the importer's headword guard.
- **Sentences/proverbs have no trigger audio** (`22SoundTrg` absent,
  `12SoundTrg` empty) → resolves to missing gracefully in the media pass.
- **Sentence images:** no `22Pictures` folder → any sentence image refs resolve
  to missing in the media pass (expected).
- **Mixed image formats:** gif/jpg as-is; swf rasterised to png by the media
  importer (uses `swfextract`-style fallback only if added; otherwise swftools).
- **Re-run:** `deleteScope: "courses"` makes a re-run idempotent for the three
  new courses only.

## 8. Data & permissions

- NL `Spanish` language exists (`39e8b5a2-269c-422e-9b84-06722b4f91ff`).
- Existing NL Spanish courses are only ref 1 (`Spanish Vocab #1`) and ref 6
  (`Spanish Sentences`) — no collision with the new synthetic refs 2/22/12.
- Import runs with the service-role key (bypasses RLS); new courses created by
  the lesson step (published state per the importer default).

## 9. Implementation order (on approval)

1. **Done:** mount ISO, export MDB CSVs, write `scripts/configs/spanish2.ts`,
   register in `configs/index.ts`, make the RTF resolver case-insensitive.
2. **Dry-run (this step):**
   `npx tsx scripts/import-legacy-database.ts --language spanish2 --data-dir "/Users/ryancrocombe/Documents/200WAD/DB IMPORT SPANISH 2" --dry-run`
   — verify valid refs {2,22,12}, ICCs {2,22,12}, word counts (~1745), gender
   resolution (0 unmapped), and that ICC-2/22 RTF English/trigger reads succeed
   (the casing fix). Optionally `--dump-words`.
3. **Real DB import:** same command without `--dry-run`.
4. **Media pass:** `npx tsx scripts/import-legacy-media.ts --language spanish2`
   (optionally `--dry-run` / `--limit` first).
5. **Verify** in NL: three new course names + counts, a few words' English /
   trigger / image / audio, Spanish 1 intact, published state.

## 10. Verification checklist (before "done")

- [ ] Dry-run: valid refs {2,22,12}, valid ICCs {2,22,12}, 0 unmapped gender codes.
- [ ] Word count ≈ 1745 (1017 vocab + 627 sentences + 101 proverbs).
- [ ] ICC-2/22 English/trigger RTF reads non-empty (confirms the casing fix).
- [ ] Spanish 1 (refs 1/6) untouched.
- [ ] Media pass: image/audio resolved vs missing counts sane; sample URLs load.
