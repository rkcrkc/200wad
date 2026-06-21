# French Course Import Plan (DL → NL)

Import the French DANELAW (DL) course content into the NormanLaw (NL) Supabase
database, reusing and extending the existing `scripts/import-legacy-database.ts`
pipeline (originally built for Italian).

> Status: **awaiting sign-off** — no code changed yet.

## 1. Goal & scope

Bring French vocab + sentences into NL: courses, lessons, words (with the
correct English prompt, headword, lemma, notes, linguistic attributes),
lesson↔word ordering, word relationships, **and memory-trigger text**.

**In scope (this pass)**
- Courses, lessons, words, lesson_words, word_relationships.
- English prompt via the **hybrid** rule (see §4).
- **Memory-trigger text** extracted from `1RtfTrg/*.rtf`, preserving the
  bold/colour phonetic highlight.

**Deferred (later phases, not this pass)**
- Image assets (SWF/GIF/PDF → PNG/SVG conversion + hosting).
- Audio assets (mp3 hosting/upload).
- We still **import the legacy file-name references** (so a later media pass can
  resolve them), exactly as the Italian import did.

## 2. Decisions locked (from planning Q&A)

| Decision | Choice |
|---|---|
| Scope | Words + lessons + relationships **+ trigger text**; media deferred |
| English source | **Hybrid**: words → `1RtfEng` RTF body; sentences/phrases → `EngDictionary` (marker-stripped); fallback `EngDictionary` when RTF missing |
| Course mapping | Keep existing NL course **`Vocab #1`** name, set `legacy_ref=1`; **create** a second course `French Sentences` (`legacy_ref=6`) |
| Headword source | **Inline `ForeignRTF`** (not `1RtfFor`) — parity with Italian, correct for sentences; see R-1 |
| Process goal | **Generalise the importer** so French learnings (RTF sourcing, hybrid English, `ProductFlag` indirection, per-language schema drift) become **reusable for future language migrations** — not a French-only script (O-1) |

## 3. Source inventory

- Disc image: `/Users/ryancrocombe/Documents/200WAD/French 1 & 2/French 1.iso`
  → mounted read-only at `/Volumes/Disc` (`hdiutil`).
- MDB: `/Volumes/Disc/MDB/Exceltra French.mdb` (Access; read via `mdbtools`).
- RTF/media folders on the disc:
  - `1RtfEng/` — English display text (1,923 files matched)
  - `1RtfFor/` — Foreign display text (RTF, formatted)
  - `1RtfTrg/` — **Memory-trigger** text (1,035 files; colour-highlighted)
  - `1Pictures/`, `1SoundEng/`, `1SoundFor/`, `1SoundTrg/` — media (deferred)
- Raw CSV exports (one per MDB table) written to:
  `/Users/ryancrocombe/Documents/200WAD/DB IMPORT FRENCH/`
- Tooling installed: `mdbtools`, `poppler` (Homebrew).

Row counts (real = `Course ≠ 0`): General **2,045** words, Sections 221,
Products 2, Gender 71.

## 4. Field mapping (DL → NL `words`)

The authoritative mapping is the PDF `DB IMPORT/200WAD_Database-Import-Plan`.
French diverges from Italian because its MDB schema is older/different — several
"columns" the Italian importer expects don't exist and must be derived from RTF.

| NL column | Italian source | **French source** |
|---|---|---|
| `english` | `English` column | **Hybrid** (see below) |
| `headword` | `ForeignRTF` (RTF) | `ForeignRTF` — *inline plain text* (e.g. `à partir de`) |
| `lemma` | `FgnDictionary` cleaned | `FgnDictionary` cleaned (strip `,m.`/`,f.`/… markers) |
| `notes` | `Notes` | `Notes` (inline) |
| `memory_trigger_text` | `Trigger` column | **`1RtfTrg/<FileFgnTrigger>.rtf`** (extracted, formatting kept) |
| `memory_trigger_image_url` | `FileFgnPic` | `FileFgnPic` (+ `FilePSuffix` for ext) — legacy ref only |
| `audio_url_english` | `FileEngSouRTF` | `FileEngSouRTF` — legacy ref only |
| `audio_url_foreign` | `FileFgnSouRTF` | `FileFgnSouRTF` — legacy ref only |
| `audio_url_trigger` | `FileFgnTrigger` | `FileFgnTrigger` — legacy ref only |
| `is_false_friend` | `FlagFalseFriends` | `FlagFalseFriends` |
| linguistic attrs | `Gender` → mapping CSV | `Gender` → mapping CSV (4 codes to add, §6) |
| `legacy_refn` | `RefN` | `RefN` |

