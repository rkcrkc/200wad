# Flashcard Photo Import — Generalized Plan (German / Spanish / future)

> **Use this for the German and Spanish runs.** French is done and serves as the
> reference case — see `french_flashcard_plan.md` for the executed record and the
> correction history (the first French attempt imported the wrong images).

Script: **`scripts/import-flashcard-photos.ts`** (language-agnostic).

## What a "flashcard" actually is (learned the hard way on French)

There are **two** different image sets on the source discs. Do not confuse them:

| Set | Location | Named by | NL column |
|---|---|---|---|
| **Memory-trigger mnemonics** (cartoons) | loose `{n}Pictures/{foreign}.{swf,gif,jpg}` | the **FOREIGN** word | `memory_trigger_image_url` — **already imported** |
| **Flashcards** (plain photos) | `{n}Pictures/Flashcard/{english}.{jpg,swf}` | the **ENGLISH** headword | `flashcard_image_url` — **this import** |

The first French attempt sourced the loose foreign-named mnemonics and wrote them
into `flashcard_image_url` — wrong. It was rolled back (DB nulled, storage objects
deleted) and re-run against the real `Flashcard/` photos. **The importer here only
ever reads from `Flashcard/` folders.**

## Source layout

- The course discs exist as ISO images under
  `/Users/ryancrocombe/Documents/200WAD/COURSES/` (e.g. `Spanish 1.iso`,
  `Spanish 2.iso`, `German 1.iso`, …). Mount them with
  `hdiutil attach "<path>.iso"`, pass the mount points via `--discs`, and
  `hdiutil detach` when done. (French/Italian used physical discs at
  `/Volumes/Disc*`; either works — `findFlashcardDirs()` scans whatever `--discs`
  points at.)
- Spanish mounted at `/Volumes/Spanish1Bundle` + `/Volumes/Spanish2Bundle`. Note
  Spanish has **two distinct Flashcard sets**: `1Pictures/Flashcard` (course 1,
  mirrored across both bundles) and `2Pictures/Flashcard` (course 2, bundle 2
  only). The script indexes all of them; basename dedup collapses the mirror.
- Discs mount at `/Volumes/Disc` and `/Volumes/Disc 1` (often **mirrored** — the
  same `Flashcard/` set appears on both). The script dedupes mirrored copies by
  normalised basename, so double-mounting does not create false collisions.
- Flashcard photos live in `*Pictures/Flashcard/`. It is a **single flat,
  English-named set covering multiple courses** (1, 2, 21, 22) — not one folder
  per course. The script auto-discovers every `*Pictures/Flashcard` dir.
- **SWF files in `Flashcard/` are text word-cards** (the English word rendered in
  blue), not photos — they are skipped, counted, and left for manual assignment.
- Access DB (`MDB/Exceltra <Language>.mdb`, `General` table) is the **authoritative
  word→photo key** via its `FileEngSouRTF` column (see below), plus `Course` for
  reporting. The join to NL is `General.RefN` ↔ `words.legacy_refn`.

## Matching strategy

The MDB `General.FileEngSouRTF` column holds the **exact English-side filename base**
for each `RefN` — a deterministic pointer to the flashcard photo. This replaced the
original fuzzy English-text matching, which both under-matched (missed ~1,600 Spanish
photos) and mis-matched (e.g. `orange (colour)` → orange *fruit* photo).

1. `norm(s)` = NFKD accent-fold → lowercase → strip non-alphanumerics.
2. **Authoritative:** `resolvePhoto(FileEngSouRTF)` — `norm(FileEngSouRTF)` vs
   `norm(basename)`; when a key has >1 distinct basename (e.g. `break down` vs
   `breakdown`), prefer the exact case-insensitive filename.
3. **Safe fallback** (only when `FileEngSouRTF` is missing or a data glitch — e.g.
   `FileEngSouRTF='rainy'` for the `Today` calendar photo), both deterministic:
   - **a.** exact English == filename (`Today` → `today.jpg`)
   - **b.** strip `(...)` qualifiers from **both** sides and accept **only if it
     resolves to a single photo** (`policeman (slang)` → `policeman.jpg`,
     `food (groceries)` → `food (sustenance).jpg`). >1 candidate → skipped.
