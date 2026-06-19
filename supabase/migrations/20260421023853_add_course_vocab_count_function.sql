
-- Returns the count of learned + mastered words for a given user scoped to a course.
-- Excludes information pages (category = 'information').
CREATE OR REPLACE FUNCTION get_course_vocab_count(p_user_id uuid, p_course_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT count(DISTINCT uwp.word_id)::integer
  FROM user_word_progress uwp
  JOIN lesson_words lw ON lw.word_id = uwp.word_id
  JOIN lessons l ON l.id = lw.lesson_id
  JOIN words w ON w.id = uwp.word_id
  WHERE uwp.user_id = p_user_id
    AND l.course_id = p_course_id
    AND uwp.status IN ('learned', 'mastered')
    AND (w.category IS NULL OR w.category != 'information');
$$;
