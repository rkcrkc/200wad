-- Repair user_word_progress rows where `status` and `correct_streak` have drifted.
--
-- `updateWordTestProgress` (src/lib/mutations/test.ts) writes both fields
-- atomically: any row with `correct_streak >= 3` should also have
-- `status = 'mastered'`. In normal operation they cannot diverge, but legacy
-- data, manual fixes, partial resets, or import scripts can leave a row with
-- a high streak under a lower status. Such rows previously leaked into the
-- "Lost Mastery" and "Unmastered" auto-lessons.
--
-- Application code now defends against this in `selectLostMasteryWordIds` /
-- `selectUnmasteredWordIds`, but we still want the persisted state to be
-- correct so that mastery counts, completion stats, and the `mastered`
-- status badge agree with the streak.
--
-- Strategy: any row with `correct_streak >= 3` AND status in ('not-started',
-- 'learning', 'learned') is re-promoted to 'mastered'. Timestamps are
-- backfilled only when missing — `mastered_at` and `learned_at` are
-- intentionally immutable once set, so we use last_studied_at (closest
-- historical proxy for when the streak was earned) and fall back to now().

UPDATE user_word_progress
SET
  status = 'mastered',
  mastered_at = COALESCE(mastered_at, last_studied_at, NOW()),
  learned_at = COALESCE(learned_at, last_studied_at, NOW()),
  learning_at = COALESCE(learning_at, last_studied_at, NOW())
WHERE correct_streak >= 3
  AND status IN ('not-started', 'learning', 'learned');
