-- Auto-lesson word limit
--
-- Consolidates the per-auto-lesson word caps (Best / Worst / Unmastered /
-- Lost Mastery) into a single admin-configurable value, stored in
-- platform_config under the key `auto_lesson_word_limit`. The TS layer reads
-- this value (cached, invalidated via the existing `platform-config` tag)
-- and passes it as `p_limit` to `select_best_worst_words_for_course` and as
-- the slice size to the unmastered / lost-mastery selectors.
--
-- We also lower the RPC's own default from 20 -> 10 so the DB-side fallback
-- matches the app-side fallback when called without an explicit p_limit.

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
    ws.word_id::text ASC
  LIMIT GREATEST(p_limit, 0);
$$;

GRANT EXECUTE ON FUNCTION select_best_worst_words_for_course(uuid, text, int)
  TO authenticated;

-- Seed the platform_config row. Idempotent: do nothing if the key already
-- exists so re-running the migration doesn't clobber an admin override.
INSERT INTO platform_config (key, value, description)
VALUES (
  'auto_lesson_word_limit',
  to_jsonb(10),
  'Maximum number of words included in each auto-generated lesson (Best, Worst, Unmastered, Lost Mastery). Editable from /admin/settings.'
)
ON CONFLICT (key) DO NOTHING;
