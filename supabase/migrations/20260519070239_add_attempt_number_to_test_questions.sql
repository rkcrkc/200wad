-- Add attempt_number to test_questions.
--
-- A "Test Twice" session can write two test_questions rows for the same
-- (test_session_id, word_id). Today the only way to tell which was first
-- is to compare answered_at, which is fragile when two rows land within
-- the same millisecond. attempt_number is the canonical disambiguator:
-- 1 = first attempt in the session, 2 = second attempt, etc.

ALTER TABLE test_questions
  ADD COLUMN attempt_number SMALLINT;

-- Backfill: number existing rows per (test_session_id, word_id) by
-- answered_at first, falling back to id for stable ordering.
WITH numbered AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY test_session_id, word_id
      ORDER BY answered_at NULLS LAST, id
    ) AS n
  FROM test_questions
)
UPDATE test_questions tq
SET attempt_number = numbered.n
FROM numbered
WHERE tq.id = numbered.id;

ALTER TABLE test_questions
  ALTER COLUMN attempt_number SET NOT NULL,
  ALTER COLUMN attempt_number SET DEFAULT 1;

CREATE INDEX idx_test_questions_session_word_attempt
  ON test_questions(test_session_id, word_id, attempt_number);
