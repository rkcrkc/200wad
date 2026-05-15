-- Loosen `lesson_id` typing on `user_test_scores` and `study_sessions` so that
-- auto-lesson tests (Unmastered / Best / Worst / Notes / Lost Mastery) can save.
--
-- Auto-lessons are virtual: their IDs follow the pattern `auto-{type}-{courseId}`
-- (see `isAutoLesson()` / `parseAutoLessonId()` in `src/lib/queries/auto-lessons.ts`)
-- and they have no row in the `lessons` table. Previously the columns were
-- typed as UUID with a FK to `lessons(id)`, so inserts from auto-lesson tests
-- silently errored on the FK / type mismatch — the test_score insert returned
-- early and `updateWordTestProgress` was never called, leaving no DB trace
-- that the test ever happened.
--
-- NOTE: callers must now use `isAutoLesson()` to discriminate auto-lesson IDs
-- from real lesson UUIDs. The existing index `idx_user_test_scores_lesson`
-- (see `20260128000003_indexes.sql`) is preserved — text indexes work fine.

-- user_test_scores ---------------------------------------------------------
ALTER TABLE user_test_scores
  DROP CONSTRAINT IF EXISTS user_test_scores_lesson_id_fkey;

ALTER TABLE user_test_scores
  ALTER COLUMN lesson_id TYPE text USING lesson_id::text;

-- study_sessions -----------------------------------------------------------
ALTER TABLE study_sessions
  DROP CONSTRAINT IF EXISTS study_sessions_lesson_id_fkey;

ALTER TABLE study_sessions
  ALTER COLUMN lesson_id TYPE text USING lesson_id::text;
