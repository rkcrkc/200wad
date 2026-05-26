# Flashcard Image Import — Dry Run Report

> **Status: COMPLETED ✅** — see [Migration results](#migration-results) at the bottom for the actual run.

Generated against the Italian course (`language_id = a1b2c3d4-e5f6-7890-abcd-ef1234567890`).

## Sources

| Item | Value |
|---|---|
| Image directory | `/Volumes/Italian 1&2 SuperBundle/1Pictures/FlashCard` |
| CSV | `/Users/ryancrocombe/Documents/200WAD/DB IMPORT/General.csv` |
| Join keys | CSV `RefN` ↔ `words.legacy_refn` (exact match) |
| Filename source | CSV `FileEngSouRTF` + extension (lookup is case-insensitive) |

## Source inventory (1,053 files)

| Extension | Count |
|---|---|
| `.jpg` (lowercase) | 888 |
| `.JPG` (uppercase) | 23 |
| `.swf` | 141 |
| `.db` (`Thumbs.db`) | 1 |
| **Total** | **1,053** |

(Finder reports 1,054 — single-item phantom; `os.listdir`, `os.walk`, and BSD `find` all agree on 1,053. No hidden files; ISO is read-only so no `.DS_Store`.)

## Match results

| Category | RefNs | Action |
|---|---|---|
| Has a matching `.jpg` | **1,671** | Upload as-is to `word-images/words/{uuid}/flashcard.jpg` |
| Has only a matching `.swf` | **253** | Convert SWF→PNG @ 4× via swftools, then upload to `word-images/words/{uuid}/flashcard.png` |
| No image at all | 10,207 | Skip (intentional — grammar tips, intro pages, vocab without flashcards) |
| **Subtotal matched** | **1,924** | All exist in `words` table (verified 1924/1924) |

### By DB category × image kind

| `words.category` | `.jpg` | `.swf` |
|---|---|---|
| `word` | 910 | 141 |
| `sentence` | 761 | 112 |

(Per your instruction: both `word` and `sentence` rows get the same image URL.)

### Shared images
- **1,051** distinct image files cover 1,924 word/sentence rows.
- **873** images are referenced by 2 RefNs each — every one is a word↔sentence pair (e.g. RefN `2` "above" + RefN `10002` "(I)'ve left the book on top of the table.").
- Storage upload happens once per file; the URL is then written to both rows.

### Orphan files
Only **1** file is in the directory but not referenced by any RefN:
- `to stay in bed ,v.jpg`

Will not be uploaded. Worth a manual check — likely a duplicate of "stay in bed" already covered.

## Upload budget

| Stage | Volume |
|---|---|
| JPGs to upload (direct) | 37.3 MB across 1,671 files |
| SWFs to convert | 653 KB → est. 5–9 MB PNG output (253 files) |
| Total Supabase Storage write | ~45 MB |
| Bucket `word-images` per-file limit | 10 MB (max source JPG: 305 KB ✅) |

## Storage paths

Convention follows `src/lib/supabase/storage.ts:30`:

```
word-images/words/{word_uuid}/flashcard.jpg   (or .png for converted SWFs)
```

Public URL format:
```
https://<project>.supabase.co/storage/v1/object/public/word-images/words/{uuid}/flashcard.{ext}
```

## DB writes

For each matched RefN:

```sql
UPDATE words
SET flashcard_image_url = '<public_url>'
WHERE legacy_refn = <refn>
  AND language_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND flashcard_image_url IS NULL;  -- idempotent guard
```

Currently 0 of 11,925 Italian words have a `flashcard_image_url` → no overwrite collisions on first run.

## Edge cases & flags

| # | Issue | Plan |
|---|---|---|
| 1 | 4 Italian words have NULL `legacy_refn` | Can't join via RefN. Confirmed they have no flashcard in CSV either. Skip. |
| 2 | 23 source files use uppercase `.JPG` | Normalise to lowercase `.jpg` at upload. |
| 3 | Filenames contain commas, spaces, parens, slashes | Not used in destination path — we rename to `flashcard.{ext}` per word UUID. |
| 4 | 873 word↔sentence pairs share one image | Upload once per word_uuid (both rows get distinct URLs pointing to their own folder copy). Trade-off: ~36% more storage but avoids cross-row coupling and matches existing path convention. **Alternative:** point both rows at the "word" row's URL (saves storage, but `sentence` row has no copy under its own UUID). |
| 5 | 1 orphan file `to stay in bed ,v.jpg` | Not uploaded. Add to manual review list. |

> **Decision needed on item 4** — confirm "upload once per word_uuid, even when image is shared" (recommended, simpler ownership) vs "upload once, share URL across rows" (saves ~12 MB).

## Files written

- `docs/imports/flashcard_import_plan.csv` — full mapping (1,924 rows): legacy_refn, category, source_filename, source_size, kind, english, headword, target path template.
- `docs/imports/flashcard_refns.txt` — comma-separated RefN list (for SQL batching).
- `docs/imports/flashcard_dry_run_report.md` — this report.

## Proposed next steps (awaiting your green light)

1. Decide on item #4 (shared image: upload-twice vs share-URL).
2. Run SWF→PNG conversion for the 253 SWF-only entries (using swftools at 4× per existing `scripts/convert-swf-to-png.sh` approach).
3. Implement upload + DB update script as `scripts/import-flashcard-images.ts`:
   - Reads `flashcard_import_plan.csv`
   - For each row: resolve word_uuid by `legacy_refn`, upload file to storage, update `words.flashcard_image_url`.
   - Idempotent (skips rows where `flashcard_image_url IS NOT NULL`).
   - Batches and logs.
4. Spot-check 10 random uploaded URLs in browser.
5. Optional: doc the `NL = "new DB" / 200WAD app` shorthand in `CLAUDE.md` so future agents don't need to ask.

---

## Migration results

Executed via `scripts/import-flashcard-images.ts` against the live Supabase project. Committed in `b0ea6ad`.

### Decisions applied

| # | Item | Decision |
|---|---|---|
| 4 | Shared word↔sentence images | **Option (b)** — upload once per primary `word_uuid` and write the same public URL to every shared `legacy_refn` (word + sentence rows). Saves ~12 MB of storage and avoids duplicate objects. |
| — | SWF conversion | swftools (`swfcombine --dummy -s 400` + `swfrender`) for 140/141 files. One file (`in the middle of ,prep.swf`) failed `rfxswf` with "No JPEG library compiled in" — recovered via `swfextract -j 3` + `sips -s format png`. All 141 PNGs produced. |
| — | Filenames | Lowercased `.JPG` → `.jpg` at upload; case-insensitive lookup for CSV→file resolution. |
| — | Storage path | `word-images/words/{primary_word_uuid}/flashcard.{jpg\|png}`. |
| — | Idempotency | Per-row `flashcard_image_url IS NULL` guard; storage `upsert: true`. Re-runs are safe. |

### Execution

| Stage | Result |
|---|---|
| Mode | LIVE (full run after a 10-row test batch verified end-to-end) |
| Plan rows processed | 1,051 unique images |
| RefNs touched | 1,924 / 1,924 resolved to `word_uuid` |
| Files uploaded | **1,041** (10 already uploaded by the test batch were skipped as `all refns already have URL`) |
| Files skipped (already populated) | 10 |
| Upload failures | 0 |
| Word rows updated | **1,905** (+19 from the test batch = **1,924 total**) |
| DB update errors | 0 |
| Missing source files | 0 |
| Missing word UUIDs | 0 |

### Post-import verification

Query against the live `words` table:

```sql
SELECT
  COUNT(*) FILTER (WHERE flashcard_image_url IS NOT NULL) AS with_image,
  COUNT(*)                                                AS total,
  COUNT(*) FILTER (WHERE flashcard_image_url IS NOT NULL AND category = 'word')     AS words_with_image,
  COUNT(*) FILTER (WHERE flashcard_image_url IS NOT NULL AND category = 'sentence') AS sentences_with_image
FROM words
WHERE language_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
```

| Metric | Value |
|---|---|
| Italian rows with `flashcard_image_url` | **1,924** |
| Total Italian rows | 11,925 |
| `category = 'word'` with image | 966 |
| `category = 'sentence'` with image | 892 |
| Other categories with image | 66 (`fact` 44, `phrase` 17, `information` 5) — these share RefNs with images and got the URL via the shared-refn fan-out |

Coverage matches the plan's 1,924 target exactly.

### Issues encountered & resolved

| Issue | Resolution |
|---|---|
| `swfrender` failed on 1 of 141 SWFs (no compiled JPEG lib) | Extracted embedded JPEG with `swfextract -j 3`, converted to PNG with `sips`. |
| First version of `updateWords` used `.select("*", { count: "exact", head: true })` after `UPDATE` and reported `0` regardless of actual rows changed | Switched to `.select("id")` and counted `data?.length`. Underlying writes were never wrong — only the log counter. |
| User report of `404 Bucket not found` on a sample URL | URL was mangled in chat (`word-i%20%20%20mages`) via copy-paste line-wrap. Real bucket `word-images` returns HTTP 200; no action needed. |
| Finder showed 1,054 files vs `find`/`os.listdir` showing 1,053 | Phantom Finder item; verified across three independent enumerations. No data impact. |

### Artifacts committed (`b0ea6ad`)

- `docs/imports/flashcard_dry_run_report.md` — this report (now includes migration results).
- `docs/imports/flashcard_import_plan.csv` — per-RefN plan (1,924 rows).
- `docs/imports/flashcard_upload_plan.csv` — per-upload plan (1,051 rows, one row per unique source image with `all_legacy_refns` fan-out list).
- `docs/imports/flashcard_refns.txt` — comma-separated RefN list (for SQL batching / spot-checks).
- `scripts/import-flashcard-images.ts` — idempotent uploader. Safe to re-run.
- `CLAUDE.md` — added Glossary entry documenting `NL = new DB`.
