
-- Recalculate user_word_progress.status and correct_streak from actual test_questions data.
-- New "correct" definition: mistake_count = 0 AND clue_level = 0 (full 3/3 marks).
-- Previously isCorrect only checked mistakeCount === 0, ignoring clue usage.

WITH ranked_questions AS (
  SELECT 
    uts.user_id,
    tq.word_id,
    tq.mistake_count,
    tq.clue_level,
    tq.answered_at,
    CASE WHEN tq.mistake_count = 0 AND tq.clue_level = 0 THEN true ELSE false END AS is_full_marks,
    ROW_NUMBER() OVER (PARTITION BY uts.user_id, tq.word_id ORDER BY tq.answered_at DESC) AS rn
  FROM test_questions tq
  JOIN user_test_scores uts ON tq.test_score_id = uts.id
  WHERE tq.word_id IS NOT NULL
),
first_wrong AS (
  SELECT user_id, word_id, MIN(rn) AS first_wrong_rn
  FROM ranked_questions
  WHERE NOT is_full_marks
  GROUP BY user_id, word_id
),
new_streaks AS (
  SELECT 
    rq.user_id,
    rq.word_id,
    COALESCE(fw.first_wrong_rn - 1, MAX(rq.rn)) AS new_streak,
    BOOL_OR(rq.is_full_marks) AS has_any_full_marks
  FROM ranked_questions rq
  LEFT JOIN first_wrong fw ON rq.user_id = fw.user_id AND rq.word_id = fw.word_id
  GROUP BY rq.user_id, rq.word_id, fw.first_wrong_rn
),
new_status AS (
  SELECT 
    ns.user_id,
    ns.word_id,
    ns.new_streak::int AS new_streak,
    CASE 
      WHEN ns.new_streak >= 3 THEN 'mastered'
      WHEN ns.has_any_full_marks THEN 'learned'
      ELSE 'learning'
    END AS computed_status
  FROM new_streaks ns
)
UPDATE user_word_progress uwp
SET 
  correct_streak = nst.new_streak,
  status = nst.computed_status,
  -- Clear learned_at if demoting from learned/mastered to learning
  learned_at = CASE 
    WHEN nst.computed_status = 'learning' THEN NULL 
    ELSE uwp.learned_at 
  END,
  -- Clear mastered_at if demoting from mastered
  mastered_at = CASE 
    WHEN nst.computed_status != 'mastered' THEN NULL 
    ELSE uwp.mastered_at 
  END,
  updated_at = now()
FROM new_status nst
WHERE uwp.user_id = nst.user_id 
  AND uwp.word_id = nst.word_id
  AND (uwp.status != nst.computed_status OR uwp.correct_streak != nst.new_streak);
