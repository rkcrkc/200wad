-- Backfill `user_word_progress` streak/status from `test_questions` history,
-- aggregated per `test_score_id` (per-test, not per-direction).
--
-- Bug 1: until now each `test_question` row (one per direction — EN→IT / IT→EN)
-- was treated as a separate "attempt" for `correct_streak` increments. A test
-- where one direction was wrong reset the streak while still contributing a
-- green dot for the other direction. We're aligning both around the
-- per-test-attempt unit: a test counts as "correct" when ALL directions in
-- that single test scored full marks (sum(mistake_count) = 0 AND
-- max(clue_level) = 0).
--
-- This migration recomputes:
--   - correct_streak  : trailing run of full-mark tests (per test_score_id)
--   - status          : promoted to `mastered` when streak >= 3; floored at
--                       `learned` when any historical full-mark test exists;
--                       floored at `learning` when any test history exists
--   - mastered_at     : set when newly mastered AND currently NULL
--   - learned_at      : set when newly at-least-learned AND currently NULL
--   - learning_at     : set when any history exists AND currently NULL
--   - last_mistake_count : aggregate mistake_count of most recent test
--   - best_clue_level : min clue_level across all full-mark tests
--
-- Times_tested intentionally NOT recomputed here — it will start counting
-- per-test from the next test taken (post-app-update). Past divergence is
-- accepted as historical noise; the streak invariant is what matters.

WITH per_test AS (
  -- Aggregate test_questions by (user, word, test_score) — collapse the
  -- per-direction rows into one row per test attempt.
  SELECT
    uts.user_id,
    tq.word_id,
    tq.test_score_id,
    SUM(COALESCE(tq.mistake_count, 0))    AS agg_mistake_count,
    MAX(COALESCE(tq.clue_level, 0))        AS agg_clue_level,
    SUM(COALESCE(tq.points_earned, 0))     AS agg_points_earned,
    SUM(COALESCE(tq.max_points, 3))        AS agg_max_points,
    MAX(tq.answered_at)                    AS answered_at
  FROM test_questions tq
  JOIN user_test_scores uts ON uts.id = tq.test_score_id
  WHERE tq.word_id IS NOT NULL
  GROUP BY uts.user_id, tq.word_id, tq.test_score_id
),
ranked AS (
  -- Order per (user, word) chronologically. We replay the streak rule below.
  SELECT
    *,
    (agg_mistake_count = 0 AND agg_clue_level = 0) AS is_perfect,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, word_id
      ORDER BY answered_at ASC
    ) AS chrono_idx,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, word_id
      ORDER BY answered_at DESC
    ) AS reverse_idx
  FROM per_test
),
trailing_streaks AS (
  -- The trailing streak is the count of consecutive perfect tests from the
  -- most recent backwards. We find, for each (user, word), the position of
  -- the most recent imperfect test (reverse_idx). Everything more recent than
  -- that is the trailing run.
  SELECT
    user_id,
    word_id,
    -- Reverse_idx of the most-recent imperfect test (NULL if all perfect).
    MIN(CASE WHEN NOT is_perfect THEN reverse_idx END) AS first_imperfect_reverse_idx,
    COUNT(*) AS total_tests,
    SUM(CASE WHEN is_perfect THEN 1 ELSE 0 END) AS perfect_count,
    MAX(answered_at) AS last_answered_at,
    -- For best_clue_level: min clue across perfect tests
    MIN(CASE WHEN is_perfect THEN agg_clue_level END) AS best_clue_when_perfect
  FROM ranked
  GROUP BY user_id, word_id
),
most_recent_test AS (
  -- For last_mistake_count we need the aggregate mistake_count of the
  -- chronologically last test.
  SELECT
    user_id,
    word_id,
    agg_mistake_count AS last_mistake_count
  FROM ranked
  WHERE reverse_idx = 1
),
agg AS (
  SELECT
    ts.user_id,
    ts.word_id,
    -- New streak: if there are no imperfect tests, streak = total_tests.
    -- Otherwise streak = (reverse_idx of first imperfect) - 1.
    CASE
      WHEN ts.first_imperfect_reverse_idx IS NULL THEN ts.total_tests
      ELSE ts.first_imperfect_reverse_idx - 1
    END AS new_streak,
    ts.perfect_count,
    ts.total_tests,
    ts.last_answered_at,
    ts.best_clue_when_perfect,
    mrt.last_mistake_count
  FROM trailing_streaks ts
  LEFT JOIN most_recent_test mrt
    ON mrt.user_id = ts.user_id AND mrt.word_id = ts.word_id
)
UPDATE user_word_progress uwp
SET
  correct_streak = agg.new_streak,
  status = CASE
    WHEN agg.new_streak >= 3 THEN 'mastered'
    -- Floor: if user ever scored full marks on this word, status >= learned.
    WHEN agg.perfect_count > 0 AND uwp.status IN ('not-started', 'learning')
      THEN 'learned'
    -- Floor: any test history means at least 'learning'.
    WHEN agg.total_tests > 0 AND uwp.status = 'not-started'
      THEN 'learning'
    -- Demote mastered → learned when the trailing streak isn't there
    -- (floor: never below learned, since they had at least one perfect test
    -- to get mastered in the first place — protected by the previous
    -- branches when applicable).
    WHEN uwp.status = 'mastered' AND agg.new_streak < 3
      THEN 'learned'
    ELSE uwp.status
  END,
  -- Best clue level: lowest clue across perfect tests, never worse than what
  -- we already have stored.
  best_clue_level = LEAST(
    COALESCE(uwp.best_clue_level, 2),
    COALESCE(agg.best_clue_when_perfect, 2)
  ),
  -- Last mistake count: from the most recent test (aggregated across
  -- directions in that test).
  last_mistake_count = COALESCE(agg.last_mistake_count, uwp.last_mistake_count),
  -- First-set timestamps — only fill when missing.
  mastered_at = CASE
    WHEN agg.new_streak >= 3
      THEN COALESCE(uwp.mastered_at, agg.last_answered_at)
    ELSE uwp.mastered_at
  END,
  learned_at = CASE
    WHEN agg.new_streak >= 3 OR agg.perfect_count > 0
      THEN COALESCE(uwp.learned_at, agg.last_answered_at)
    ELSE uwp.learned_at
  END,
  learning_at = CASE
    WHEN agg.total_tests > 0
      THEN COALESCE(uwp.learning_at, agg.last_answered_at)
    ELSE uwp.learning_at
  END
FROM agg
WHERE uwp.user_id = agg.user_id
  AND uwp.word_id = agg.word_id;
