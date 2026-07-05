# Memory Trigger Videos — allow MP4 clips (with image fallback) as memory triggers

Source of truth for adding **MP4 video** support to memory trigger media. Today a memory
trigger is always a still image (`words.memory_trigger_image_url`, materialized from
`image_override_url` / an image group's `master_image_url`). This adds an **optional video**
alongside the existing image, so a word can show a short looping clip while keeping the image
as a poster/fallback.

## Goal
- A word (or an image **group**) can have an **MP4 video** as its memory trigger.
- The existing image is **retained as the poster/fallback** — never removed.
- Videos play **silent, looping, autoplay, inline** everywhere, with no per-instance config.
- Materialization + group→member fan-out work for video exactly as they do for the image.

### Decisions locked with user
- **Sound:** silent in **all** cases (no audio, ever, for now). This is what makes
  autoplay reliable on mobile and removes the user-gesture requirement.
- **Storage:** a **dedicated `word-videos` bucket** (not the shared `word-images` bucket).
  Rationale: a bucket-level `file_size_limit` + `video/mp4`-only `allowed_mime_types`
  enforces caps at the platform layer — the one asset type where unbounded uploads are a
  real cost/bandwidth risk. Images stay in `word-images`.
- **Columns:** **separate `*_video_url` columns** (not reusing `image_override_url` /
  `master_image_url`). This is what enables the image to serve as a fallback — a shared
  column would force image-OR-video per word. It also avoids sniffing "is this a video?"
  from a URL extension at render time.
- **Image groups:** **in scope** — groups can own a master video, fanned out to members,
  mirroring the master image.
- **Upload entry points:** **everywhere images can be edited** — both the admin CMS
  (`AdminWordEditModal`, `ImageGroupEditModal`) **and** the in-context study/test edit mode
  (`MemoryTriggerImageEditor` → `EditableImage`, wired through `StudyModeClient` +
  `TestModeClient`). Video upload + auto-poster must work in all of them.
- **No transcoding.** A representative production clip was profiled (`à l'étranger -
  overseas.mp4`): **931 KB**, 6.75s, **H.264 Main / yuv420p, 980×834**, faststart already in
  place (`moov` before `mdat`). It's already web-ready on every browser incl. iOS Safari, and
  under the 1000px image cap — so no ffmpeg.wasm and no server worker. Files arrive
  upload-ready. (Audio stripping is being handled **at source** by the user, not in-app; the
  `muted` attribute silences playback regardless.)
- **Bucket cap:** since real files are ~1 MB, set the `word-videos` `file_size_limit` to
  **5 MB** (5× headroom) rather than 20 MB.
- **Aspect / fit:** videos render **`object-contain`** (fit whole frame, **no crop**), not
  `object-cover`. Sample clips are near-square (980×834), so a 16:9 box letterboxes.
  **OPEN — letterbox bar colour deferred:** user will view a test MP4 in situ before deciding
  the bar fill (transparent / `#faf8f3` / white). Leave as-is until confirmed.
- **Poster/fallback:** **auto-generated at upload, client-side**, by grabbing a video frame
  **~1s in** (fallback to midpoint for clips shorter than ~1s) and encoding it to WebP via
  the **existing `processWordImage` canvas path** — no ffmpeg. One upload yields both the MP4
  (→ `word-videos`) and its matching poster still (→ `word-images`, sets `image_override_url`).
  The manual image upload remains as an override.

---

## User goal & entry points
- **Admin** uploads/replaces a trigger video on a word (`AdminWordEditModal` → Trigger tab)
  or on an image group (`ImageGroupEditModal` → master).
- **Learner** sees the clip auto-play silently wherever the trigger image renders today
  (study grid, word card, test/learning phases). If no video, behaviour is unchanged.

## States (design every one)
- **Empty / no video:** render the existing `memory_trigger_image_url` `<Image>` exactly as
  today. Nothing about the image-only path changes.
- **Video present:** render `<video>` with `poster={memory_trigger_image_url}`, autoplay/
  loop/muted/playsInline, `object-cover|contain` matching the current image classes.
- **Loading / buffering:** `poster` shows the still image until the first frame is ready —
  no layout shift (same aspect box as the image).
- **Error / unsupported codec / load failure:** fall back to the poster image. Implement via
  `<video>`'s `onError` → swap to `<Image>` (or rely on poster staying visible). Never show a
  broken-media box.
- **Reduced motion:** if `prefers-reduced-motion: reduce`, do **not** autoplay — show the
  static poster image instead. (Media query checked in the shared component.)
- **"Too much data":** bucket-level size cap (below) prevents oversized files; long/again
  irrelevant for a single clip.

## Interactions & copy (admin)
- Trigger tab gains a **"Trigger video (optional)"** upload block beneath the existing image
  upload, labelled: *"MP4 only, silent, loops automatically. The image above is shown as a
  fallback."*
- Actions: **Upload video**, **Replace video**, **Remove video** (clears the video URL,
  re-inheriting the group master video if the word is in a group).
- On the image group modal: same **master video** upload/replace/remove next to master image.
- Failure copy on rejected file: *"Please choose an MP4 video under {N} MB."*

## Responsive
- The `<video>` uses the same aspect container and `object-*` classes as the image it
  replaces at each site, so mobile/desktop layout is unchanged. `playsInline` prevents iOS
  from hijacking into fullscreen.

## Reuse
- Storage helper `uploadFileClient` (extended), `EntityType` values `words` / `image-groups`.
- The existing materialization-trigger pattern (`words_resolve_trigger_image()` +
  `word_image_groups_fanout()`) — cloned for video.
- `AdminFileUpload` component (extended with a `video` type).
- Design-system tokens/typography for the admin labels; no new utilities.

## Data & permissions
- New `word-videos` public bucket; **admin-only** write RLS mirroring the existing
  `word-images` storage policies. Public read.
- New nullable columns; RLS on `words` / `word_image_groups` unchanged (video URL is just
  another column on rows already covered by existing policies).
- Guest mode: read-only render path, unaffected.

---

## Data model

### New columns on `public.words`
```
video_override_url       text NULL   -- per-word override; NULL = inherit group master video
memory_trigger_video_url text NULL   -- materialized effective video URL (trigger-owned, read-only)
```
Mirrors the existing image pair (`image_override_url` → `memory_trigger_image_url`).

### New column on `public.word_image_groups`
```
master_video_url text NULL   -- shared master video for the group (nullable)
```

### Trigger logic (mirror the image triggers exactly)
Extend the **existing** functions rather than adding new ones, so image + video resolve in
one pass:

- **`words_resolve_trigger_image()`** — widen the `BEFORE INSERT OR UPDATE OF ...` column
  list to include `video_override_url`, and add:
  `NEW.memory_trigger_video_url := COALESCE(NEW.video_override_url, (SELECT master_video_url FROM word_image_groups WHERE id = NEW.image_group_id));`
  (Keep the existing image line.) Consider renaming is **not** required — leave the function
  name as-is to avoid churn; just extend its body + trigger column list.
- **`word_image_groups_fanout()`** — widen `AFTER UPDATE OF master_image_url` to
  `... OF master_image_url, master_video_url`, and add to the `UPDATE words SET ...`:
  `memory_trigger_video_url = COALESCE(video_override_url, NEW.master_video_url)`.

Result: setting/clearing a group master video rewrites every inheriting member's
`memory_trigger_video_url`; a per-word `video_override_url` recomputes just that row. A word
with neither keeps `memory_trigger_video_url = NULL` → renders image-only.

**No backfill** — every video column starts NULL; existing image behaviour is untouched.

---

## Migrations (`supabase/migrations/`, follow existing `2026…` timestamp naming)

1. **`..._word_videos_bucket.sql`** — create the `word-videos` storage bucket with
   `public = true`, `file_size_limit = 5242880` (**5 MB**), and
   `allowed_mime_types = ARRAY['video/mp4']`. Add the 3 admin write policies
   (INSERT/UPDATE/DELETE `WITH CHECK/USING (bucket_id = 'word-videos' AND public.is_admin())`),
   copied from `20260515055006_word_images_storage_policies.sql`. Public read implicit via
   public bucket (add an explicit `SELECT USING (bucket_id='word-videos')` if the images
   migration did).
2. **`..._word_video_columns.sql`** — add `words.video_override_url`,
   `words.memory_trigger_video_url`, and `word_image_groups.master_video_url`.
3. **`..._word_video_resolve_triggers.sql`** — `CREATE OR REPLACE` the two existing trigger
   functions with the widened bodies, and re-create the triggers with the widened `OF`
   column lists (drop + recreate the triggers so the new `OF` columns take effect).

Apply via `mcp__supabase__apply_migration`. No `execute_sql` data step needed.

---

## App layer

### Types
- Regenerate `src/types/database-generated.ts` (command in CLAUDE.md). Do **not** edit the
  barrel `database.ts`. Add/adjust any `Word` / `WordImageGroup` aliases in
  `src/types/aliases.ts` if they enumerate columns explicitly (they generally spread `*`).

### Storage (`src/lib/supabase/storage.client.ts`)
- Extend `StorageBucket` to `"word-images" | "audio" | "word-videos"` (line 8).
- Guard `processWordImage` so it **only** runs for `bucket === "word-images"` (already true
  at line 98 — video files skip it because they don't start with `image/`, and they land in
  a different bucket anyway). No video re-encoding: upload the MP4 as-is with
  `contentType: "video/mp4"`.
- Video path: `words/{wordId}/trigger.mp4` and `image-groups/{groupId}/master.mp4` via the
  existing `generatePath` (`entityType` reused: `words` / `image-groups`).
- Add lightweight client-side validation before upload (belt-and-braces over the bucket
  cap): reject non-`video/mp4` and files over 5 MB, returning a friendly `error`.
- **New helper `generatePosterFromVideo(file: File): Promise<File>`** — no ffmpeg. Load the
  MP4 into a hidden muted `<video>` (`preload="metadata"`), seek to
  `Math.min(1, duration / 2)` seconds, and on `seeked` draw the frame to a canvas capped at
  1000px wide, then `canvas.toBlob(b, "image/webp", 0.85)` — **the same MAX_WIDTH/QUALITY/
  format as `processWordImage`**. Returns a `poster.webp` `File`. On any failure, resolve to
  `null` so the admin can supply a still manually (never block the video upload).

### Validation — `src/lib/validations/admin.ts`
- Extend `createWordSchema`/`updateWordSchema` with
  `video_override_url: z.string().url().optional().nullable()`. Do **not** accept
  `memory_trigger_video_url` as input (trigger-owned).
- Extend `createImageGroupSchema`/`updateImageGroupSchema` with
  `master_video_url: z.string().url().optional().nullable()`.

### Mutations
- `src/lib/mutations/admin/words.ts` — `updateWord`/`createWord` accept `video_override_url`
  and pass it through. **Never** write `memory_trigger_video_url` directly (trigger owns it).
  `deleteWord` → ensure `deleteEntityFiles` also clears the `word-videos` object for the word.
- `src/lib/mutations/admin/imageGroups.ts` — `updateImageGroup` accepts `master_video_url`
  (after upload → fan-out). `deleteImageGroup` cleans the group's `word-videos` master too.

### Shared render component — `src/components/ui/TriggerMedia.tsx` (new)
Single source of truth so the silent/loop/poster defaults can't drift (locus test: this is a
reusable visual *state*, so it lives in the component, not per call site).
```
props: { imageUrl: string | null; videoUrl: string | null; alt: string;
         className?: string; sizes?: string }
```
Behaviour:
- No `videoUrl` (or `prefers-reduced-motion: reduce`, or after an `onError`) → render the
  existing Next `<Image>` exactly as today (image keeps its current per-site fit).