Columns **absent** in French (handled gracefully, no error): `English`,
`Trigger`, `MiniLinkN`.

### Hybrid English rule (matches the Italian precedent)

Validated against the NL Italian data: Italian verbs are **98.4%** `"to …"`
and **21.4%** of words carry parenthetical disambiguators, and sentences are
full sentences. To reproduce that for French:

- **Sentence / phrase entries** (`Gender` ∈ {`Sentence`, `phr.`, `exp.`, `id`,
  `prov.`, `q.`, …, i.e. mapping `category` ∈ {sentence, phrase, proverb}):
  use **`EngDictionary`** marker-stripped (holds the full sentence; the RTF only
  holds a focus keyword and would be wrong).
- **Word entries**: use the **`1RtfEng/<FileEngSouRTF>.rtf`** body (gives the
  `to`-infinitive and `(disambiguator)` forms Italian has).
  - Fallback to `EngDictionary` (marker-stripped) when `FileEngSouRTF` is blank
    (~110 rows) or the RTF file is missing (~12 rows).

Evidence (1,935 keyed rows): 779 exact, 74 differ only by a parenthetical,
1,070 genuine differences — the differences are exactly the `to `-infinitive,
disambiguators, and the sentence-keyword split described above.

## 5. RTF extraction (English + trigger)

A single small RTF→text utility serves both `1RtfEng` and `1RtfTrg`.

- **Lookup**: `<dir>/<key>.rtf` where key = `FileEngSouRTF` (English) or
  `FileFgnTrigger` (trigger). Lookup must be **case-insensitive** and
  **apostrophe/accent-normalised** (e.g. `lessive`→`Lessive.rtf`,
  `avoir mal a lestomac`→`l'estomac`). This recovers nearly all of the ~37
  case/punctuation "misses"; ~110 trigger-blank rows are legitimately
  trigger-less.
- **English RTF**: take plain text; strip a trailing `NUL`/newline artifact
  some files carry.
- **Trigger RTF**: **preserve bold + colour** — the highlighted syllable is the
  phonetic bridge (e.g. `En.rtf` → *a man says, "I live in `EN`gland."* with
  `EN` coloured). Convert RTF runs to the NL formatted-text representation that
  `src/lib/utils/parseFormattedText.tsx` renders (same model the existing
  `scripts/migrate-rtf-colors.ts` / colour migrations already use). Then run the
  importer's existing `sanitizeText` (control-char strip, Win-1252 C1 remap,
  quote normalisation, whole-line-underline → heading).

## 6. Gender-code mapping — canonical normalisation (O-2 resolved)

French uses **23 distinct `Gender` codes**. Simulating the importer's *actual*
lookup (exact `Code` match, last-row-wins) against the real data shows **5 codes
mis-map today, affecting ~1,011 word rows** — so the import is **not safe to run
as-is**:

| code | rows | result today | cause |
|---|---|---|---|
| `Sentence` | 893 | **UNMAPPED** → falls back to "word"/"phrase" | capital `S` ≠ table's `sentence` |
| `l’ (m)` | 66 | **UNMAPPED** → no gender/POS | curly `’` ≠ Italian's backtick `` ` `` |
| `l’ (f)` | 46 | **UNMAPPED** | same apostrophe mismatch |
| `l’ (m/f)` | 3 | **UNMAPPED** | same |
| `le/la` | 3 | noun **`f`** (Italian) | French `le/la` should be **`mf`** |

