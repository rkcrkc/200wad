# French 2 Course Import Plan (DL → NL)

Import the **French 2** disc (`French 2.iso`, mounted at `/Volumes/Disc`) into the
NL Supabase database as **three new courses under the existing "French"
language**, reusing the generalised `scripts/import-legacy-database.ts` pipeline.
French 1 must remain **completely untouched**.

> Status: **awaiting sign-off** — no code changed yet.

This plan builds directly on `docs/FRENCH_IMPORT_PLAN.md` (French 1). It only
documents what French 2 changes; the field mapping, hybrid-English rule, RTF
extraction, gender-code normalisation and architecture from that plan all carry
over unchanged unless noted.

## 1. Goal & scope

Bring the genuinely-new "Volume 2" content into NL as **separate courses**, so
the French language now contains both volumes side by side.

**In scope (this pass — Phase 1)**
- Three new courses, their lessons, words, lesson_words, word_relationships.
- English via the existing **hybrid** rule; **memory-trigger text** from RTF.
- Legacy media file-name references stored for the Phase 2 media pass.

**In scope (Phase 2 — media)**
- Image/audio hosting via `scripts/import-legacy-media.ts`, extended for French
  2's per-course folder prefixes (see §8).

**Explicitly NOT imported**
- The **145 French-1 overlap/junk rows** (ICC 1 = 143 duplicates, ICC 21 = 2
  junk) — see `docs/FRENCH2_OVERLAP_WITH_FRENCH1.md`. All map to existing French
  1 entries; none is new vocabulary.
- UI rows (ICC 0 = 29, ICC 999 = 1).

## 2. Decisions locked (from planning Q&A)

| Decision | Choice |
|---|---|
| Structure | **Three new separate courses** under the existing **French** language; French 1 unchanged |
| Content | Vocab (**ICC 2**, 1,006), Sentences (**ICC 22**, 791), Proverbs (**ICC 12**, 101) = **1,898 words** |
| Course names | **`Vocab #2`** / **`French Sentences 2`** / **`101 French Proverbs`** |
| Overlap rows | **Skip** all 145 (ICC 1 + ICC 21) — French-1 duplicates / junk |
| Proverbs testing | Same as sentences — type the full proverb; **no UI changes** |
| Proverb images | Only **3/101** exist by design (no relationship data to borrow others); rest are text + audio + trigger |
| Delete behaviour | **Opt-in scoped delete** — default importer behaviour (full-language wipe) stays unchanged; French 2 deletes only its own three courses |

## 3. Source inventory

- Disc image: `/Users/ryancrocombe/Documents/200WAD/French 1 & 2/French 2.iso`
  → mounted read-only at `/Volumes/Disc` (confirmed via `hdiutil info`).
- MDB: `/Volumes/Disc/MDB/Exceltra French.mdb` (read via `mdbtools`).
- Raw CSV exports written to a French-2 data dir (e.g.
  `/Users/ryancrocombe/Documents/200WAD/DB IMPORT FRENCH2/`).
- Shared lexical-code mapping reused:
  `…/DB IMPORT ITALIAN/200w_lexical_code_mapping.csv`.

### General table — ICC distribution (real content)

| ICC | rows | meaning | action |
|---|---|---|---|
| **2** | 1,006 | vocab (Volume 2) | **import → Vocab #2** |
| **22** | 791 | sentences (Volume 2) | **import → French Sentences 2** |
| **12** | 101 | proverbs | **import → 101 French Proverbs** |
| 1 | 143 | French-1 duplicates | skip |
| 21 | 2 | junk ("Drill down…", "A few clarifications:") | skip |
| 0 | 29 | UI/non-content | skip |
| 999 | 1 | non-content | skip |

### Products table — and why it is unreliable for French 2

`Products.csv` lists **Ref 1** "200 Words a Day French" (flag 0), **Ref 6**
"French Sentences" (flag 21), **Ref 3** "101 French Proverbs" (flag 12). Under
the standard `ProductFlag` indirection these yield ICCs **{1, 21, 12}** — but the
actual content lives in **{2, 22, 12}**. So Products-derived `validIccs` would
**skip the 1,797 vocab+sentence rows** and the Product Refs **collide with French
1's** (1 and 6). French 2 therefore must drive course assignment from the row's
own `Course` (ICC) column with an **explicit config map**, not from Products
flags or lesson-ID prefixes (§7).

