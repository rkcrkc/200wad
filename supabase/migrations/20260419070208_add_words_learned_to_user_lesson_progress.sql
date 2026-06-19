
-- Add words_learned column (count of words with status 'learned' or 'mastered')
ALTER TABLE user_lesson_progress ADD COLUMN words_learned integer DEFAULT 0;

-- Backfill from actual user_word_progress data
UPDATE user_lesson_progress ulp
SET words_learned = COALESCE(sub.learned_count, 0)
FROM (
  SELECT ulp2.id,
    COUNT(DISTINCT CASE WHEN uwp.status IN ('learned', 'mastered') THEN uwp.word_id END) as learned_count
  FROM user_lesson_progress ulp2
  JOIN lesson_words lw ON lw.lesson_id = ulp2.lesson_id
  JOIN words w ON w.id = lw.word_id AND COALESCE(w.category, '') != 'information'
  LEFT JOIN user_word_progress uwp ON uwp.word_id = lw.word_id AND uwp.user_id = ulp2.user_id
  GROUP BY ulp2.id
) sub
WHERE ulp.id = sub.id;