The other 18 codes (`le`, `la`, `v.`, `adj.`, `adv.`, `les (f/m)`, `m.`, …) map
correctly today.

**Decision:** rather than duplicate per-language rows, standardise on **French
syntax as the canonical form** and normalise *at lookup time* — applying the
same function to the mapping `Code` keys and to each word's incoming `Gender`
value, so Italian and French both resolve through one canonical set.

**Normalisation rule (deliberately scoped):**
1. Backtick → curly apostrophe (`` ` `` → `’` U+2019). Safe globally — the
   backtick only ever appears in the l' family.
2. Strip periods **only inside parentheses** (`l\` (f.)` → `l’ (f)`), never on
   bare-letter codes.
3. Match **case-insensitively** (covers `Sentence` vs `sentence` and future
   case drift for free).

**Why scoped, not a blanket period-strip:** a global period-strip would merge
`v.` (plain verb) with `v` (irregular verb) — distinct meanings. Restricting
period removal to inside `(…)` avoids that; verified the only collision it
produces is the *desired* merge `l\` (m)` + `l\` (m.)` → `l’ (m)` (both
masculine-singular synonyms).

Under this rule the whole Italian l' family folds onto the French canonical keys:

| Italian source code | → canonical | gender / number |
|---|---|---|
| `l\` (f.)` | `l’ (f)` | f sg |
| `l\` (m)`, `l\` (m.)` | `l’ (m)` | m sg |
| `l\` (m./f.)` | `l’ (m/f)` | mf sg |
| `l\` (f.pl.)` | `l’ (fpl)` | f pl (Italian-only, no FR equiv) |

Normalisation fixes **4 of the 5** mis-maps — `Sentence` (case) and all three
`l’` forms (apostrophe) — recovering **1,008 rows**. The French `l’` codes reach
the Italian rows via the shared canonical key, so **no `l’` rows need adding**.

**The one remaining fix — `le/la`.** This is a genuine cross-language divergence
(same string, French = `mf`, Italian = `f`), which normalisation cannot resolve.
Add a single explicit French row `le/la → noun, mf, sg` (or make the lookup
language-aware). Note this — not `le` — is the real collision: `le` is safe
because French has its own `le` row and Italian uses the distinct string
`le (Ita)`.

**Before / after (the dry-run baseline):**

| | mis-mapped codes | rows affected |
|---|---|---|
| Today (exact match) | 5 / 23 | ~1,011 |
| + normalisation | 1 / 23 (`le/la`) | 3 |
| + `le/la` fix | **0 / 23** | **0** |

> Behaviour change: the Italian import previously used exact-match keys. Under
> normalisation the gender results are unchanged (all merges are synonyms), so
> the **Italian config is the regression anchor** that proves this in `--dry-run`.

## 7. Course / lesson structure & the `ProductFlag` indirection

French numbering differs from Italian and **must** be handled or 897 sentences
silently vanish:

- `General.Course` / `Sections.Course` use an **internal course code (ICC)**:
  `1` = vocab (1,147 words), `21` = sentences (897 words). (`0`/`999`/`90`/`91`
  are UI/other-product → skip.)
- `Products` only lists `Ref 1` ("200 Words a Day French") and `Ref 6`
  ("French Sentences"), and **`Ref 6` has `ProductFlag = 21`**.
- Therefore **ICC → Product Ref**: `icc = ProductFlag if ProductFlag ≠ 0 else Ref`
  ⇒ `{1 → Ref 1, 21 → Ref 6}`.
- Lesson IDs encode the ICC (`< 1000` ⇒ ICC 1; else first two digits, e.g.
  `210171` ⇒ ICC 21), so `deriveCourseFromLesson` must return the **ICC** and a
  second map translates ICC → Ref.

NL target courses (per locked decision):
- ICC 1 → existing NL course **`Vocab #1`** — match by name, set `legacy_ref=1`,
  keep the name unchanged.
- ICC 21 → **create** NL course **`French Sentences`**, `legacy_ref=6`.

`LinkN` word↔sentence relationships: the side with `Course = 21` (ICC) is the
sentence; preserved relationally as today.

