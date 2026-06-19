-- Backfill user_word_progress.correct_streak / status / *_at from
-- test_questions using the per-row rule (one streak attempt per
-- test_questions row, including the 2nd attempt of a Test Twice session).
--
-- Supersedes 20260515000002_backfill_streak_from_history.sql, which used
-- a per-(test_session) aggregation and demoted Test-Twice mastery
-- incorrectly. That older migration stays in the history; this one
-- re-derives the correct values on top.
--
-- Rules (matching updateWordTestProgress in src/lib/mutations/test.ts):
--   - is_perfect := mistake_count = 0 AND clue_level = 0
--   - correct_streak = length of trailing run of perfect attempts in
--     chronological order (most recent backwards)
--   - status:
--       streak >= 3 -> mastered
--       any perfect attempt + status was not-started/learning -> learned
--       any attempt at all + status was not-started -> learning
--       mastered + streak < 3 -> learned (floor: never below learned)
--       otherwise -> keep existing
--   - mastered_at: set on first mastery, never overwritten
--   - learned_at: set on first 'learned' transition, never overwritten
--   - learning_at: set on first 'learning' transition, never overwritten

WITH ranked AS (
  SELECT
    ts.user_id,
    tq.word_id,
    (COALESCE(tq.mistake_count,0) = 0 AND COALESCE(tq.clue_level,0) = 0) AS is_perfect,
    tq.answered_at,
    tq.id AS tq_id,
    ROW_NUMBER() OVER (
      PARTITION BY ts.user_id, tq.word_id
      ORDER BY tq.answered_at DESC NULLS LAST, tq.id DESC
    ) AS reverse_idx,
    COUNT(*) OVER (PARTITION BY ts.user_id, tq.word_id) AS total_attempts,
    SUM(CASE WHEN COALESCE(tq.mistake_count,0) = 0 AND COALESCE(tq.clue_level,0) = 0
             THEN 1 ELSE 0 END)
      OVER (PARTITION BY ts.user_id, tq.word_id) AS perfect_attempts
  FROM test_questions tq
  JOIN test_sessions ts ON ts.id = tq.test_session_id
  WHERE tq.word_id IS NOT NULL
),
agg AS (
  SELECT
    user_id, word_id,
    -- new_streak = position of first non-perfect, working backwards
    COALESCE(MIN(CASE WHEN NOT is_perfect THEN reverse_idx END), MAX(total_attempts) + 1) - 1
      AS new_streak,
    MAX(total_attempts)   AS total_attempts,
    MAX(perfect_attempts) AS perfect_attempts,
    MAX(answered_at)      AS last_at
  FROM ranked
  GROUP BY user_id, word_id
)
UPDATE user_word_progress uwp SET
  correct_streak = agg.new_streak,
  status = CASE
    WHEN agg.new_streak >= 3                                                   THEN 'mastered'
    WHEN agg.perfect_attempts > 0 AND uwp.status IN ('not-started','learning') THEN 'learned'
    WHEN agg.total_attempts   > 0 AND uwp.status = 'not-started'               THEN 'learning'
    WHEN uwp.status = 'mastered' AND agg.new_streak < 3                        THEN 'learned'
    ELSE uwp.status
  END,
  mastered_at = CASE
    WHEN agg.new_streak >= 3 THEN COALESCE(uwp.mastered_at, agg.last_at)
    ELSE uwp.mastered_at
  END,
  learned_at = CASE
    WHEN agg.new_streak >= 3 OR agg.perfect_attempts > 0
      THEN COALESCE(uwp.learned_at, agg.last_at)
    ELSE uwp.learned_at
  END,
  learning_at = CASE
    WHEN agg.total_attempts > 0 THEN COALESCE(uwp.learning_at, agg.last_at)
    ELSE uwp.learning_at
  END
FROM agg
WHERE uwp.user_id = agg.user_id AND uwp.word_id = agg.word_id;
