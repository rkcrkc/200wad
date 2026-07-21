# Flashcard Image Admin Edit — Upload / Replace / Remove (spec, SIGNED OFF)

> Goal: give admins the same in-context image editing for the **flashcard**
> picture that already exists for the **memory-trigger** picture, reusing the
> same components and mutation patterns. Today the flashcard is display-only
> (`FlashcardCard`); `flashcard_image_url` is never written from the app.
>
> **Build after the full French flashcard import finishes and is verified.**

## Signed-off decisions

1. **Isolation:** independent per row (unique-filename on every upload). Editing
   a headword's flashcard changes only that row; its example sentence keeps the
   old photo, and vice-versa. Nothing is shared/leaked after an edit.
2. **Share caption:** include the "Also used by N word(s)" caption.

## What the shared rows actually are (verified)

Example sentences are stored as rows in the **`words`** table
(`category = 'sentence'`) with their own `legacy_refn`, and they carry their own
`flashcard_image_url` **and** `memory_trigger_image_url`. The legacy French
course reused **one photo as the flashcard for both a headword and its example
sentence**, so the importer wrote the same flashcard URL onto both rows (hosted
under the headword = primary word's UUID). Their memory-trigger images are
separate and untouched. The 1,603 two-refn shares are exactly these
headword ↔ example-sentence pairs.

## How flashcards differ from memory-trigger (why we can't copy 1:1)

| | Memory-trigger | Flashcard |
|---|---|---|
| Column | `memory_trigger_image_url` is **materialized** by DB triggers | `flashcard_image_url` is a **plain text column**, no triggers |
| Sharing model | Structural: `image_group_id` → group `master_image_url`, with per-word `image_override_url` | None. The importer just **copied the same URL string** into each sharing row |
| Editor | Two tiles (This word / Concept) when grouped; one tile when one-off | One tile only — there is no group concept |
| "Remove" | Really "reset to concept" (clears override) | True removal: set the column to `NULL` |

Because flashcards have no group model, the flashcard editor mirrors the
**one-off** (non-group) half of `MemoryTriggerImageEditor`: a single
`EditableImage` tile + a remove control.

## User goal & entry points

- **Goal:** an admin viewing a word wants to add, replace, or remove that word's
  flashcard photo without leaving the word view.
- **Entry point:** admin edit mode, flashcard image mode, in exactly the places
  the memory-trigger editor already appears — the word preview sidebar
  (`WordDetailSidebar` → `WordDetailView`) and the study/test edit surfaces.
  Currently `WordDetailView` renders a read-only `<FlashcardCard>` when
  `imageMode === "flashcard"`; in `isEditMode` it will instead render a new
  `FlashcardImageEditor`.

## Interactions & copy

- **Upload / Replace:** reuse `EditableImage` (hover overlay + drag-and-drop,
  spinner, inline error). Button label is already `Upload`/`Replace` driven by
  presence of `src`. Accept `image/*` (the flashcard tile does **not** accept
  MP4 — flashcards are stills).
- **Remove:** a text button under the tile styled like the existing
  "Reset to concept pic" button (icon + `text-xs-medium text-primary`), labelled
  **"Remove flashcard"**. Opens a `ConfirmModal`:
  - Title: "Remove this flashcard?"
  - Message: "This clears the flashcard photo for **this word only**. The image
    file is kept in storage in case other words use it."
  - Confirm: "Remove flashcard".
  Only shown when the word currently has a flashcard.
- **Shared caption (recommended):** under the tile show
  "Also used by N other word(s) — changes here affect only this word." mirroring
  the memory-trigger "Shared by N words" caption. This makes the blast radius
  explicit and reassures the admin that per-word edits are isolated. `N` = count
  of words in the same language sharing this `flashcard_image_url`.

## States

- **Empty / first-time (no image):** `EditableImage` placeholder (🖼️) with the
  "Upload image" overlay on hover. No Remove button. No shared caption.
- **Loading (uploading):** `EditableImage` spinner + "Uploading…".
- **Error:** `EditableImage` inline "Upload failed…" message (existing behaviour).
- **Success:** optimistic swap of the tile to the new image; Remove button and
  shared caption appear/update.
- **"Too much data":** N/A for a single still. Long `english` only feeds the
  `alt` attribute.

## Isolation — resolving the shared-image edge case

The importer uploads one object under the **primary** word's UUID
(`words/{primary}/flashcard.{jpg|png}`) and writes that URL into every sharing
row. So a naïve replace that upserts the same `flashcard.*` path on the primary
word would overwrite the shared object and change it for the siblings too.

**Decision (recommended):** on every flashcard upload/replace, write to a
**per-edit unique filename** — `fileType = "flashcard-" + Date.now()` — so the
edited word's column points at a brand-new object and the shared original is
never mutated. This makes per-word flashcard edits fully isolated regardless of
the import's duplicated-URL origin. (`uploadFileClient` re-encodes word images to
WebP ≤1000px, so the new object is e.g. `words/{id}/flashcard-1699999999.webp`.)

