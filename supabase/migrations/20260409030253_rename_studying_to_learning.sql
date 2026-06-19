
-- 1. Drop existing CHECK constraints first
ALTER TABLE user_word_progress DROP CONSTRAINT IF EXISTS user_word_progress_status_check;
ALTER TABLE user_lesson_progress DROP CONSTRAINT IF EXISTS user_lesson_progress_status_check;

-- 2. Update existing rows
UPDATE user_word_progress SET status = 'learning' WHERE status = 'studying';
UPDATE user_lesson_progress SET status = 'learning' WHERE status = 'studying';

-- 3. Re-create CHECK constraints with new values
ALTER TABLE user_word_progress ADD CONSTRAINT user_word_progress_status_check
  CHECK (status IN ('not-started', 'learning', 'mastered'));
ALTER TABLE user_lesson_progress ADD CONSTRAINT user_lesson_progress_status_check
  CHECK (status IN ('not-started', 'learning', 'mastered'));