### Lesson-ID ranges (per content ICC)

| Course | ICC | lesson IDs | lessons | words |
|---|---|---|---|---|
| Vocab #2 | 2 | 39–104 | 66 | 1,006 |
| French Sentences 2 | 22 | 210391–211042 | (per Sections) | 791 |
| 101 French Proverbs | 12 | 12001–12009 | 9 | 101 |

These ranges are **disjoint from French 1** and from the skipped duplicates, so
omitting the duplicates shrinks no imported lesson. Only **one** `RefN` in the
new content collides with a French-1 `RefN` (handled in §8).

### Media folders on disc (Phase 2)

| folder | count | folder | count |
|---|---|---|---|
| `2Pictures` | 941 | `12Pictures` | 3 (SWF) |
| `2SoundEng` | 1,006 | `12SoundEng` | 101 |
| `2SoundFor` | 1,015 | `12SoundFor` | 101 |
| `2SoundTrg` | 944 | `12SoundTrg` | 0 |
| `22SoundEng` | 791 | `2RtfTrg` | 944 |
| `22SoundFor` | 791 | `22RtfTrg` | 0 |
| `22SoundTrg` | 0 | `12RtfTrg` | 72 |

Notes: vocab trigger text lives in `2RtfTrg`; **sentences have no trigger**
(`22RtfTrg`/`22SoundTrg` empty); proverbs have trigger text for ~72 of 101.
`omelette.jpg` is in `2Pictures` (vocab uses it); the **3 proverb images are SWF
only in `12Pictures`**. Images for vocab/proverbs use **different prefixes** →
drives the per-course image-prefix change (§8).

## 4. Field mapping (unchanged from French 1)

The hybrid-English rule, headword (`ForeignRTF`), lemma (`FgnDictionary`
marker-stripped), notes, false-friend flag and legacy media refs all follow
`docs/FRENCH_IMPORT_PLAN.md §4`. They already key their RTF lookups on the row's
`Course` (ICC) value (`${Course}RtfEng`, `${Course}RtfTrg`), so they resolve
French 2's `2RtfEng` / `12RtfTrg` automatically — **no field-resolver change**.

- **Words (ICC 2)** → english from `2RtfEng/<FileEngSouRTF>.rtf`, fallback
  `EngDictionary`.
- **Sentences (ICC 22) & proverbs (ICC 12)** → english from `EngDictionary`
  (marker-stripped); `proverb` is already in `SENTENCE_LIKE`.
- **Trigger** → `${Course}RtfTrg/<FileFgnTrigger>.rtf` (vocab + proverbs;
  sentences resolve to none).

## 5. Gender-code mapping (unchanged)

Reuse the shared canonical normalisation and the `le/la → mf` override from the
French 1 config (`prov. → proverb` is already in the mapping). No new codes
expected; the dry-run asserts 0 unmapped (§9).

## 6. Course / lesson structure — explicit ICC map

NL target courses (all **new**, French 1 keeps refs 1 and 6):

| Content ICC | New NL course | `legacy_ref` |
|---|---|---|
| 2 | `Vocab #2` | **2** |
| 22 | `French Sentences 2` | **22** |
| 12 | `101 French Proverbs` | **12** |

Synthetic `legacy_ref`s reuse the ICC values (2 / 22 / 12). They are unique
within the French language and **do not collide** with French 1's 1 and 6.

Because Products flags misencode the ICCs, French 2 supplies the ICC→course set
**directly in config** rather than deriving it from `Products`/lesson-ID
prefixes:

```ts
// scripts/configs/french2.ts (proposed)
courses: [
  { icc: 2,  ref: 2,  createName: "Vocab #2" },
  { icc: 22, ref: 22, createName: "French Sentences 2" },
  { icc: 12, ref: 12, createName: "101 French Proverbs" },
],
matchCoursesByRefOnly: true,   // see §7 R-1
deleteScope: "courses",        // opt-in scoped delete, see §7 R-2
```

## 7. Importer changes (all opt-in, default behaviour preserved)

Four gated changes. Each is a no-op for Italian/French 1 (which leave the new
config fields undefined), so **no regression**.

