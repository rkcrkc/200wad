-- Fix: Worst Words drops to 0 once a course is 100% mastered.
--
-- `select_best_worst_words_for_course` hard-excluded `status = 'mastered'`
-- for p_type = 'worst', so a user who mastered every word got an empty pool
-- by construction — the Special Lessons card disappeared and the scheduler's
-- weekly review (getWorstWordsAutoLesson in src/lib/queries/schedule.ts) went
-- silent forever, even though those users still had hundreds of words they had
-- historically scored badly on.
--
-- Mastery is a *status*; Worst Words is a *ranking*. The status-based job is
-- already covered by the `unmastered` (correct_streak < 3) and `lost_mastery`
-- (previously mastered, since regressed) auto-lessons, so filtering on it here
-- both broke the feature and duplicated those two.
--
-- Behaviour vs. the previously live version (applied as 20260520045934):
--   * worst: mastered words are no longer excluded. They are sorted *last*
--     instead, so non-mastered words still fill the list first and the mastered
--     ones only form the tail.
--   * worst: words with a flawless lifetime record (avg_ratio = 1) are now
--     excluded. `test_questions.max_points` is 3 on every row and
--     `points_earned` is 0..3, so avg_ratio is bounded to 0..1 and `< 1` means
--     "got this wrong, or needed a clue, at least once". A word you have never
--     missed is not a worst word — without this the list pads itself out with
--     perfect words to reach p_limit.
--   * best: restores the mastered-first / correct_streak / total_points
--     tiebreakers from 20260516072540, leaving `best` no longer ranked on
--     average score alone.
--   * both: restores `w.category IS DISTINCT FROM 'information'` from
--     20260516072559. Information words are reference pages, not testable
--     vocabulary; the detail page strips them client-side, so without this the
--     All Lessons summary card reports a higher word_count than the detail page
--     can ever show.
--
-- Where those two regressions came from (per supabase_migrations.schema_migrations,
-- which is the only trustworthy record here — several local filenames carry
-- different timestamps than their applied versions):
--   20260519014048_auto_lesson_word_limit.sql only meant to change
--   `p_limit DEFAULT 20` -> `10`, but it pasted the original 20260514000001 body
--   to do it, silently reverting three migrations in one hop: 20260516072523
--   (mastered-first), 20260516072540 (streak/total tiebreak) and 20260516072559
--   (information filter). 20260520045934 then faithfully copied that
--   already-regressed body while repairing the user_test_scores -> test_sessions
--   rename, so it propagated the loss rather than causing it.
--
-- Lesson: never re-paste a function body to change one default. Use the latest
-- definition as the base, or the change silently reverts everything since.

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
      SUM(COALESCE(tq.points_earned, 0))::numeric AS total_points,
      SUM(COALESCE(tq.points_earned, 0))::numeric
        / NULLIF(COUNT(*) * 3, 0)::numeric AS avg_ratio
    FROM test_questions tq
    JOIN test_sessions ts ON ts.id = tq.test_session_id
    JOIN words w ON w.id = tq.word_id
    WHERE ts.user_id = auth.uid()
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
    -- worst: only words actually got wrong at least once.
    AND (p_type = 'best' OR ws.avg_ratio < 1)
  ORDER BY
    -- Each CASE collapses to NULL for the other type, making it a no-op there.
    -- worst: non-mastered first (false sorts before true), so mastered words
    -- only appear once the non-mastered pool is exhausted.
    CASE WHEN p_type = 'worst' THEN COALESCE(wp.is_mastered, false) END ASC,
    -- best: mastered words first, then avg, then streak, then total.
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
