-- ============================================================================
-- ADMIN SCHEMA UPDATES
-- Adds is_published, audit columns, and derived count triggers
-- ============================================================================

-- ============================================================================
-- 1. ADD is_published TO COURSES AND LESSONS
-- ============================================================================

-- Add is_published to courses (controls visibility of entire course)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Add is_published to lessons (controls individual lesson visibility)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Set all existing courses and lessons as published (so they remain visible)
UPDATE courses SET is_published = true WHERE is_published IS NULL OR is_published = false;
UPDATE lessons SET is_published = true WHERE is_published IS NULL OR is_published = false;

-- ============================================================================
-- 2. ADD AUDIT COLUMNS
-- ============================================================================

-- Add audit columns to languages
ALTER TABLE languages ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE languages ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add audit columns to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add audit columns to lessons
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add audit columns to words
ALTER TABLE words ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE words ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add audit columns to example_sentences
ALTER TABLE example_sentences ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE example_sentences ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- ============================================================================
-- 3. DERIVED COUNT TRIGGERS
-- ============================================================================

-- Function to update lesson word_count when words are added/removed
CREATE OR REPLACE FUNCTION update_lesson_word_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lessons 
    SET word_count = (SELECT COUNT(*) FROM words WHERE lesson_id = NEW.lesson_id)
    WHERE id = NEW.lesson_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lessons 
    SET word_count = (SELECT COUNT(*) FROM words WHERE lesson_id = OLD.lesson_id)
    WHERE id = OLD.lesson_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.lesson_id != OLD.lesson_id THEN
    -- Word moved to different lesson
    UPDATE lessons 
    SET word_count = (SELECT COUNT(*) FROM words WHERE lesson_id = OLD.lesson_id)
    WHERE id = OLD.lesson_id;
    UPDATE lessons 
    SET word_count = (SELECT COUNT(*) FROM words WHERE lesson_id = NEW.lesson_id)
    WHERE id = NEW.lesson_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for lesson word_count
DROP TRIGGER IF EXISTS trigger_update_lesson_word_count ON words;
CREATE TRIGGER trigger_update_lesson_word_count
AFTER INSERT OR DELETE OR UPDATE OF lesson_id ON words
FOR EACH ROW EXECUTE FUNCTION update_lesson_word_count();

-- Function to update course total_lessons and word_count when lessons change
CREATE OR REPLACE FUNCTION update_course_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE courses 
    SET 
      total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id = NEW.course_id),
      word_count = (SELECT COALESCE(SUM(word_count), 0) FROM lessons WHERE course_id = NEW.course_id)
    WHERE id = NEW.course_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE courses 
    SET 
      total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id = OLD.course_id),
      word_count = (SELECT COALESCE(SUM(word_count), 0) FROM lessons WHERE course_id = OLD.course_id)
    WHERE id = OLD.course_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.course_id != OLD.course_id THEN
      -- Lesson moved to different course
      UPDATE courses 
      SET 
        total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id = OLD.course_id),
        word_count = (SELECT COALESCE(SUM(word_count), 0) FROM lessons WHERE course_id = OLD.course_id)
      WHERE id = OLD.course_id;
      UPDATE courses 
      SET 
        total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id = NEW.course_id),
        word_count = (SELECT COALESCE(SUM(word_count), 0) FROM lessons WHERE course_id = NEW.course_id)
      WHERE id = NEW.course_id;
    ELSIF NEW.word_count != OLD.word_count THEN
      -- Word count changed within same course
      UPDATE courses 
      SET word_count = (SELECT COALESCE(SUM(word_count), 0) FROM lessons WHERE course_id = NEW.course_id)
      WHERE id = NEW.course_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for course counts
DROP TRIGGER IF EXISTS trigger_update_course_counts ON lessons;
CREATE TRIGGER trigger_update_course_counts
AFTER INSERT OR DELETE OR UPDATE OF course_id, word_count ON lessons
FOR EACH ROW EXECUTE FUNCTION update_course_counts();

-- ============================================================================
-- 4. UPDATE RLS POLICIES FOR PUBLISHED CONTENT
-- ============================================================================

-- Drop existing public read policies (named "Public read" from initial migration)
-- and recreate with is_published filter
DROP POLICY IF EXISTS "Public read" ON courses;
DROP POLICY IF EXISTS "Courses are viewable by everyone" ON courses;
CREATE POLICY "Courses are viewable by everyone" ON courses
  FOR SELECT USING (is_published = true OR is_admin());

DROP POLICY IF EXISTS "Public read" ON lessons;
DROP POLICY IF EXISTS "Lessons are viewable by everyone" ON lessons;
CREATE POLICY "Lessons are viewable by everyone" ON lessons
  FOR SELECT USING (is_published = true OR is_admin());

-- ============================================================================
-- 5. INDEXES FOR NEW COLUMNS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_courses_is_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_lessons_is_published ON lessons(is_published);
