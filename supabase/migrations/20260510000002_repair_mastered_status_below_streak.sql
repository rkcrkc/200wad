-- Repair user_word_progress rows where status='mastered' but correct_streak<3.
--
-- The companion migration (20260510000001_repair_streak_status_drift.sql)
-- repairs the streak≥3 / status<mastered direction. This migration repairs
-- the opposite direction: rows where the persisted status is 'mastered' but
-- the streak is below the mastery threshold.
--
-- `updateWordTestProgress` (src/lib/mutations/test.ts) writes both fields
-- atomically: any non-`isCorrect` answer resets `correct_streak` to 0 and
-- demotes a previously-mastered word to 'learned' via the floor rule. In
-- normal operation they cannot diverge. Drift can however arise from:
--   - Pre-`learned` enum data (status was binary "learning"/"mastered" before
--     commit dad9e11 introduced "learned").
--   - Auto-lesson tests that aborted at the "Lesson not found" validation
--     before commit d0ccd19 — fixed, but historical data may already be
--     orphaned (test_questions inserted, word progress not updated).
--   - Silent step-5 failures inside completeTestSession: test_questions are
--     inserted before per-word progress updates, and a transient failure on
--     the latter is logged but doesn't roll back the former.
--
-- Symptom: word shows "Mastered" badge but the traffic-light dots show a
-- recent partial-credit (orange) attempt that should have demoted it.
--
-- Strategy: drop status from 'mastered' to 'learned' wherever the streak is
-- below the mastery threshold. `learned_at` is preserved (it's immutable
-- once set per the application code and is already non-null for any row
-- that was ever 'mastered'). `mastered_at` is intentionally left in place —
-- the existing migration treats first-time mastery as a historical fact,
-- not a current flag.

UPDATE user_word_progress
SET status = 'learned'
WHERE status = 'mastered'
  AND correct_streak < 3;
