
-- Recalculate lessons.word_count excluding words with category = 'information'
UPDATE lessons l
SET word_count = sub.cnt
FROM (
  SELECT lw.lesson_id, COUNT(*) AS cnt
  FROM lesson_words lw
  JOIN words w ON w.id = lw.word_id
  WHERE w.category IS DISTINCT FROM 'information'
  GROUP BY lw.lesson_id
) sub
WHERE l.id = sub.lesson_id;

-- Set word_count to 0 for lessons that only have information words
UPDATE lessons l
SET word_count = 0
WHERE l.id IN (
  SELECT lw.lesson_id
  FROM lesson_words lw
  JOIN words w ON w.id = lw.word_id
  GROUP BY lw.lesson_id
  HAVING COUNT(*) FILTER (WHERE w.category IS DISTINCT FROM 'information') = 0
)
AND l.word_count > 0;

-- Recalculate courses.word_count as sum of their lessons' word_counts
UPDATE courses c
SET word_count = sub.total
FROM (
  SELECT l.course_id, COALESCE(SUM(l.word_count), 0) AS total
  FROM lessons l
  GROUP BY l.course_id
) sub
WHERE c.id = sub.course_id;
