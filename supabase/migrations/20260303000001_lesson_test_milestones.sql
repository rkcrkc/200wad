-- Add milestone tracking columns to user_lesson_progress
-- These track when the next scheduled test is due for each lesson

ALTER TABLE user_lesson_progress
ADD COLUMN next_milestone TEXT,
ADD COLUMN next_test_due_at TIMESTAMPTZ;

-- Add index for efficient due test queries
CREATE INDEX idx_user_lesson_progress_due_tests
ON user_lesson_progress(user_id, next_test_due_at)
WHERE next_milestone IS NOT NULL;

-- Add comment explaining valid milestone values
COMMENT ON COLUMN user_lesson_progress.next_milestone IS
'Valid values: initial, 1-day, 1-week, 1-month, 1-quarter, 1-year, or NULL when complete';
