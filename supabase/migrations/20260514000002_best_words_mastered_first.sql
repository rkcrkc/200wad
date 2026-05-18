-- Extend select_best_worst_words_for_course so the "best" list ranks
-- currently-mastered words ahead of unmastered ones.
--
-- Mastery is the strongest signal of "I've nailed this word", so when we
-- surface the user's best-performing words we want their mastered set up
-- top, then fall back to the existing avg-points-per-attempt ordering.
--
-- "Worst" semantics are unchanged: mastered words are still excluded
-- before the LIMIT, and ordering is avg_ratio ASC with a stable
-- word_id tiebreak.

CREATE OR REPLACE FUNCTION select_best_worst_words_for_course(
  p_course_id uuid,
  p_type text,
  p_limit int DEFAULT 20
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
        / NULLIF(COUNT(*) * 3, 0)::numeric AS avg_ratio,
      EXISTS (
        SELECT 1
        FROM user_word_progress uwp
        WHERE uwp.user_id = auth.uid()
          AND uwp.word_id = tq.word_id
          AND uwp.status = 'mastered'
      ) AS is_mastered
    FROM test_questions tq
    JOIN user_test_scores uts ON uts.id = tq.test_score_id
    WHERE uts.user_id = auth.uid()
      AND tq.word_id IN (SELECT word_id FROM course_words)
    GROUP BY tq.word_id
  )
  SELECT ws.word_id
  FROM word_scores ws
  WHERE p_type IN ('best', 'worst')
    AND (p_type = 'best' OR NOT ws.is_mastered)
  ORDER BY
    -- "best" only: mastered words ahead of unmastered ones.
    -- For "worst" this CASE returns NULL on every row, so it's a no-op.
    CASE WHEN p_type = 'best' THEN ws.is_mastered END DESC NULLS LAST,
    CASE WHEN p_type = 'best'  THEN ws.avg_ratio END DESC,
    CASE WHEN p_type = 'worst' THEN ws.avg_ratio END ASC,
    ws.word_id::text ASC
  LIMIT GREATEST(p_limit, 0);
$$;

GRANT EXECUTE ON FUNCTION select_best_worst_words_for_course(uuid, text, int)
  TO authenticated;
