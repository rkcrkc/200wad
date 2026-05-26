# Flashcard Image Import — Dry Run Report

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
