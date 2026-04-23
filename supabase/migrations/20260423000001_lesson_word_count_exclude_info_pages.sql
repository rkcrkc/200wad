-- Fix update_lesson_word_count() trigger to exclude information pages from
-- lesson.word_count. Information pages (category = 'information') are
-- non-testable content and must not be included in language/course/lesson
-- word totals shown to users.
--
-- This also cascades to course.word_count via update_course_counts() which
-- sums lesson.word_count.

CREATE OR REPLACE FUNCTION update_lesson_word_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lessons
    SET word_count = (
      SELECT COUNT(*)
      FROM lesson_words lw
      JOIN words w ON w.id = lw.word_id
      WHERE lw.lesson_id = NEW.lesson_id
        AND w.category IS DISTINCT FROM 'information'
    )
    WHERE id = NEW.lesson_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lessons
    SET word_count = (
      SELECT COUNT(*)
      FROM lesson_words lw
      JOIN words w ON w.id = lw.word_id
      WHERE lw.lesson_id = OLD.lesson_id
        AND w.category IS DISTINCT FROM 'information'
    )
    WHERE id = OLD.lesson_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Also recompute lesson.word_count whenever a word's category changes
-- (e.g. admin promoting/demoting a word to/from an information page).
CREATE OR REPLACE FUNCTION update_lesson_word_count_on_category_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act if category actually transitioned into or out of 'information'
  IF (OLD.category IS DISTINCT FROM 'information') <> (NEW.category IS DISTINCT FROM 'information') THEN
    UPDATE lessons l
    SET word_count = (
      SELECT COUNT(*)
      FROM lesson_words lw
      JOIN words w ON w.id = lw.word_id
      WHERE lw.lesson_id = l.id
        AND w.category IS DISTINCT FROM 'information'
    )
    WHERE l.id IN (SELECT lesson_id FROM lesson_words WHERE word_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lesson_word_count_on_category_change ON words;
CREATE TRIGGER trigger_update_lesson_word_count_on_category_change
AFTER UPDATE OF category ON words
FOR EACH ROW EXECUTE FUNCTION update_lesson_word_count_on_category_change();

-- Backfill: recompute all lesson.word_count values using the new rule.
UPDATE lessons l
SET word_count = COALESCE((
  SELECT COUNT(*)
  FROM lesson_words lw
  JOIN words w ON w.id = lw.word_id
  WHERE lw.lesson_id = l.id
    AND w.category IS DISTINCT FROM 'information'
), 0)
WHERE l.word_count IS DISTINCT FROM COALESCE((
  SELECT COUNT(*)
  FROM lesson_words lw
  JOIN words w ON w.id = lw.word_id
  WHERE lw.lesson_id = l.id
    AND w.category IS DISTINCT FROM 'information'
), 0);

-- Backfill course.word_count from sum of lesson.word_count.
UPDATE courses c
SET word_count = COALESCE((
  SELECT SUM(l.word_count)
  FROM lessons l
  WHERE l.course_id = c.id
), 0)
WHERE c.word_count IS DISTINCT FROM COALESCE((
  SELECT SUM(l.word_count)
  FROM lessons l
  WHERE l.course_id = c.id
), 0);
