-- Rename user_test_scores -> test_sessions.
--
-- The table represents a full test session (its words, its score, its
-- direction, its idempotency key, ...). The legacy name "user_test_scores"
-- implies the row is just a score, which it isn't. Renaming both the table
-- and its FK column on test_questions removes the ongoing semantic mismatch.
--
-- Pure refactor: no behavior change, no row movement. RLS policies are
-- dropped and recreated because they reference the table by name.

-- 1. Drop dependent RLS policies (they reference the table name directly).
DROP POLICY IF EXISTS "Users read own" ON user_test_scores;
DROP POLICY IF EXISTS "Users insert own" ON user_test_scores;
DROP POLICY IF EXISTS "Users read own" ON test_questions;
DROP POLICY IF EXISTS "Users insert own" ON test_questions;

-- 2. Rename the table.
ALTER TABLE user_test_scores RENAME TO test_sessions;

-- 3. Rename the FK column on test_questions.
ALTER TABLE test_questions RENAME COLUMN test_score_id TO test_session_id;

-- 4. Rename FK constraint on test_questions for hygiene.
ALTER TABLE test_questions
  RENAME CONSTRAINT test_questions_test_score_id_fkey
  TO test_questions_test_session_id_fkey;

-- 5. Rename indexes for hygiene.
ALTER INDEX IF EXISTS idx_user_test_scores_user RENAME TO idx_test_sessions_user;
ALTER INDEX IF EXISTS idx_user_test_scores_lesson RENAME TO idx_test_sessions_lesson;
ALTER INDEX IF EXISTS idx_test_questions_test RENAME TO idx_test_questions_session;

-- 6. Recreate RLS policies against the new table/column names.
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON test_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own" ON test_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON test_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM test_sessions
    WHERE test_sessions.id = test_questions.test_session_id
    AND test_sessions.user_id = auth.uid()
  ));
CREATE POLICY "Users insert own" ON test_questions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM test_sessions
    WHERE test_sessions.id = test_questions.test_session_id
    AND test_sessions.user_id = auth.uid()
  ));

-- 7. Rebuild functions whose bodies still reference the old table / column
-- names. Postgres does NOT rewrite SQL function bodies on RENAME — they
-- remain as plain text and only resolve at call time, so anything created
-- before this migration would now error with `relation "user_test_scores"
-- does not exist`.
--
-- `select_best_worst_words_for_course` is the only persistent RPC in the
-- migration history that joins `user_test_scores`; re-issue it against the
-- new names. Keep the body identical to the definition introduced in
-- `20260519000001_auto_lesson_word_limit.sql` except for the table/column
-- references so the auto-lesson word-limit behaviour is preserved.
CREATE OR REPLACE FUNCTION select_best_worst_words_for_course(
  p_course_id uuid,
  p_type text,
  p_limit int DEFAULT 10
)
RETURNS TABLE (word_id uuid)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH course_words AS (
    SELECT DISTINCT lw.word_id
    FROM lesson_words lw
    JOIN lessons l ON l.id = lw.lesson_id
    WHERE l.course_id = p_course_id
      AND lw.word_id IS NOT NULL
  ),
  word_scores AS (
    SELECT
      tq.word_id,
      SUM(COALESCE(tq.points_earned, 0))::numeric
        / NULLIF(COUNT(*) * 3, 0)::numeric AS avg_ratio
    FROM test_questions tq
    JOIN test_sessions ts ON ts.id = tq.test_session_id
    WHERE ts.user_id = auth.uid()
      AND tq.word_id IN (SELECT word_id FROM course_words)
    GROUP BY tq.word_id
  )
  SELECT ws.word_id
  FROM word_scores ws
  WHERE p_type IN ('best', 'worst')
    AND (
      p_type = 'best'
      OR NOT EXISTS (
        SELECT 1
        FROM user_word_progress uwp
        WHERE uwp.user_id = auth.uid()
          AND uwp.word_id = ws.word_id
          AND uwp.status = 'mastered'
      )
    )
  ORDER BY
    CASE WHEN p_type = 'best'  THEN ws.avg_ratio END DESC,
    CASE WHEN p_type = 'worst' THEN ws.avg_ratio END ASC,
    ws.word_id::text ASC
  LIMIT GREATEST(p_limit, 0);
$$;

GRANT EXECUTE ON FUNCTION select_best_worst_words_for_course(uuid, text, int)
  TO authenticated;