4. **SWF-only** (`Flashcard/` has only a text word-card) and **no-photo** (nothing
   on disc, e.g. proverbs) are reported separately and left NULL.

Anything not matched is left NULL — fillable later via the admin flashcard editor
(`docs/FLASHCARD_ADMIN_EDIT_PLAN.md`).

## Storage & DB write (idempotent)

- Upload each matched photo to `word-images/words/{uuid}/flashcard.jpg`
  (`upsert: true`, one object per word).
- `UPDATE words SET flashcard_image_url = :url WHERE id = :uuid AND
  flashcard_image_url IS NULL` — the NULL guard makes re-runs safe.

## Run procedure (per language)

```bash
# 1. Mount the language's discs, then dry-run and eyeball the report + CSV:
npx tsx scripts/import-flashcard-photos.ts --language german --dry-run
#    → writes docs/imports/german_flashcard_photo_plan.csv (no writes to DB)

# 2. Small live test, spot-check a few flashcard_image_url values in the app:
npx tsx scripts/import-flashcard-photos.ts --language german --limit 10

# 3. Full live run:
npx tsx scripts/import-flashcard-photos.ts --language german
```

Flags: `--language french|german|spanish` (required), `--dry-run`, `--limit N`,
`--discs /Volumes/Disc,/Volumes/Disc\ 1` (override auto-discovery).

## Pre-run checklist for German / Spanish

- [ ] Confirm the language's discs are mounted and `*Pictures/Flashcard/` exists.
- [ ] Confirm `MDB/Exceltra German.mdb` / `Exceltra Spanish.mdb` filename matches
      the `LANGUAGES` config in the script (adjust if the disc names it differently).
- [ ] Dry-run; sanity-check `Matched` vs the language's word count and skim the
      ambiguous/unmatched samples for obvious mis-normalisation.
- [ ] `--limit 10` live; open ~5 words in the app and verify the flashcard is a
      **photo**, not a mnemonic cartoon or a text word-card.
- [ ] Full run; record final counts in this doc.

## Language status

| Language | `language_id` | Flashcards | Status |
|---|---|---|---|
| French | `7d1ac2f6-97a3-4025-a325-fd449edb974f` | **1,835** | ✅ Done (deterministic; see `french_flashcard_plan.md`) |
| German | `7bb57c89-e01b-404b-a3d7-ab7d087ac925` | **3,869** | ✅ Done (deterministic; `German_ISO.iso` + `German 2.iso`) |
| Spanish | `39e8b5a2-269c-422e-9b84-06722b4f91ff` | **3,447** | ✅ Done (deterministic — `FileEngSouRTF`; 6 stale fuzzy nulled) |
| Italian | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | 1,924 | ✅ Done — verified complete (deterministic added 0) |

> **Italian note:** the 1,924 were imported by the older `import-flashcard-images.ts`
> (pre-built CSV) and verified correct (photos, not mnemonics). A deterministic
> `FileEngSouRTF` re-run against `Italian 1&2 Super Bundle.iso` matched only 1,671
> (the disc has ~911 flashcard photos) and set **0 net-new** — every match was
> already covered. So the 1,924 is complete for this source. The low coverage
> ratio (16% of 11,921 words) reflects that most Italian words are advanced-course
> entries with no pre-rendered flashcard photo, not a gap in the import.
> NB: the Italian volume is **case-sensitive** and names the folder `FlashCard`;
> `findFlashcardDirs()` now matches it case-insensitively.

> **Italian verified:** the Italian import sourced from the `1Pictures/FlashCard/`
> subfolder (English-named photos), not the loose mnemonics — the correct approach.
> Spot-checked live (e.g. `homework` = photo of a boy studying, while its
> `memory_trigger_image_url` is the "COMPETE! COME PITY me!" mnemonic cartoon).
> No rollback needed.