**Remove** never deletes the storage object (siblings may still reference it);
it only nulls this row's column.

## Reuse

- `EditableImage` (`src/components/admin/EditableImage.tsx`) — upload/replace UI.
- `ConfirmModal` (`src/components/admin/AdminModal`) — remove confirmation.
- `uploadFileClient` (`src/lib/supabase/storage.client.ts`) — client upload +
  WebP re-encode; call with bucket `word-images`, entity `words`, entityId
  `word.id`, fileType `flashcard-{ts}`.
- Handler pattern mirrors `handleWordImageUpload` in `WordDetailSidebar`.
- New mutation `setWordFlashcardImage(wordId, url | null)` mirrors
  `setWordImageOverride` (requireAdmin + `createAdminClient`, plain update,
  `revalidatePath`). Lives in `src/lib/mutations/admin/words.ts`.

## Components / files to add or touch

1. **New** `src/components/study/FlashcardImageEditor.tsx` — single-tile editor
   (EditableImage + Remove button + ConfirmModal + shared caption). Mirrors
   `MemoryTriggerImageEditor` minus the group tile.
2. **New mutation** `setWordFlashcardImage(wordId, url|null)` in
   `src/lib/mutations/admin/words.ts`.
3. **`WordDetailSidebar.tsx`** — add `handleFlashcardUpload(file)` and
   `handleFlashcardRemove()` (optimistic `setLocalWord({ flashcard_image_url })`),
   pass down.
4. **`WordDetailView.tsx`** — in the `imageMode === "flashcard"` branch, when
   `isEditMode`, render `FlashcardImageEditor` instead of `FlashcardCard`; thread
   the two new props (plus optional share count).
5. **(Optional)** share-count query: `select count(*) from words where
   flashcard_image_url = :url and language_id = :lang`.

## Data & permissions

- Writes `words.flashcard_image_url` (plain text; no triggers to consider).
- Mutation is `requireAdmin` + service-role client, matching the memory-trigger
  override mutations.
- Admin-only surface (gated by `isEditMode`/`isAdmin`); no guest-mode path.
- Storage bucket `word-images`, path `words/{wordId}/flashcard-{ts}.webp`.

## Responsive

Single full-width tile; stacks cleanly on mobile exactly like the one-off
memory-trigger case. Remove button and caption sit beneath the tile.

## Quality checklist (to verify at implementation)

- [ ] States: empty, uploading, error, success all handled by `EditableImage`.
- [ ] Remove confirm dialog; keyboard (Esc/Enter) + focus ring via `ConfirmModal`.
- [ ] Optimistic update reflects immediately; failure surfaces the error.
- [ ] Editing one shared word leaves siblings untouched (unique-filename).
- [ ] Admin-gated mutation; no off-palette colours / new typography utilities.
- [ ] `npm run lint` passes.

