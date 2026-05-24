# Word Relationships UI — Surfacing `word_relationships` rows

A working log of the change that wires the `word_relationships` table into
the study sidebar, the test sidebar, and the word detail view. Renders
each row as a clickable card grouped by `relationship_type`.

## Goal

Render entries from the `word_relationships` table as clickable cards in
the study sidebar, the test sidebar, and the word detail view. Group
cards by `relationship_type` (`compound`, `sentence`, `grammar`) but use
identical visual styling so each entry behaves as a "tap to view another
entry" target.

## Decisions

- **Render**: split by `relationship_type` into separate sections; same
  card visual for all three groups.
- **Data path**: read directly from `word_relationships`. Stop
  reading/writing the vestigial `words.related_word_ids` array. Nothing
  meaningful is lost — that array cannot encode `relationship_type`, was
  never populated (0 rows out of 11,926), and is superseded by the typed
  table the admin tools already write to.

## Database state (as of this change)

| Table | Column | State |
|---|---|---|
| `words` | `related_word_ids` | default `{}`, populated rows: 0 / 11,926 |
| `word_relationships` | — | 1,936 rows: `sentence` (1,908), `compound` (14), `grammar` (14) |

All `related_word_id` FKs point at `words.id`. Sentence/grammar entries
live as rows in `words` (the English field is repurposed for grammar
rule text on `grammar` rows).

## Files changed

### Query layer — `src/lib/queries/words.ts`

- `WordWithDetails.relatedWords` is now `RelatedEntryGroups` —
  `{ compound, sentence, grammar }` — instead of a flat array.
- `getWords()` Phase 2 fan-out replaces the
  `related_word_ids` collection + `words IN (...)` fetch with a single
  batch query against `word_relationships` filtered by
  `word_id IN (allLessonWordIds)`. Rows are bucketed into the three
  groups by `relationship_type`.
- `getWord()` does the same `word_relationships` lookup for the
  single-word path.
- The auto-lesson path (`getAutoLessonWords`) was updated to use the
  same source so the dictionary/preview sidebar agrees with the
  per-lesson reads.

Unknown `relationship_type` values are ignored at read time
(forward-compatible — adding a new type to the enum doesn't crash the UI).

### UI — `src/components/study/StudySidebar.tsx`

- `relatedWords` prop is now `RelatedEntryGroups`.
- New `onRelatedClick?: (wordId: string) => void` prop.
- The single "Related Words" card was replaced with up to three cards,
  rendered only when their group is non-empty, in this order:
  1. `compound` → **RELATED WORDS**
  2. `sentence` → **EXAMPLE SENTENCES** (separate from
     `example_sentences`-table cards; they don't overlap)
  3. `grammar` → **GRAMMAR**
- The per-entry row is extracted into a local `RelatedEntryRow`
  component so the three groups share the same visual.

### UI — `src/components/WordDetailView.tsx`

- Same three-card split as the study sidebar.
- Each row is now a `<button>` (was a `<div>`) so the user can tap to
  open another entry.
- New `onRelatedClick?: (wordId: string) => void` prop.

### Wiring click handlers

The existing `WordPreviewContext.openWord(wordId)` already supports
cross-lesson opening with URL sync (`?word=<id>`) and is reused for
every entry point:

- `StudyModeClient` passes `onRelatedClick={openWord}` to `StudySidebar`.
- `TestModeClient` does the same (already gated by
  `isEnabled={hasSubmittedAnswer}` so related entries can't leak hints
  before the user answers).
- `WordDetailSidebar` passes `onRelatedClick={openWord}` to
  `WordDetailView`. Calling `openWord` from inside the preview sidebar
  swaps content in-place — that was already the existing behavior of
  the provider.

`WordPreviewProvider` wraps the dashboard layout
(`src/components/DashboardContent.tsx`) so every dashboard route —
including `/lesson/[id]/study` and `/lesson/[id]/test` — already has
the hook in scope.

### Admin write-path cleanup

- `src/lib/mutations/admin/words.ts` — removed both writes of
  `related_word_ids` (create + update).
- `src/lib/mutations/admin/lessons.ts` — removed the
  `related_word_ids: []` line from the duplicate-lesson copy block.
- `src/lib/validations/admin.ts` — removed `related_word_ids` from the
  Zod schema.

`AdminWordEditModal` already manages typed relationships via
`src/lib/queries/wordRelationships.client.ts` — no change needed there.

## Out of scope (deliberate)

- **Do not drop the `words.related_word_ids` column** in this change.
  Generated types and historical migrations reference it; leaving the
  column dormant for one release is safer. A follow-up migration can
  drop it once we're confident nothing else reads it.
- **Do not migrate `sentence` rows out of `words` into
  `example_sentences`.** That is a separate data-modeling decision; the
  admin flow already chose to store sentence rows as words.

## Verification

End-to-end check using Italian Vocab #1 (course
`6d60eb7e-7317-4c18-a0a9-6123cc37d5b8`):

1. **Multi-type word** — Open the lesson containing `il giocatore di
   calcio` in study mode. After completing the flashcard step (so the
   sidebar reveals), confirm two cards render: **RELATED WORDS**
   showing `il calcio` + `il giocatore`, and **EXAMPLE SENTENCES**
   showing the Maradona sentence.
2. **Grammar type** — Open `fantastico`. Confirm **EXAMPLE SENTENCES**
   and **GRAMMAR** cards render (no compound).
3. **No relationships** — Open any word without rows in
   `word_relationships`. Confirm zero cards render (no empty headers).
4. **Click-through** — Click `il calcio`. The word preview sidebar
   opens to that entry (URL gains `?word=<id>`). Browser back closes
   it. Repeat from inside the open detail sidebar (clicking another
   related entry from there should swap content in-place).
5. **Test mode parity** — In test mode for the same word, answer the
   question, sidebar reveals, cards render and are clickable.
6. **Admin write-path** — In admin, edit a word and save. Confirm no
   error on the now-removed `related_word_ids` field. Confirm
   `word_relationships` rows still create/update via
   `AdminWordEditModal`.
7. **DB sanity check** — Run:
   ```sql
   SELECT word_id, relationship_type, COUNT(*)
   FROM word_relationships
   GROUP BY word_id, relationship_type
   ORDER BY COUNT(*) DESC LIMIT 10;
   ```
   Spot-check that the words in the result render the corresponding
   cards in the UI.
8. **Build** — `npm run lint && npm run build` clean.
