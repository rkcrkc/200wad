# French Media Import Plan

Status: **DRAFT — awaiting sign-off**. Follows the text import (see `docs/FRENCH_IMPORT_PLAN.md`,
now complete: 1931 words / 172 lessons live in NL).

## 1. Goal & entry points

The French word rows currently store **legacy filename stems** in their media columns, not URLs.
This pass converts/uploads the source media to Supabase Storage and rewrites those columns to full
public HTTPS URLs, so the app (which already renders these columns as `<img src>` / `<audio src>`)
shows real French images and audio. No app code changes.

Run as a one-off script (`npx tsx`), service-role key, dry-run gated, idempotent.

## 2. Source of truth (verified)

French columns hold **exact** source stems → exact file resolution (no fuzzy matching, unlike Italian):

| Column | Resolves to | Folder prefix |
| --- | --- | --- |
| `memory_trigger_image_url` (+ `legacy_image_suffix`) | `{1}Pictures/{stem}.{swf\|gif\|jpg}` | always `1` (21Pictures empty) |
| `audio_url_english` | `{prefix}SoundEng/{stem}.mp3` | Vocab→`1`, Sentences→`21` |
| `audio_url_foreign` | `{prefix}SoundFor/{stem}.mp3` | Vocab→`1`, Sentences→`21` |
| `audio_url_trigger` | `{prefix}SoundTrg/{stem}.mp3` | Vocab→`1` (21SoundTrg empty) |

- Course→prefix: **Vocab #1 → `1`**, **French Sentences → `21`** (legacy ICC).
- Disc mounted read-only at `/Volumes/Disc`. Tools present: `swftools` (swfrender/swfcombine), `ffmpeg`.
- Image formats on disc (1Pictures, 1024 files): **swf 311** (need raster conversion), **gif 353**, **jpg 359**.
- Sentences reuse the keyword's vocab image, so many word rows share one source image file.

## 3. Collision risk with existing Italian media (the reason for §6 fork)

Italian already populated the shared public buckets:
- `word-audio` objects live at `{prefix}/{type}/file.mp3` with Italian prefixes `1` and `81`.
  French Vocab **also uses prefix `1`** → without namespacing, French audio would write into the
  **same `word-audio/1/...` namespace** as Italian.
- `word-images` Italian objects are bare filenames (`maladie.png`), so same-name cross-language
  files could clobber each other.

## 4. Approach — DECIDED

One **new config-driven importer** `scripts/import-legacy-media.ts`, driven by the same per-language
configs as the text importer (`scripts/configs/<lang>.ts`). Exact-key resolution. The existing
Italian scripts are left untouched (they already did their job); new languages are added by config,
not by editing live-tested code. SWF→PNG conversion reuses the `swfcombine -s 400` + `swfrender`
logic from `convert-swf-to-png.sh`, parameterised for the configured mount/folders.

Per word row:

1. **Images** — resolve `{1}Pictures/{stem}.{suffix}`.
   - `swf` → convert to PNG (swftools) into a temp dir, upload as `.png`.
   - `gif`/`jpg` → upload **as-is** (original bytes, correct content-type). *(fork 2: decided)*
   - Upload to `word-images/{lang}/…`; write public URL to `memory_trigger_image_url`.
2. **Audio** (3 columns) — resolve `{prefix}Sound{Eng|For|Trg}/{stem}.mp3`, upload to
   `word-audio/{lang}/{coursePrefix}/{type}/…`; write public URL to the matching column.
3. **Idempotent**: skip rows already holding an `http…` URL; skip storage objects that already exist
   (reuse their URL). Safe to re-run after partial failures.

Resolution is **exact-key** (stored stem + known suffix/prefix). A row whose source file is missing
on disc is logged and left unchanged (column keeps its legacy stem) rather than nulled.

### 4a. Storage layout — DECIDED (scales to many languages)

Shared existing buckets, each language self-isolated under its own slug folder. Italian stays at the
bucket root (untouched, legacy exception).

```
word-images/{lang}/{stem}.{png|gif|jpg}          e.g. word-images/french/maladie.gif
word-audio/{lang}/{coursePrefix}/{type}/{stem}.mp3  e.g. word-audio/french/1/english/go for a walk.mp3
```

- `{lang}` = config slug (`french`). `{coursePrefix}` = legacy ICC (`1` vocab, `21` sentences).
- The course→ICC prefix mapping comes from the language config (already encoded for the text import).
- Future languages: new config + same code path; no collisions by construction.

## 5. States to handle

- **Empty/first-time**: buckets exist (Italian created them); `french/` prefixes created on first upload.
- **Already done** (re-run): column already `http…` → skip; object already in bucket → reuse URL, still
  fix the column if it was left as a stem.
- **Missing source file**: log `MISSING`, leave column unchanged, continue.
- **SWF conversion failure**: log `CONVERT-FAIL`, leave column unchanged, continue (don't abort batch).
- **Too much data**: ~1900 image refs (dedup to ≤1024 unique uploads) + up to ~5.7k audio refs.
  Paged DB reads, per-file retries with backoff (pattern already in `upload-word-audio.ts`).

## 6. Decision forks — RESOLVED

- **Storage namespacing** → shared buckets, per-language slug folder (§4a).
- **Image format** → SWF→PNG; gif/jpg uploaded as-is.
- **Script structure** → one new config-driven `import-legacy-media.ts`; Italian scripts untouched.

## 7. Verification gate (before any write)

Dry-run prints: rows scanned, files that resolve OK, MISSING list, SWF-to-convert count, total
unique uploads per bucket, and a sample of source→storage-path→target-URL mappings. No writes until
the dry-run is reviewed and approved (same gate the text import used).

## 8. Out of scope

- No app/UI changes (columns already consumed as URLs).
- No changes to Italian objects.
- `flashcard_image_url` (separate Italian-only pipeline) untouched.
