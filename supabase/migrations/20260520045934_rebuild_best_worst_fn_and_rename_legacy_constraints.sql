-- Follow-up to 20260519000002_rename_user_test_scores_to_test_sessions.sql.
--
-- The version of 000002 that actually shipped to remote only renamed the
-- table; the function rebuild that was added to the local file (lines 52-114)
-- never reached production, so `select_best_worst_words_for_course` still
-- joins `user_test_scores uts ON uts.id = tq.test_score_id` and errors with
-- `relation "user_test_scores" does not exist` on every call. This migration
-- rebuilds the function against the new names.
--
-- It also renames the legacy `user_test_scores_*` constraints/indexes that
-- PostgreSQL left behind when `ALTER TABLE ... RENAME TO test_sessions` ran.
-- These are name-only changes with no behavioural impact, but they remove the
-- ongoing audit noise.

-- 1. Rebuild the RPC against test_sessions / test_session_id.
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

-- 2. Rename the legacy primary key. PostgreSQL renames the supporting index
-- automatically when the PK constraint is renamed, so no separate ALTER INDEX
-- is required for user_test_scores_pkey.
ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_pkey TO test_sessions_pkey;

-- 3. Rename the legacy foreign-key constraints.
ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_user_id_fkey TO test_sessions_user_id_fkey;

ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_course_id_fkey TO test_sessions_course_id_fkey;

ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_lesson_id_fkey TO test_sessions_lesson_id_fkey;

-- 4. Rename the legacy CHECK constraints.
ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_check TO test_sessions_check;

ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_auto_lesson_type_check TO test_sessions_auto_lesson_type_check;

ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_correct_answers_check TO test_sessions_correct_answers_check;

ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_duration_seconds_check TO test_sessions_duration_seconds_check;

ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_lesson_or_auto_check TO test_sessions_lesson_or_auto_check;

ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_mastered_words_count_check TO test_sessions_mastered_words_count_check;

ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_max_points_check TO test_sessions_max_points_check;

ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_milestone_check TO test_sessions_milestone_check;

ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_new_words_count_check TO test_sessions_new_words_count_check;

ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_points_earned_check TO test_sessions_points_earned_check;

ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_score_percent_check TO test_sessions_score_percent_check;

ALTER TABLE test_sessions
  RENAME CONSTRAINT user_test_scores_total_questions_check TO test_sessions_total_questions_check;

-- 5. Rename the remaining legacy non-PK index.
ALTER INDEX IF EXISTS idx_user_test_scores_course_auto
  RENAME TO idx_test_sessions_course_auto;
