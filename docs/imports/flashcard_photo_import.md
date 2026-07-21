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

- Discs mount at `/Volumes/Disc` and `/Volumes/Disc 1` (often **mirrored** — the
  same `Flashcard/` set appears on both). The script dedupes mirrored copies by
  normalised basename, so double-mounting does not create false collisions.
- Flashcard photos live in `*Pictures/Flashcard/`. It is a **single flat,
  English-named set covering multiple courses** (1, 2, 21, 22) — not one folder
  per course. The script auto-discovers every `*Pictures/Flashcard` dir.
- **SWF files in `Flashcard/` are text word-cards** (the English word rendered in
  blue), not photos — they are skipped, counted, and left for manual assignment.
- Access DB (`MDB/Exceltra <Language>.mdb`, `General` table) is used only for
  optional `Course`/`EngDictionary` reporting + a fallback match key. The join to
  NL is `General.RefN` ↔ `words.legacy_refn`.

## Matching strategy

Match NL `words.english` to a photo basename by normalised English:

1. `norm(s)` = NFKD accent-fold → lowercase → strip non-alphanumerics.
2. **Exact** filename match (`norm(english) == norm(basename)`) wins outright.
3. Fallback candidate keys, each accepted **only if it maps to exactly one
   distinct photo**:
   - `norm(stripParen(english))` — drop `(...)` qualifiers
   - `norm(baseEng(mdb.EngDictionary))` — drop trailing grammar tags (`, n.`,
     `, adj.`, …) and parentheticals
4. **Ambiguous** keys (a stripped name mapping to >1 distinct photo, e.g.
   `friend` → `friend (male)` + `friend (female)`) are **skipped** and reported.

Anything not matched (word has no pre-rendered photo) is simply left NULL —
fillable later via the admin flashcard editor (`docs/FLASHCARD_ADMIN_EDIT_PLAN.md`).

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
| French | `7d1ac2f6-97a3-4025-a325-fd449edb974f` | **1,010** | Done (see `french_flashcard_plan.md`) |
| German | `7bb57c89-e01b-404b-a3d7-ab7d087ac925` | 0 | Pending — discs not yet mounted |
| Spanish | `39e8b5a2-269c-422e-9b84-06722b4f91ff` | 0 | Pending — discs not yet mounted |
| Italian | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | 1,924 | ⚠️ Verify — may have the same mnemonic-as-flashcard bug |

> **Italian flag:** the Italian import predates this correction and has 1,924
> `flashcard_image_url` rows. Before trusting them, spot-check a few in the app to
> confirm they are photos, not the memory-trigger mnemonics. If wrong, roll back
> the same way French was and re-run this script (Italian would need a `LANGUAGES`
> entry added).
