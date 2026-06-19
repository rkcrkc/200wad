
-- Add learned_at column to user_word_progress
ALTER TABLE user_word_progress ADD COLUMN IF NOT EXISTS learned_at timestamptz;

-- Update the check constraint to include 'learned'
ALTER TABLE user_word_progress DROP CONSTRAINT user_word_progress_status_check;
ALTER TABLE user_word_progress ADD CONSTRAINT user_word_progress_status_check 
  CHECK (status = ANY (ARRAY['not-started'::text, 'learning'::text, 'learned'::text, 'mastered'::text]));

-- Migrate existing "learning" words that have been correct at least once (best_clue_level is not null) to "learned"
UPDATE user_word_progress
SET status = 'learned',
    learned_at = COALESCE(learning_at, created_at, now())
WHERE status = 'learning'
  AND best_clue_level IS NOT NULL
  AND best_clue_level < 999;

-- Backfill learned_at for "mastered" words (they were correct before mastering)
UPDATE user_word_progress
SET learned_at = COALESCE(learning_at, mastered_at, created_at, now())
WHERE status = 'mastered'
  AND learned_at IS NULL;