## 8. Architecture — generalise the migration pipeline (O-1 resolved)

**Goal (O-1):** don't write a French-only script. Augment the migration process
so each language is described by a small **config/adapter**, and the
French-specific learnings become **reusable capabilities** the next language
import inherits. French is the first consumer of the generalised pipeline.

**Three layers:**

1. **Reusable capability modules** (`scripts/lib/legacy-import/`) — new, shared:
   - `rtf.ts` — RTF→text + RTF→formatted-text (highlight-preserving) extractor
     used for any column that lives in an RTF folder. Handles case-insensitive /
     accent- & apostrophe-normalised file lookup and the trailing-NUL artifact.
   - `field-source.ts` — a **field-source resolver**: each NL field declares
     where its value comes from — `column`, `rtf-folder` (keyed by another
     column), or `derived` (a function). This is what lets one language read
     `english` from a column and another from `1RtfEng/`.
   - `course-mapping.ts` — `ProductFlag` indirection / ICC→Ref + lesson-ID→ICC
     decoding (§7), generalised (Italian's direct `Ref` is the `ProductFlag=0`
     special case).
   - `gender-codes.ts` — shared `200w_lexical_code_mapping.csv` loader (with
     case-insensitive fallback).

2. **Per-language config** (`scripts/configs/<language>.ts`) — declarative:
   - source root (mounted disc), MDB path, RTF/media folder names;
   - field-source map (e.g. French: `english` = hybrid[word→`1RtfEng`,
     sentence→`EngDictionary`], `headword` = column `ForeignRTF`,
     `memory_trigger_text` = `1RtfTrg` keyed by `FileFgnTrigger`);
   - course list + ICC/`ProductFlag` rules; target-course name overrides
     (e.g. keep `Vocab #1`).
   - A **`french.ts`** config captures everything in this plan; an
     **`italian.ts`** config reproduces today's behaviour (regression anchor).

3. **`scripts/import-legacy-database.ts`** — refactored to drive off (1)+(2):
   - Reads a `--language <name>` config, resolves every field via the
     field-source resolver, builds the same in-memory `WordInsert[]` it builds
     today, then runs the **unchanged** insert/lesson_words/relationship/count
     logic.
   - Existing helpers (`sanitizeText`, `cleanLemma`, `cleanFilename`,
     `parseTags`, `safeParseInt`) move under `scripts/lib/legacy-import/` and are
     reused.
   - Backwards compatible: the Italian config must produce an identical import
     (verify against current DB counts before/after).

**Migration order keeps risk low:** land the capability modules + configs with
the Italian config first (prove no regression via `--dry-run` diff), then add
the French config.

*Alternative considered & rejected:* a standalone French preprocessing script
emitting an enriched CSV. Simpler short-term but throws away the reusability O-1
asks for and forks logic per language. The config/adapter approach keeps one
code path and makes language #3 cheap.

## 9. Edge cases (the "states")

- **Missing RTF file / blank key** → English falls back to `EngDictionary`;
  trigger falls back to empty (no trigger).
- **Blank english or headword after derivation** → skip row (as today).
- **Encoding**: source is Windows-1252; decode accordingly, then `sanitizeText`.
- **Duplicate `RefN`** → last-wins / dedupe; report count.
- **Lesson < 0** → import the word to its course but assign no lesson.
- **`Course = 0 / 999`** → skip (UI/non-content).
- **Re-runs**: import deletes existing French `words` (and their `lesson_words`/
  `word_relationships`) first, **keeping lessons** — matches the PDF and the
  Italian behaviour. Idempotent on `legacy_refn`.
- **"Too much data"**: long notes/sentences and large trigger text — no schema
  limit issues; verified text fields are unbounded.

## 10. Data & permissions

- Writes via **service-role** key (bypasses RLS) — script-only, never client.
- Tables touched: `courses`, `lessons`, `words`, `lesson_words`,
  `word_relationships`. New legacy columns already exist (`legacy_ref`,
  `legacy_lesson_id`, `legacy_refn`, `legacy_gender_code`,
  `legacy_image_suffix`).