**R-1 — Course matching by ref only (the `French Sentences 2` trap).**
Step 3's matcher (`import-legacy-database.ts:238-244`) also matches on a
case-insensitive *name substring*: `n.includes(c.name)` makes
`"french sentences 2"` match French 1's existing **`French Sentences`** course,
which would re-point it and pour French 2 sentences into French 1.
*Change:* when `config.matchCoursesByRefOnly` is set, match **only** on
`c.legacy_ref === legacyRef`. With the synthetic refs 2/22/12 absent, all three
courses are created fresh. `Vocab #2` vs `Vocab #1` is already substring-safe;
this flag protects the sentences case explicitly.

**R-2 — Opt-in scoped delete (`deleteScope: "courses"`).**
Step 6 (`:771-805`) deletes **all** words for the language — it would wipe French
1. *Change:* when `deleteScope === "courses"`, restrict the delete to words that
are members (via `lesson_words → lessons.course_id`) of the **French-2 courses
only**, deleting their `lesson_words` and `word_relationships` first. Default
(`undefined`) keeps today's full-language wipe (Italian/French 1 idempotency).
First run deletes nothing (courses don't exist yet); re-runs cleanly replace
French 2. *Known minor limit:* a French-2 word that ends up with no lesson
(Lesson ≤ 0) isn't course-linked and so isn't caught by a re-run — French 2's
content rows essentially all carry a lesson, so this is negligible; noted in §9.

**R-3 — ICC from the `Course` column, not lesson-ID prefixes.**
`deriveCourseFromLesson` (`:204-205`, used at `:365` and `:606`) decodes the ICC
from the lesson-ID prefix. French 2 breaks it: vocab lessons 39–104 (<1000) →
ICC 1, and sentence lessons 210391+ → prefix "21" (≠ 22). *Change:* when the
config provides an explicit `courses[].icc` map, resolve a row/section's course
from its own `Course` (ICC) column via that map (`Sections.Course` for lessons,
`General.Course` for words), and use the config ICC set as `validIccs`. Italian
(no `icc` field) keeps the prefix derivation.

**R-4 — Run-local `RefN → wordId` map.**
Step 8 (`:843-864`) rebuilds the map by querying **all** French words by
`legacy_refn` — ambiguous at the one cross-volume `RefN` collision. *Change:* in
scoped mode, capture inserted ids directly from Step 7 (`insert(...).select("id,
legacy_refn")`) so the map holds **only this run's** words. The colliding RefN
then resolves to the French-2 word, and French 1's row is never touched.

> Pre-flight check to confirm during dry-run: that `Sections.Course` for French 2
> carries the content ICCs (2/22/12). If Sections encodes the misleading
> Products ICCs instead, R-3 falls back to mapping sections by the `General`
> row's ICC for the same lesson id. (Verification item in §9.)

## 8. Media pass (Phase 2)

Reuse `scripts/import-legacy-media.ts`; the only gap is that French 2 splits
images across prefixes while the current `MediaConfig.imagePrefix` is a single
string.

*Change:* add optional `imagePrefixByCourseRef?: Record<number,string>` to
`MediaConfig` (mirrors the existing `audioPrefixByCourseRef`), falling back to
`imagePrefix` when absent. French 2 media block:

```ts
media: {
  slug: "french",                       // shares the French storage namespace
  mountRoot: "/Volumes/Disc",
  imagePrefix: "2",                     // default
  imagePrefixByCourseRef: { 2: "2", 22: "22", 12: "12" },
  audioPrefixByCourseRef: { 2: "2", 22: "22", 12: "12" },
},
```

Notes: sentences (22) have **no trigger audio** (`22SoundTrg` empty); proverbs
(12) likewise have no trigger audio; the 3 proverb images are SWF (→ PNG via the
existing `convert-swf-to-png.sh`). Missing files are skipped gracefully, as in
the French 1 media pass.

## 9. Edge cases & states

- **Skipped buckets**: ICC 1/21/0/999 never enter the word set (config ICC
  filter). Report their counts in the run summary for transparency.
- **One RefN collision** with French 1 → resolved by the run-local map (R-4).
- **Missing trigger** (all sentences, ~29 proverbs) → `memory_trigger_text` null;
  renders as no-trigger (already supported).
- **Image-less words** (1,895 of 1,898) → no image; the generic word/sentence/
  proverb UI renders gracefully (confirmed — no UI work).
- **Proverbs** flow through the generic word path with `category="proverb"`,
  tested exactly like sentences.
- **Re-run** within French 2 replaces only the three French-2 courses (R-2);
  lesson-less French-2 words are the one non-idempotent edge (negligible).
- **Encoding / "too much data"**: unchanged from French 1 (Windows-1252 +
  `sanitizeText`; text fields unbounded).

## 10. Data & permissions

- Writes via **service-role** key (script-only). Tables: `courses`, `lessons`,
  `words`, `lesson_words`, `word_relationships`. No RLS/guest implications.
- `--dry-run` end-to-end before any write; `--dump-words` to inspect resolved
  rows.

## 11. Reuse

- Entire generalised pipeline + capability modules (`rtf.ts`, `field-source.ts`,
  `course-mapping.ts`, `gender-codes.ts`).
- The French 1 config's field resolvers, gender override and `stripMarker`
  (the French 2 config imports/derives from `french.ts` where identical).
- `scripts/import-legacy-media.ts` + `convert-swf-to-png.sh` for Phase 2.

## 12. Risks & open questions

- **R-1…R-4 (§7)** — the four importer changes; each gated so Italian/French 1
  are byte-identical (regression anchor = an Italian/French-1 `--dry-run` diff).
- **Sections ICC encoding** — verify `Sections.Course` = {2,22,12} during
  dry-run (fallback noted in §7).
- **`2RtfEng` presence** — vocab english relies on it; confirm the folder/keys
  resolve (fallback `EngDictionary` covers misses).
- **Storage namespace** — French 2 shares `slug: "french"`; filenames are
  prefix-scoped on disc but flattened in storage — confirm no French-1 filename
  collisions before the Phase 2 upload (spot-check; namespace by course subfolder
  if any clash).

## 13. Verification checklist (before "done")

- [ ] French 1 untouched: `Vocab #1` / `French Sentences` word counts, lessons
  and `legacy_ref`s unchanged before/after.
- [ ] Three new courses created: `Vocab #2` (legacy_ref 2), `French Sentences 2`
  (22), `101 French Proverbs` (12) — **none matched onto a French-1 course**.
- [ ] Word counts: Vocab #2 ≈ 1,006; French Sentences 2 ≈ 791; Proverbs = 101.
- [ ] Skipped buckets reported: ICC 1=143, 21=2, 0=29, 999=1; **0** overlap rows
  imported.
- [ ] Gender mapping: 0 unmapped; `prov.`→proverb; `le/la`→mf.
- [ ] Lessons: Vocab #2 = 66, Proverbs = 9; word_count per lesson correct.
- [ ] The one colliding `RefN` resolves to the French-2 word; French 1's row
  intact.
- [ ] Trigger text present for vocab + ~72 proverbs; absent for sentences.
- [ ] Italian + French-1 `--dry-run` unchanged (regression anchor).
- [ ] `npm run lint` passes; no dead code.
- [ ] (Phase 2) media uploaded from correct per-course prefixes; 3 proverb
  images convert; missing files skipped.
- [ ] Spot-check ~20 vocab + ~10 sentences + ~10 proverbs against the DL app/RTF.

## 14. Implementation order (on approval)

1. Add `courses[].icc`, `matchCoursesByRefOnly`, `deleteScope` to the config
   types; extend `MediaConfig` with `imagePrefixByCourseRef`.
2. Implement R-1…R-4 in `import-legacy-database.ts` and the ICC-from-`Course`
   path in `course-mapping.ts`, all gated on the new config fields.
3. Prove **no regression**: Italian + French-1 `--dry-run` diff vs current DB.
4. Author `scripts/configs/french2.ts` (register `french2` in `configs/index.ts`;
   `name: "french"` so it targets the existing French language).
5. Export French 2 MDB → CSV; `--dry-run` + `--dump-words`; inspect resolved
   english/headword/trigger and the skip/keep counts.
6. Real Phase-1 import; run the §13 checklist.
7. Phase 2: per-course media conversion + hosting.
