-- Add learning_at column to track when a word first transitioned to 'learning' status.
-- This enables Definition 1 "words/day" rate calculations and leaderboards that measure
-- learning velocity (distinct from mastery velocity, which uses mastered_at).

ALTER TABLE public.user_word_progress
  ADD COLUMN learning_at timestamptz;

-- Backfill: for existing rows already in learning or mastered status, use created_at
-- as the floor. A user_word_progress row only gets created when the user first
-- interacts with the word, so created_at is the earliest possible learning_at signal.
-- not-started rows (from `completeStudySession` notes-only inserts) intentionally
-- leave learning_at NULL so they don't contaminate the learning-rate denominator.
UPDATE public.user_word_progress
   SET learning_at = created_at
 WHERE status IN ('learning', 'mastered')
   AND learning_at IS NULL;

-- Partial index so per-user rate queries scan only rows with a learning timestamp.
-- Order DESC so range-scan "learning_at > now() - interval 'N days'" stays cheap.
CREATE INDEX IF NOT EXISTS user_word_progress_user_learning_at_idx
  ON public.user_word_progress (user_id, learning_at DESC)
  WHERE learning_at IS NOT NULL;

COMMENT ON COLUMN public.user_word_progress.learning_at IS
  'Timestamp when this word first transitioned from not-started to learning. Used for Definition 1 words/day rate calculations. NULL for not-started rows.';