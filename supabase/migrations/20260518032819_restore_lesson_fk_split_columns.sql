-- Restore FK on `user_test_scores.lesson_id` and `study_sessions.lesson_id`
-- → `lessons(id)` via split-column approach (Option B).
--
-- Background: 20260515000001_loosen_lesson_id_fk.sql dropped the FK and
-- retyped these columns as TEXT so auto-lesson tests (Notes/Best/Worst/
-- Unmastered/Lost Mastery, IDs of the form `auto-{type}-{courseId}`) could
-- be persisted. The trade-off: PostgREST nested embeds (e.g.
-- `user_test_scores(lessons(...))`) silently return null, breaking traffic
-- lights, stats, and progress queries.
--
-- This migration introduces discriminator columns so real lessons keep
-- their FK while auto-lessons live in `(auto_lesson_type, course_id)`:
--   * `lesson_id` becomes `UUID NULL` with FK → `lessons(id) ON DELETE CASCADE`
--   * `auto_lesson_type TEXT NULL` ∈ {notes, best, worst, unmastered, lost_mastery}
--   * `course_id UUID NULL` with FK → `courses(id) ON DELETE CASCADE`
--   * CHECK: exactly one of `(lesson_id)` or `(auto_lesson_type, course_id)`
--     is populated per row.
--
-- Backfill: TEXT values matching `auto-{type}-{uuid}` are split into the
-- discriminator columns; TEXT UUIDs that resolve to a real `lessons.id`
-- are preserved; orphan UUIDs (referencing deleted lessons) are nulled
-- and logged via RAISE NOTICE.

-- ---------------------------------------------------------------------------
-- 1. Pre-flight sanity check: bail out on malformed values so we can clean
-- them manually before retrying. Matches: NULL / UUID / auto-{type}-{uuid}.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  bad_uts INTEGER;
  bad_ss INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad_uts
  FROM user_test_scores
  WHERE lesson_id IS NOT NULL
    AND lesson_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND lesson_id !~ '^auto-(notes|best|worst|unmastered|lost_mastery)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  SELECT COUNT(*) INTO bad_ss
  FROM study_sessions
  WHERE lesson_id IS NOT NULL
    AND lesson_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND lesson_id !~ '^auto-(notes|best|worst|unmastered|lost_mastery)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  IF bad_uts > 0 OR bad_ss > 0 THEN
    RAISE EXCEPTION 'Malformed lesson_id values found: user_test_scores=%, study_sessions=%. Clean before re-running.', bad_uts, bad_ss;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Add the discriminator columns (nullable, no constraints yet).
-- ---------------------------------------------------------------------------
ALTER TABLE user_test_scores
  ADD COLUMN IF NOT EXISTS auto_lesson_type TEXT,
  ADD COLUMN IF NOT EXISTS course_id UUID;

ALTER TABLE study_sessions
  ADD COLUMN IF NOT EXISTS auto_lesson_type TEXT,
  ADD COLUMN IF NOT EXISTS course_id UUID;

-- ---------------------------------------------------------------------------
-- 3. Backfill: split auto-lesson TEXT into `(auto_lesson_type, course_id)`
-- and null out the lesson_id for those rows.
-- ---------------------------------------------------------------------------
UPDATE user_test_scores
SET
  auto_lesson_type = (regexp_match(lesson_id, '^auto-(notes|best|worst|unmastered|lost_mastery)-'))[1],
  course_id = ((regexp_match(lesson_id, '^auto-(?:notes|best|worst|unmastered|lost_mastery)-([0-9a-f-]+)$'))[1])::uuid,
  lesson_id = NULL
WHERE lesson_id ~ '^auto-(notes|best|worst|unmastered|lost_mastery)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE study_sessions
SET
  auto_lesson_type = (regexp_match(lesson_id, '^auto-(notes|best|worst|unmastered|lost_mastery)-'))[1],
  course_id = ((regexp_match(lesson_id, '^auto-(?:notes|best|worst|unmastered|lost_mastery)-([0-9a-f-]+)$'))[1])::uuid,
  lesson_id = NULL
