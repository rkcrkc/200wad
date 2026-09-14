# French Flashcard Image Import — Executed Record

> **Status: DONE.** French has **1,010** flashcard photos imported. This doc is the
> corrected record of what actually happened, including a wrong first attempt that
> was fully rolled back. For the generalized procedure German/Spanish will follow,
> see `flashcard_photo_import.md`.

Target: **French** (`language_id = 7d1ac2f6-97a3-4025-a325-fd449edb974f`), 3,829
words carrying `legacy_refn`.

## What went wrong first (and the fix)

The initial importer (`scripts/import-french-flashcards.ts`, now retired) sourced
the loose `{n}Pictures/{french}.{swf,gif,jpg}` files — named by the **French**
word — and wrote them into `flashcard_image_url`. Those files are the
memory-**trigger** mnemonic cartoons (already stored in `memory_trigger_image_url`),
**not flashcards**. Discovered when a side-by-side comparison showed the imported
image was a cartoon while the pre-rendered `Flashcard/good morning.jpg` was a plain
photo.

**Rollback performed:**

- Confirmed all 3,591 French `flashcard_image_url` writes matched the
  `words/{uuid}/flashcard.%` pattern and 0 were pre-existing.
- Nulled the column for all French rows (verified 0/3,829).
- Deleted the 1,963 orphaned storage objects.

## What flashcards actually are

The real flashcards are plain **photos** in `1Pictures/Flashcard/`, named by the
**ENGLISH** headword (e.g. `good morning.jpg`, `goodbye.jpg`). It is a single flat,
English-named set covering **multiple courses** (1, 2, 21, 22) — the folder is
identical on both discs (mirrored: 953 jpg + 96 swf = 1,049 files each).

- **SWF files in `Flashcard/` render to the English word as blue TEXT**, not a
  picture — excluded from the import.
- Access `General` (`MDB/Exceltra French.mdb`) provides `Course`/`EngDictionary`
  for reporting + a fallback match key only. Join: `General.RefN` ↔
  `words.legacy_refn`.

## Corrected import (executed)

Matched NL `english` → `Flashcard/*.jpg` basename by normalised English
(NFKD accent-fold → lowercase → strip non-alphanumerics), with parenthetical- and
grammar-tag-stripped fallbacks accepted only when unambiguous. Ambiguous stripped
keys (e.g. `friend` → male/female) were skipped for manual assignment.

| Batch | Result |
|---|---|
| Course-1 photos | 942 uploaded, 937 DB-updated |
| Course-2+ photos (72×c2, 3×c21, 1×c22) | 68 of 76 imported; 8 ambiguous excluded |
| **Total French flashcards** | **1,010** |

Verified live: `goodbye` shows a photo (man in a truck), not the old cartoon.

Left for manual assignment via the admin editor
(`docs/FLASHCARD_ADMIN_EDIT_PLAN.md`):

- ~41 ambiguous stripped-key collisions (gender/variant pairs).
- 96 SWF text-cards (no photo exists).
- Words with no pre-rendered photo at all (most of the 3,829).

## Storage & DB write (idempotent)

Path: `word-images/words/{word_uuid}/flashcard.jpg`

```sql
UPDATE words SET flashcard_image_url = :url
WHERE id = :uuid AND flashcard_image_url IS NULL;  -- idempotent guard
```

## Re-running / verifying French

The generalized script reproduces this via a dry-run (mirrored discs are deduped
by basename, so it correctly indexes ~952 photos, not double):

```bash
npx tsx scripts/import-flashcard-photos.ts --language french --dry-run
# → Indexed 952 JPG photos; Matched 979; Ambiguous 41; writes
#   docs/imports/french_flashcard_photo_plan.csv
```

(The live DB's 1,010 is slightly above the dry-run's 979 matched because the
stricter generalized script now flags 41 keys as ambiguous rather than silently
picking one — the safer behaviour going forward.)
