# Admin QA Lessons Plan

Admin-only "QA lessons" surfaced inside the normal lessons UI. Each QA lesson
collects the words in a course that carry one developer-QA flag, so an admin can
launch **Study** and walk through them (fixing flags inline). QA study is **fully
ephemeral** — nothing is persisted, so scoring/XP/streaks/history are untouched.

## Decisions locked (from planning)

- **Placement:** on the `/course/[courseId]` "All Lessons" page, an admin-only
  section **after** the `LessonsList`, separated by a horizontal divider.
- **Section shape:** a single filter pill labelled **"Developer notes"** (the pill
  row is left extensible for future categories); selecting it reveals the QA
  lessons — **one per developer-notes flag**.
- **The 7 flags** (from `DeveloperSection`): `developer_notes` (has text),
  `picture_wrong`, `picture_missing`, `picture_bad_svg`, `picture_mp4_defect`,
  `audio_rerecord`, `notes_in_memory_trigger`.
- **Mode:** **Study only** (no Test).
- **Word set:** **all** words in the course with that flag (no cap).
- **Persistence:** **fully ephemeral** — no `study_sessions`/`user_word_progress`/
  `user_lesson_progress`/`user_daily_activity` writes; no XP/streak/history/resume.
- **Empty flag (0 words):** tile shown **greyed/disabled**.
- **Visibility:** admin only (`user.user_metadata.role === "admin"`), server-gated.

## User goal & entry points

- **Who:** admins doing content QA.
- **Goal:** "Show me every word in this course flagged *Wrong picture* (etc.) and
  let me flip through them to review/fix."
- **Entry point:** the QA section on the course "All Lessons" page. Click a flag
  tile → ephemeral Study mode for that flag's words.

## Why this is safe (no scoring impact)

`study_sessions` (and `test_sessions`) carry a CHECK constraint: a row must be
either a real `lesson_id` (UUID, FK to `lessons`) **or** a known
`auto_lesson_type IN ('notes','best','worst','unmastered','lost_mastery')` with a
`course_id`. A QA lesson id (`qa-{flag}-{courseId}`) matches **neither**, so the DB
physically rejects any QA session row. We lean into that:

- **QA ids are their own namespace** — NOT auto-lessons. No new `AutoLessonType`,
  no `resolveLessonIdRef` involvement, so the split-column writers never touch them.
- **`createStudySession` short-circuits** for `qa-` ids: returns a synthetic
  in-memory session id, writes nothing.
- **`completeStudySession` short-circuits** for `qa-` ids: returns success, writes
  nothing (no notes batch, no `markWordsAsLearning`, no activity, no fan-out).
- **Test route rejects `qa-` ids** (study-only) — belt-and-braces, since QA tiles
  never link to `/test`.
- **Inline flag edits still persist** — the `DeveloperSection` checkboxes call the
  existing `saveDeveloperData(wordId, …)` mutation directly (writes only `words.*`
  flag columns). That's the whole point of QA and is independent of session writes.

Net: the constraint is a hard backstop; the short-circuits mean we never even
attempt a scoring write.

## The 7 flags → lessons

| Tile label            | Column                    | "Flagged" test         |
|-----------------------|---------------------------|------------------------|
| Developer Notes       | `developer_notes`         | non-null AND non-empty |
| Wrong Picture         | `picture_wrong`           | `= true`               |
| Missing Picture       | `picture_missing`         | `= true`               |
| Bad SVG               | `picture_bad_svg`         | `= true`               |
| MP4 Defect            | `picture_mp4_defect`      | `= true`               |
| Re-record Audio       | `audio_rerecord`          | `= true`               |
| Notes in Trigger      | `notes_in_memory_trigger` | `= true`               |

Course scoping: a word is "in the course" if it belongs to a `lesson_words` row
whose `lessons.course_id = courseId`. Flagged set = course words ∩ flag-true words.

## States

### QA section on the course page
- **Non-admin / guest:** section (and divider) not rendered at all.
- **Admin, loading:** counts resolve server-side with the page; no separate spinner.
- **Admin, success:** "Developer notes" pill + 7 flag tiles, each showing its label
  and count badge.
  - Count `> 0`: tile is an active link → Study.
  - Count `0`: tile greyed/disabled, badge `0`, not clickable.
- **Admin, all-zero:** all 7 tiles greyed; small line "No flagged words in this
  course." above the tiles.

### Ephemeral Study (per flag)
- Reuses the existing `/lesson/[lessonId]/study` flow with `lessonId =
  qa-{flag}-{courseId}`, resolved to a virtual lesson whose title is the flag label
  (e.g. "QA · Wrong Picture").
