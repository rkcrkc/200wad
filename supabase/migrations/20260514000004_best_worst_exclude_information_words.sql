-- Exclude information-category words from best/worst auto-lesson aggregation.
--
-- Information words are reference/fact pages, not testable vocabulary. The
-- detail page (src/app/(dashboard)/lesson/[lessonId]/page.tsx) and stats
-- (src/lib/queries/words.ts) already strip them client-side, but the All
-- Lessons summary card counts the raw RPC result and so reports a higher
-- word_count than the detail page can ever show. Filtering at the source
-- keeps every caller (summary card, detail page, scheduler) consistent.
--
-- Behaviour vs. the previous version (20260514000003):
--   * `word_scores` now joins `words` and excludes `category = 'information'`.
--   * Everything else (ordering, mastery exclusion for worst, tiebreakers) is
--     unchanged.

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
      SUM(COALESCE(tq.points_earned, 0))::numeric AS total_points,
      SUM(COALESCE(tq.points_earned, 0))::numeric
        / NULLIF(COUNT(*) * 3, 0)::numeric AS avg_ratio
    FROM test_questions tq
    JOIN user_test_scores uts ON uts.id = tq.test_score_id
    JOIN words w ON w.id = tq.word_id
    WHERE uts.user_id = auth.uid()
      AND tq.word_id IN (SELECT word_id FROM course_words)
      AND w.category IS DISTINCT FROM 'information'
    GROUP BY tq.word_id
  ),
  word_progress AS (
    SELECT
      uwp.word_id,
      uwp.status = 'mastered' AS is_mastered,
      COALESCE(uwp.correct_streak, 0) AS current_streak
    FROM user_word_progress uwp
    WHERE uwp.user_id = auth.uid()
  )
  SELECT ws.word_id
  FROM word_scores ws
  LEFT JOIN word_progress wp ON wp.word_id = ws.word_id
  WHERE p_type IN ('best', 'worst')
    AND (p_type = 'best' OR NOT COALESCE(wp.is_mastered, false))
  ORDER BY
    -- "best" only: mastered words first, then avg, then streak, then total.
    -- Each CASE collapses to NULL for the other type, making it a no-op.
    CASE WHEN p_type = 'best' THEN COALESCE(wp.is_mastered, false) END DESC NULLS LAST,
    CASE WHEN p_type = 'best'  THEN ws.avg_ratio END DESC,
    CASE WHEN p_type = 'worst' THEN ws.avg_ratio END ASC,
    CASE WHEN p_type = 'best' THEN COALESCE(wp.current_streak, 0) END DESC NULLS LAST,
    CASE WHEN p_type = 'best' THEN ws.total_points END DESC NULLS LAST,
    ws.word_id::text ASC
  LIMIT GREATEST(p_limit, 0);
$$;

GRANT EXECUTE ON FUNCTION select_best_worst_words_for_course(uuid, text, int)
  TO authenticated;