WHERE lesson_id ~ '^auto-(notes|best|worst|unmastered|lost_mastery)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- ---------------------------------------------------------------------------
-- 4. Null out orphan UUIDs (lesson rows that no longer exist).
-- Log how many we found before nulling. Without this the ALTER COLUMN
-- type-cast + FK creation below would fail.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  orphan_uts INTEGER;
  orphan_ss INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_uts
  FROM user_test_scores ts
  WHERE ts.lesson_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.id::text = ts.lesson_id);

  SELECT COUNT(*) INTO orphan_ss
  FROM study_sessions ss
  WHERE ss.lesson_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.id::text = ss.lesson_id);

  IF orphan_uts > 0 OR orphan_ss > 0 THEN
    RAISE NOTICE 'Nulling orphan lesson_id refs: user_test_scores=%, study_sessions=%', orphan_uts, orphan_ss;
  END IF;
END $$;

UPDATE user_test_scores ts
SET lesson_id = NULL
WHERE ts.lesson_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.id::text = ts.lesson_id);

UPDATE study_sessions ss
SET lesson_id = NULL
WHERE ss.lesson_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.id::text = ss.lesson_id);

-- ---------------------------------------------------------------------------
-- 5. Convert TEXT → UUID. Remaining non-null values are guaranteed valid by
-- step 4. Empty strings, if any, are normalised to NULL first.
-- ---------------------------------------------------------------------------
UPDATE user_test_scores SET lesson_id = NULL WHERE lesson_id = '';
UPDATE study_sessions SET lesson_id = NULL WHERE lesson_id = '';

ALTER TABLE user_test_scores
  ALTER COLUMN lesson_id TYPE UUID USING lesson_id::uuid;

ALTER TABLE study_sessions
  ALTER COLUMN lesson_id TYPE UUID USING lesson_id::uuid;

-- ---------------------------------------------------------------------------
-- 6. Restore FKs.
-- ---------------------------------------------------------------------------
ALTER TABLE user_test_scores
  ADD CONSTRAINT user_test_scores_lesson_id_fkey
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;

ALTER TABLE user_test_scores
  ADD CONSTRAINT user_test_scores_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE study_sessions
  ADD CONSTRAINT study_sessions_lesson_id_fkey
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;

ALTER TABLE study_sessions
  ADD CONSTRAINT study_sessions_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 7. CHECK constraints:
--   a) auto_lesson_type, when set, must be one of the known types.
--   b) Mutual exclusion: a row is either a real-lesson row
--      (lesson_id NOT NULL, auto_lesson_type NULL, course_id NULL) or an
--      auto-lesson row (lesson_id NULL, auto_lesson_type NOT NULL,
--      course_id NOT NULL). Rows with all three NULL are tolerated for
--      legacy / pending data — adjust if we want to forbid them later.
-- ---------------------------------------------------------------------------
ALTER TABLE user_test_scores
  ADD CONSTRAINT user_test_scores_auto_lesson_type_check
  CHECK (
    auto_lesson_type IS NULL
    OR auto_lesson_type IN ('notes','best','worst','unmastered','lost_mastery')
  );

ALTER TABLE user_test_scores
  ADD CONSTRAINT user_test_scores_lesson_or_auto_check
  CHECK (
    (lesson_id IS NOT NULL AND auto_lesson_type IS NULL AND course_id IS NULL)
    OR (lesson_id IS NULL AND auto_lesson_type IS NOT NULL AND course_id IS NOT NULL)
    OR (lesson_id IS NULL AND auto_lesson_type IS NULL AND course_id IS NULL)
  );

ALTER TABLE study_sessions
  ADD CONSTRAINT study_sessions_auto_lesson_type_check
  CHECK (
    auto_lesson_type IS NULL
    OR auto_lesson_type IN ('notes','best','worst','unmastered','lost_mastery')
  );

ALTER TABLE study_sessions
  ADD CONSTRAINT study_sessions_lesson_or_auto_check
  CHECK (
    (lesson_id IS NOT NULL AND auto_lesson_type IS NULL AND course_id IS NULL)
    OR (lesson_id IS NULL AND auto_lesson_type IS NOT NULL AND course_id IS NOT NULL)
    OR (lesson_id IS NULL AND auto_lesson_type IS NULL AND course_id IS NULL)
  );

-- ---------------------------------------------------------------------------
-- 8. Indexes for the new auto-lesson lookup pattern.
-- The existing `idx_user_test_scores_lesson` / `idx_study_sessions_lesson`
-- on `lesson_id` are preserved (UUID indexes are still valid after the
-- type cast in step 5).
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_test_scores_course_auto
  ON user_test_scores (course_id, auto_lesson_type)
  WHERE course_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_sessions_course_auto
  ON study_sessions (course_id, auto_lesson_type)
  WHERE course_id IS NOT NULL;