- **Loading:** existing study loader.
- **Empty (last word's flag cleared, set now empty):** existing study empty/finish
  handling; on finish just returns to the course page (nothing saved).
- **Success:** normal Study UI (cards, DeveloperSection visible since `isAdmin`).
  Finishing shows the normal completion, but persists nothing.
- **"Too much data":** flag sets can be large; Study already paginates one card at a
  time. Long `developer_notes` render/scroll inside `DeveloperSection` as today.

## Interactions & copy

- **Section heading:** "QA" with subtext "Admin only — not saved".
- **Pill:** `Developer notes` (single, selected by default).
- **Tile:** flag label + count badge. Click (count > 0) → navigate to
  `/lesson/qa-{flag}-{courseId}/study`.
- **In Study:** identical to normal study; DeveloperSection checkboxes fix flags
  live (existing mutation + toast). No new confirmations.
- **Finish:** returns to the course page; no score/XP/celebration (there's nothing
  to celebrate — ephemeral).

## Responsive

- Tiles: flex-wrap / grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`), consistent
  with existing card rows.
- Study flow is already responsive — no new work.

## Reuse

- **Study flow:** existing `/lesson/[lessonId]/study` + `StudyModeClient` (must
  tolerate a synthetic session id).
- **Flag editing:** `DeveloperSection` (already the canonical editor after the
  Option B refactor) via existing `saveDeveloperData`.
- **Word loading:** extend `getWords(lessonId)` to resolve `qa-` ids, mirroring the
  existing auto-lesson branch (`getAutoLessonWords`).
- **Id-helper pattern:** mirror `auto-lessons.ts` pure helpers for `qa-` ids.
- **Section styling / pills / tiles:** existing `Tabs`/pill + card components and
  design tokens; no invented utilities or off-palette colours.

## Data & permissions

- **New pure helpers** (`src/lib/queries/qa-lessons.ts`, no server imports so
  clients can use them): `QA_FLAGS` (key, label, column, kind: 'bool' | 'text'),
  `createQaLessonId(flag, courseId)`, `parseQaLessonId(id)`, `isQaLesson(id)`.
- **New queries** (`src/lib/queries/qa.ts` or same file, server):
  - `getQaFlagCounts(courseId)` → `Record<flag, number>` for tiles.
  - `getQaFlaggedWordIds(courseId, flag)` → ordered word ids for Study.
  - Implementation: fetch the course's word ids via `lesson_words` join on
    `lessons.course_id`, then count/filter `words` by the flag column
    (`developer_notes` → `not null` + non-empty; booleans → `eq(col, true)`).
- **RLS:** admin reads via server client; `words`/`lesson_words`/`lessons` already
  admin-readable in existing admin/course pages. No new policy, no service role.
- **Guest mode:** N/A — section is admin-gated.
- **Writes:** none new from QA itself; only the pre-existing `saveDeveloperData`
  flag edits.

## Implementation touchpoints (files)

1. `src/lib/queries/qa-lessons.ts` — pure id helpers + `QA_FLAGS` definitions.
2. `src/lib/queries/qa.ts` — `getQaFlagCounts`, `getQaFlaggedWordIds`.
3. `src/lib/queries/words.ts` — `getWords` resolves `qa-{flag}-{courseId}` (virtual
   lesson + flagged word list), analogous to the auto-lesson branch.
4. `src/lib/mutations/study.ts` — `createStudySession` & `completeStudySession`
   early-return (no writes) when `isQaLesson(lessonId)`.
5. `src/app/(dashboard)/lesson/[lessonId]/study/…` + `StudyModeClient.tsx` — build a
   virtual lesson for `qa-` ids; tolerate synthetic session id.
6. `src/app/(dashboard)/lesson/[lessonId]/test/…` — reject `qa-` ids (study-only).
7. `src/components/lessons/QaLessonsSection.tsx` — new admin-only section (pill +
   tiles + counts).
8. `src/app/(dashboard)/course/[courseId]/page.tsx` — compute `isAdmin` + qa counts;
   render divider + `QaLessonsSection` after `LessonsList` for admins.

## Quality checklist (verify before hand-off)

- [ ] States: non-admin hidden, per-flag counts, greyed zero-tiles, all-zero note,
      study loading/empty/finish.
- [ ] Ephemeral proven: no rows written to `study_sessions`/`user_word_progress`/
      `user_lesson_progress`/`user_daily_activity` during QA study (verify in DB).
- [ ] `saveDeveloperData` flag edits still persist during QA study.
- [ ] Test route rejects `qa-` ids; QA tiles never expose Test.
- [ ] Long `developer_notes` / large flag sets don't break layout.
- [ ] Mobile: tiles wrap; study stacks.
- [ ] Reuses `StudyModeClient` / `DeveloperSection` / existing pill+card + tokens.
- [ ] `npm run lint` passes; no dead code.

## Open decisions (defaults chosen; flag if you disagree)

1. **Study finish destination:** back to the course "All Lessons" page.
2. **Tile order:** Developer Notes, Wrong Picture, Missing Picture, Bad SVG, MP4
   Defect, Re-record Audio, Notes in Trigger (matches DeveloperSection order).
3. **Virtual lesson title in Study:** `QA · <Flag label>`.
