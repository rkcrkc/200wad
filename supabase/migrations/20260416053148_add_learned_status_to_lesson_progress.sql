
-- Add 'learned' to the lesson progress status constraint
ALTER TABLE user_lesson_progress 
  DROP CONSTRAINT user_lesson_progress_status_check;

ALTER TABLE user_lesson_progress 
  ADD CONSTRAINT user_lesson_progress_status_check 
  CHECK (status = ANY (ARRAY['not-started'::text, 'learning'::text, 'learned'::text, 'mastered'::text]));

-- Recalculate lesson statuses based on corrected word statuses.
-- A lesson is:
--   mastered: all testable words are mastered (100%)
--   learned: all testable words are learned or mastered
--   learning: at least one word studied
--   not-started: no words studied
WITH lesson_word_stats AS (
  SELECT 
    ulp.id AS lesson_progress_id,
    ulp.user_id,
    ulp.lesson_id,
    COUNT(lw.word_id) FILTER (WHERE w.category IS DISTINCT FROM 'information') AS total_testable,
    COUNT(uwp.id) FILTER (WHERE w.category IS DISTINCT FROM 'information' AND uwp.status IN ('learning','learned','mastered')) AS words_studied,
    COUNT(uwp.id) FILTER (WHERE w.category IS DISTINCT FROM 'information' AND uwp.status IN ('learned','mastered')) AS words_learned_or_mastered,
    COUNT(uwp.id) FILTER (WHERE w.category IS DISTINCT FROM 'information' AND uwp.status = 'mastered') AS words_mastered
  FROM user_lesson_progress ulp
  JOIN lesson_words lw ON lw.lesson_id = ulp.lesson_id
  JOIN words w ON w.id = lw.word_id
  LEFT JOIN user_word_progress uwp ON uwp.word_id = lw.word_id AND uwp.user_id = ulp.user_id
  GROUP BY ulp.id, ulp.user_id, ulp.lesson_id
),
new_lesson_status AS (
  SELECT 
    lesson_progress_id,
    total_testable,
    words_mastered,
    CASE 
      WHEN total_testable > 0 AND words_mastered >= total_testable THEN 'mastered'
      WHEN total_testable > 0 AND words_learned_or_mastered >= total_testable THEN 'learned'
      WHEN words_studied > 0 THEN 'learning'
      ELSE 'not-started'
    END AS computed_status,
    CASE 
      WHEN total_testable > 0 THEN ROUND((words_mastered::numeric / total_testable) * 100)::int
      ELSE 0
    END AS computed_completion
  FROM lesson_word_stats
)
UPDATE user_lesson_progress ulp
SET 
  status = nls.computed_status,
  words_mastered = nls.words_mastered,
  completion_percent = nls.computed_completion,
  updated_at = now()
FROM new_lesson_status nls
WHERE ulp.id = nls.lesson_progress_id
  AND (ulp.status != nls.computed_status 
    OR ulp.words_mastered != nls.words_mastered
    OR ulp.completion_percent != nls.computed_completion);