- Else render:
  `<video src={videoUrl} poster={imageUrl ?? undefined} autoPlay loop muted playsInline
   preload="metadata" className="object-contain" onError={fallbackToImage} />`
- `muted` + `autoPlay` + `playsInline` + `object-contain` are **hard-coded** — silent
  everywhere and **never crop** the clip (fit-in-area decision). No `controls`. Letterbox bar
  colour is an **open item** (see Decisions) — pending the user's visual test.

### Read-path render sites (swap `<Image>` → `<TriggerMedia>`)
Confirm exact lines during implementation; per current code:
- `src/components/WordCard.tsx` (~13, 30-37) — pass `videoUrl={word.memory_trigger_video_url}`,
  `imageUrl={word.memory_trigger_image_url}`. Note: image path is currently `object-cover`;
  video is always `object-contain` (won't crop the near-square clips).
- `src/components/study/WordGrid.tsx` (~54-75) — memory-trigger mode uses video + image.
  (Flashcard mode still image-only.)
- `src/app/(dashboard)/lesson/[lessonId]/test/TestModeClient.tsx` (~1849, 1929) — the
  memory-trigger image display swaps to `TriggerMedia`; keep flashcard mode untouched.
- Any other consumer of `memory_trigger_image_url` for the memory-trigger mode (grep to
  confirm none are missed).

Queries that `select("words(*)")` / `words(*)` already return the new columns automatically.
Confirm `WordWithDetails` type picks them up after regen.

### Admin UI
- **`AdminFileUpload`** (`src/components/admin/AdminFileUpload.tsx`) — add a `"video"` type
  whose default `accept` is `"video/mp4"` (keep `image/*` for `"image"`). Preview via a muted
  looping `<video>` thumbnail.
- **`AdminWordEditModal`** (`src/components/admin/AdminWordEditModal.tsx`) — Trigger tab
  (~917-924): add a second `AdminFileUpload type="video"` block for the **override video**.
  On submit (~515-524), for a selected video:
  1. `generatePosterFromVideo(file)` → if it returns a WebP, upload it via
     `uploadFileClient("word-images", poster, "words", wordId, "trigger")` and set
     `image_override_url` (unless the admin already supplied a manual still — manual wins).
  2. `uploadFileClient("word-videos", file, "words", wordId, "trigger")` → set
     `video_override_url`.
  Add **Remove video** (sets `video_override_url = null`; leaves the poster image in place).
  Seed previews from `memory_trigger_video_url` / `memory_trigger_image_url`. Copy under the
  block: *"MP4 only, silent, loops automatically. A thumbnail is generated from the video
  unless you upload your own image above."*
- **`ImageGroupEditModal`** (`src/components/admin/ImageGroupEditModal.tsx`) — add a master
  **video** upload beside the master image (~216-223): same two-step (auto-poster →
  `master_image_url` if none set, then `uploadFileClient("word-videos", file, "image-groups",
  groupId, "master")` → `updateImageGroup({ master_video_url })`). Member thumbnails
  (~329-338) keep showing the image poster.

---

## Verification
1. **Migrations apply** cleanly; `list_migrations` shows the 3 new entries; `word-videos`
   bucket exists with the size limit + `video/mp4` allowlist.
2. **Upload guards:** a non-MP4 or oversized file is rejected both client-side and by the
   bucket (`allowed_mime_types` / `file_size_limit`).
3. **Materialization (SQL):** set a word's `video_override_url` → `memory_trigger_video_url`
   equals it; set a group's `master_video_url` → all inheriting members'
   `memory_trigger_video_url` update in one statement; clear override → re-inherits; word with
   no video → `memory_trigger_video_url IS NULL`.
4. **Render:** a word with a video shows a silent looping clip in study grid, word card, and
   test memory-trigger mode; the whole frame is visible (**not cropped**, `object-contain`);
   poster image visible while buffering; word without a video is visually identical to today.
5. **Auto-poster:** uploading a video with no manual still populates `image_override_url` with
   a WebP grabbed ~1s in; uploading a manual still instead keeps that still.
6. **Fallback:** break the video URL → poster image shows, no broken box. With
   `prefers-reduced-motion`, the static image renders (no autoplay).
7. **Silent:** no audio plays in any surface, desktop or mobile; autoplay works on iOS
   Safari (muted + playsInline).
8. **Build/lint:** `npm run lint` and `npm run build` pass after type regen.

## Risks / notes
- **Bandwidth/cost:** videos are larger than WebP stills, but real files are ~1 MB (profiled
  above). The 5 MB bucket `file_size_limit` is the guard; revisit if libraries grow. No
  transcoding — production clips already arrive as web-ready H.264/faststart MP4.
- **Poster generation** depends on the browser decoding the MP4 in a hidden `<video>`; if it
  fails (`generatePosterFromVideo` → null) the video still uploads and the admin can add a
  still manually. Not a blocker.
- **Autoplay policy:** relies on `muted` — never remove it, or autoplay breaks on mobile and
  audio could surface (violating the silent decision). It's hard-coded in `TriggerMedia`.
- **Group delete:** already sets members' `image_group_id` to NULL; those members also lose
  the inherited master video (override-only survive) — the existing delete warning copy
  should mention video too.
- **Multiple concurrent autoplaying videos** in a grid (study) — use `preload="metadata"` and
  rely on `poster` to limit initial network cost; if perf suffers, gate autoplay to the
  in-view / focused card later (not in v1).
- **Column reuse rejected on purpose:** separate `*_video_url` columns are what make the
  image-as-fallback possible; do not collapse them into the image columns.
</content>
</invoke>
