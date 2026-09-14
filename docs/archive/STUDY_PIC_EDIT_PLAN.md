# Study/Test Pic Editing Plan

In-context editing of concept pics and per-word pic overrides from study and test
mode (admins only).

## Background

Concept pics and per-word overrides are currently editable only via the Admin CMS.
The in-context edit *plumbing* exists in study/test (`MemoryTriggerCard` renders
`EditableImage` when `isEditMode` is on), but it writes to the wrong field:
`handleImageUpload` calls `updateWord(id, { memory_trigger_image_url })`, and that
column is a materialized column owned by a DB trigger — `updateWord` deliberately
does not persist it. So the edit appears to work locally but is lost on reload.

### Data model recap

- `word_image_groups.master_image_url` — the shared "concept pic". Editing fans out
  (DB `word_image_groups_fanout` trigger) to every member word that has no override.
- `words.image_group_id` — group membership (NULL = one-off word).
- `words.image_override_url` — per-word override (NULL = inherit group master).
- `words.memory_trigger_image_url` — materialized effective URL, owned by a DB
  trigger. Read-only; must not be written directly.

### Existing mutations (all `requireAdmin`)

- `setWordImageOverride(wordId, url | null)` — set/clear per-word override.
- `updateImageGroup(groupId, { master_image_url })` — replace concept pic (fans out).
- `getImageGroupMembers(groupId)` — member list (for member count).

## Decisions (signed off)

- **Audience:** admins only (existing `isEditMode` / `isAdmin` gate).
- **Edit scope:** two separate controls (Option C).
- **Layout:** side-by-side panel in edit mode.
- **Reset:** include a "Reset to concept pic" action for grouped words with an override.

## Design

### Two controls on `MemoryTriggerCard` (edit mode only)

Replace the single `EditableImage` with two labelled tiles:

1. **"This word"** → `setWordImageOverride(wordId, url)`. Shows the word's effective
   pic. When a grouped word has an override, a **"Reset to concept pic"** link clears
   it (`setWordImageOverride(wordId, null)`).
2. **"Concept · shared by N words"** → `updateImageGroup(groupId, { master_image_url })`.
   Only rendered when `image_group_id` is set. Shows the master thumbnail + group label.

- One-off words (no group): only the "This word" tile, full width.
- Non-edit mode: unchanged — single image as today.
- Mobile: tiles stack vertically.

### States

- One-off word (no group): only control #1.
- Grouped, inheriting (no override): big image shows the master; #1 = "Replace just
  this word", #2 = the shared concept pic.
- Grouped, has override: image shows the override; show "Reset to concept pic".
- Loading: per-control spinner (reuse `EditableImage` uploading state).
- Error: inline message (reuse existing pattern).
- Empty (no pic anywhere): existing placeholder, still uploadable.

### After-save refresh

- Override edit → patch the current word's effective `memory_trigger_image_url` in
  `localWords`.
- Concept edit → patch **every loaded word sharing that `image_group_id`** with no
  override (the fan-out changed them all).

## Plumbing

- New `getWordImageContext(wordId)` server action returning
  `{ groupId, groupLabel, memberCount, masterImageUrl }` (reuses `getImageGroupMembers`).
- Wire it into Study + Test clients; pass context into `MemoryTriggerCard`.
- Fix `handleImageUpload` in `StudyModeClient` and `TestModeClient` to route through
  `setWordImageOverride` / `updateImageGroup` instead of `updateWord({ memory_trigger_image_url })`.

## Touched files

- `src/components/study/MemoryTriggerCard.tsx`
- `src/app/(dashboard)/lesson/[lessonId]/study/StudyModeClient.tsx`
- `src/app/(dashboard)/lesson/[lessonId]/test/TestModeClient.tsx`
- `src/lib/mutations/admin/imageGroups.ts` (or a new query file) — add `getWordImageContext`
- Possibly a small two-tile wrapper around `EditableImage`

All mutations already `requireAdmin`; no new tables; overrides stay global on `words`.

## Quality checklist

- [ ] All states implemented (one-off, inheriting, override, loading, error, empty).
- [ ] Concept edit fans out in UI to all loaded sibling words without an override.
- [ ] Long group labels / many members don't break the tile layout.
- [ ] Mobile: tiles stack.
- [ ] Admin-only; mutations `requireAdmin`.
- [ ] Reuses `EditableImage`, existing mutations, design tokens.
- [ ] `npm run lint` passes; no dead code (old no-op `updateWord` image path removed).
