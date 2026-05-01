-- Treat "available" points as 3 per attempt regardless of clue use.
-- Clues now reduce points_earned only, never max_points.
--
-- Before: max_points = 3 - clue_level (per question), and user_test_scores.max_points
--         was the sum of those reduced per-question maxes.
-- After:  max_points = 3 (per question), and user_test_scores.max_points
--         = total_questions * 3.
--
-- score_percent is recomputed from points_earned / max_points so historical
-- "Average score" popovers and test history show the new percentages.

-- 1. Per-question backfill: every test_question max is 3.
UPDATE test_questions
SET max_points = 3
WHERE max_points <> 3;

-- 2. Per-test backfill: max_points = total_questions * 3, then recompute score_percent.
UPDATE user_test_scores
SET max_points = total_questions * 3
WHERE total_questions IS NOT NULL
  AND total_questions > 0
  AND max_points <> total_questions * 3;

UPDATE user_test_scores
SET score_percent = ROUND((points_earned::numeric / max_points::numeric) * 100)::int
WHERE max_points > 0;