- No guest-mode / RLS implications (offline data load).
- `--dry-run` supported end-to-end before any write.

## 11. Reuse

- Whole `import-legacy-database.ts` pipeline (courses→lessons→words→
  lesson_words→relationships→counts).
- `sanitizeText`, `cleanLemma`, `cleanFilename`, `parseTags`, `safeParseInt`.
- Formatted-text model in `parseFormattedText.tsx` + colour-migration approach
  for trigger highlights.
- Existing media scripts for the later deferred pass: `convert-swf-to-png.sh`,
  `upload-word-images.ts`, `upload-word-audio.ts`, `populate-word-images.ts`.

## 12. Risks & open questions

- **O-1 (architecture)** — ✅ **resolved**: generalise into reusable capability
  modules + per-language config (see §8), so future migrations inherit the
  French learnings. French is the first config; Italian config is the regression
  anchor.
- **O-2 (gender codes)** — ✅ **resolved**: 5/23 French codes mis-map today
  (~1,011 rows). Canonical-normalise at lookup time (backtick→curly apostrophe;
  strip periods only inside `(…)`; case-insensitive) fixes 4 of them (1,008 rows);
  the l' forms fold onto the canonical keys with **no rows added**. The one true
  divergence, `le/la` (FR `mf` vs IT `f`, 3 rows), gets a single explicit French
  row. After both: **0/23 mis-mapped**. See §6.
- **O-3 (trigger fidelity)**: how faithfully to reproduce colours — exact RGB vs
  a single "highlight" style. Recommend mapping to the app's existing highlight
  style rather than raw RGB.
- **O-4**: the PDF notes the DL→NL mapping "may contain errors"; spot-check a
  sample after import.
- **R-1 (headword source)** — ✅ **resolved**: use **inline `ForeignRTF`**.
  Evidence (1,924 matched): text identical for words; for sentences inline holds
  the full sentence while `1RtfFor` collapses to a keyword (so inline is
  *better*). Only 14/1,910 word rows carry meaningful partial colour (dual-gender
  `le/la` forms), which is redundant with the structured `gender` attribute.
  Reading `1RtfFor` is not worth it.

## 13. Verification checklist (before "done")

- [ ] **Gender mapping: 0/23 codes unmapped, 0 mis-gendered** (baseline: 5/23
  wrong / ~1,011 rows today → 1/23 after normalisation → 0/23 after the `le/la`
  fix; see §6). Dry-run must assert `Sentence`=sentence category, all `l’` forms
  carry gender, `le/la`=`mf`.
- [ ] Course counts: `Vocab #1` ≈ 1,147 words; `French Sentences` ≈ 897.
- [ ] Verbs predominantly `"to …"`; disambiguators present; sentences full.
- [ ] Trigger text populated for ~1,900 words, highlight preserved/rendered.
- [ ] Lesson↔word ordering sane; `word_count` per lesson correct.
- [ ] `LinkN` relationships resolve both directions.
- [ ] Legacy file-name refs stored for the later media pass.
- [ ] `--dry-run` clean; Italian import still works (no regression).
- [ ] `npm run lint` passes; no dead code.
- [ ] Spot-check ~20 words + ~10 sentences against the running DL app / RTF.

## 14. Implementation order (on approval)

1. Extract shared helpers into `scripts/lib/legacy-import/` + add the
   capability modules (`rtf.ts`, `field-source.ts`, `course-mapping.ts`,
   `gender-codes.ts`).
2. Refactor `import-legacy-database.ts` to drive off a `--language` config; add
   the **Italian** config and prove **no regression** (`--dry-run` diff vs
   current DB counts).
3. Add canonical gender-code normalisation in `gender-codes.ts` (apostrophe +
   in-paren period strip + case-insensitive); no mapping rows added (§6).
4. Author the **French** config (field-source map, `ProductFlag` rules,
   `Vocab #1` override) and `--dry-run`; inspect resolved English/headword/
   trigger samples.
5. Real import; run the §13 checklist.
6. (Later) media conversion + hosting pass for French.
