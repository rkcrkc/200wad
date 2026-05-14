-- Server-side selection of "Best Words" / "Worst Words" for the auto-lessons.
--
-- Previously the TS layer fetched all of a user's test_questions (via a list
-- of test_score_ids scoped to the current course's published lessons), then
-- aggregated and sorted client-side. That had two problems:
--
--   1. Correctness: scoping by lesson_id silently excludes attempts whose
--      original lesson was later unpublished, renumbered, or moved between
--      courses. Per-word test history is the source of truth — lesson IDs are
--      a transport detail.
--
--   2. URL length: filtering test_questions by `word_id IN (~1000 uuids)` to
--      avoid #1 pushed PostgREST GET URLs past safe limits and silently
--      returned empty.
--
-- Aggregating in Postgres sidesteps both: RLS already scopes to the calling
-- user, the JOIN restricts to this course's words, and only the top-N word
-- IDs cross the wire.
--
-- Returns word IDs in display order. Caller orders the rendered word rows
-- to match. Mirrors the previous TS helper's semantics:
--   * "best":  ORDER BY avg DESC, word_id ASC. No mastered-exclusion.
--   * "worst": ORDER BY avg ASC,  word_id ASC. Mastered words excluded
--              before the LIMIT (matching old behaviour).
-- Max points per attempt is fixed at 3 (clues reduce points_earned, not max).

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
    -- Every word that belongs to any lesson in this course. Includes words
    -- in unpublished lessons — if the user has test history on them, that
    -- history is still valid and should rank them.
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
    JOIN user_test_scores uts ON uts.id = tq.test_score_id
    WHERE uts.user_id = auth.uid()
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
    -- Match the TS helper's stable tiebreak: string compare on the uuid.
    ws.word_id::text ASC
  LIMIT GREATEST(p_limit, 0);
$$;

GRANT EXECUTE ON FUNCTION select_best_worst_words_for_course(uuid, text, int)
  TO authenticated;
