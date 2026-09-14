# Lesson ID Split-Columns Migration

**Migration:** `supabase/migrations/20260516000002_restore_lesson_fk_split_columns.sql`
**Tables affected:** `test_sessions`, `study_sessions`

## Background

Earlier migration `20260515000001_loosen_lesson_id_fk.sql` dropped the FK on
`test_sessions.lesson_id` / `study_sessions.lesson_id` → `lessons.id` and
widened the column to `TEXT` so we could store synthetic auto-lesson IDs of
the form `auto-{type}-{courseUUID}` (e.g. `auto-worst-6d60eb7e-...`).

That worked for inserts, but it broke every PostgREST query that relied on
the FK introspection — nested embeds like
`test_sessions(lessons(title))` silently returned `null`, which
manifested as missing traffic lights, zeroed-out stats, and stale progress
counts.

## Approach (Option B — split columns)

For both `test_sessions` and `study_sessions`:

1. Restore `lesson_id` as `UUID NULL` with FK → `lessons(id) ON DELETE CASCADE`.
2. Add a discriminator pair for auto-lessons:
   - `auto_lesson_type TEXT NULL` — one of `notes | best | worst | unmastered | lost_mastery`
   - `course_id UUID NULL` — FK → `courses(id) ON DELETE CASCADE`
3. Enforce mutual exclusion via a CHECK constraint: each row uses **either**
   `lesson_id` (real lesson) **or** `(auto_lesson_type, course_id)` (auto-
   lesson). Never both, never neither.

## Migration steps

1. **Pre-flight check** — raise an exception if any existing TEXT
   `lesson_id` matches neither the UUID format nor the `auto-{type}-{uuid}`
   pattern. Aborts the migration before any destructive change.
2. **Add columns** — `auto_lesson_type TEXT`, `course_id UUID` on both tables.
3. **Backfill** — for every row whose TEXT `lesson_id` matches
   `^auto-(notes|best|worst|unmastered|lost_mastery)-(<uuid>)$`,
   populate `(auto_lesson_type, course_id)` from the regex captures and set
   `lesson_id = NULL`.
4. **Null orphans** — UUID-shaped `lesson_id`s pointing to deleted `lessons`
   rows are set to NULL (logged via `RAISE NOTICE`).
5. **Column type change** — `ALTER COLUMN lesson_id TYPE UUID USING lesson_id::uuid`.
6. **Restore FKs**:
   - `lesson_id → lessons(id) ON DELETE CASCADE`
   - `course_id → courses(id) ON DELETE CASCADE`
7. **CHECK constraints**:
   - `auto_lesson_type IN ('notes','best','worst','unmastered','lost_mastery') OR auto_lesson_type IS NULL`
   - Mutual exclusion: exactly one of `(lesson_id IS NOT NULL)` or
     `(auto_lesson_type IS NOT NULL AND course_id IS NOT NULL)`.
8. **Indexes** — composite `(course_id, auto_lesson_type)` on both tables.

## Application-layer changes

### Helper

- `src/lib/queries/auto-lessons.ts`: `LessonIdRef` discriminated union plus
  `resolveLessonIdRef(id)`, returning one of:
  - `{ kind: "real", lessonId }`
  - `{ kind: "auto", autoLessonType, courseId }`
  - `{ kind: "none" }`

### Mutations (writes must pick one side)

- `src/lib/mutations/study.ts` — `createStudySession`
- `src/lib/mutations/test.ts` — `createTestSession`, idempotency check,
  `test_sessions` insert

All inserts/deletes call `resolveLessonIdRef()` and populate **either**
`lesson_id` **or** `(auto_lesson_type, course_id)`. The CHECK constraint
will reject any row that violates this.

### Queries

Three patterns now appear in `src/lib/queries/`:

1. **Course-scoped reads** (want both real and auto-lesson rows):
   ```ts
   const courseScopeOr =
     lessonIds.length > 0
       ? `lesson_id.in.(${lessonIds.join(",")}),course_id.eq.${courseId}`
       : `course_id.eq.${courseId}`;
   query.or(courseScopeOr);
   ```
   Used in `stats.ts`, `lessons.ts`, `tests.ts`, `words.ts` (admin path).

2. **Single-lesson reads** (one specific lesson or auto-lesson):
   ```ts
   const ref = resolveLessonIdRef(lessonId);
   if (ref.kind === "real")      q.eq("lesson_id", ref.lessonId);
   else if (ref.kind === "auto") q.eq("auto_lesson_type", ref.autoLessonType).eq("course_id", ref.courseId);
   ```
   Used in `tests.ts` (`getLessonActivityHistory`).

3. **Auto-lesson-only reads** (caller already knows it's an auto-lesson):
   ```ts
   query.eq("auto_lesson_type", type).eq("course_id", courseId);
   ```
   Used in `schedule.ts` (`getWorstWordsAutoLesson`), `words.ts`
   (`getAutoLessonWords`).

PostgREST nested embeds work again, e.g. in `words.ts`:
```ts
.select("..., test_sessions(lesson_id, auto_lesson_type, course_id, lessons(id, title, emoji, number))")
```
Compose the display title from the embedded `lessons` row (real) or from
`AUTO_LESSON_META[auto_lesson_type]` (auto).

## Files touched

- **Migration:** `supabase/migrations/20260516000002_restore_lesson_fk_split_columns.sql`
- **Helper:** `src/lib/queries/auto-lessons.ts`
- **Mutations:** `src/lib/mutations/study.ts`, `src/lib/mutations/test.ts`
- **Queries:** `src/lib/queries/words.ts`, `stats.ts`, `lessons.ts`,
  `tests.ts`, `schedule.ts`
- **Types:** `src/types/database-generated.ts` (regenerated)

## Verification performed

- Row counts unchanged post-migration: 636 `test_sessions` (631 real + 5
  auto), 1317 `study_sessions` (1304 real + 13 auto).
- Zero rows with both `lesson_id` and `auto_lesson_type` populated (CHECK
  constraint holds).
- Zero orphan UUIDs after backfill.
- No new Supabase advisor issues.
- `npm run lint`: error count dropped (61 vs 66 pre-change).
- `npm run build`: clean.

## Adding new auto-lesson types

1. Add the type to `AUTO_LESSON_DEFINITIONS` in `src/lib/queries/auto-lessons.ts`.
2. Update the CHECK constraint on both tables (new migration):
   ```sql
   ALTER TABLE study_sessions DROP CONSTRAINT study_sessions_auto_lesson_type_check;
   ALTER TABLE study_sessions ADD CONSTRAINT study_sessions_auto_lesson_type_check
     CHECK (auto_lesson_type IN ('notes','best','worst','unmastered','lost_mastery','<new>') OR auto_lesson_type IS NULL);
   ```
   (Repeat for `test_sessions`.)
3. Regenerate types: `npx supabase gen types typescript --project-id <id> > src/types/database-generated.ts`.
