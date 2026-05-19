-- Add study_session_id idempotency key to test_sessions.
--
-- The old dedup logic ("any test_session for this user+lesson within the
-- last 30 seconds means we already saved") silently swallowed legitimate
-- quick retests and double-counted slow retries. The correct unit of
-- idempotency is the client-side test session, which is already minted
-- as a study_sessions.id by createTestSession(). Keying on that id makes
-- "did we already save this test?" deterministic and time-independent.

ALTER TABLE test_sessions
  ADD COLUMN study_session_id UUID NULL
    REFERENCES study_sessions(id) ON DELETE SET NULL;

-- Backfill: link historical test_sessions to their study_sessions when
-- the pair is mutually unambiguous (each side matches exactly the other).
-- Ambiguous pairs stay NULL — that's fine because Postgres allows multiple
-- NULLs in a UNIQUE column, and the long tail of pre-backfill rows simply
-- has no idempotency key.
WITH pairs AS (
  SELECT
    ts.id AS test_session_id,
    ss.id AS study_session_id,
    COUNT(*) OVER (PARTITION BY ts.id) AS test_match_count,
    COUNT(*) OVER (PARTITION BY ss.id) AS study_match_count
  FROM test_sessions ts
  JOIN study_sessions ss
    ON ss.user_id = ts.user_id
   AND (
     (ts.lesson_id IS NOT NULL AND ss.lesson_id = ts.lesson_id)
     OR (ts.auto_lesson_type IS NOT NULL
         AND ss.auto_lesson_type = ts.auto_lesson_type
         AND ss.course_id = ts.course_id)
   )
   AND ss.session_type = 'test'
   AND ts.taken_at IS NOT NULL
   AND ss.started_at IS NOT NULL
   AND ABS(EXTRACT(EPOCH FROM (ss.started_at - ts.taken_at))) < 120
)
UPDATE test_sessions ts
SET study_session_id = pairs.study_session_id
FROM pairs
WHERE ts.id = pairs.test_session_id
  AND pairs.test_match_count = 1
  AND pairs.study_match_count = 1;

-- Enforce uniqueness on populated values. Postgres treats multiple NULLs
-- as distinct under UNIQUE, which is what we want for unlinkable history.
ALTER TABLE test_sessions
  ADD CONSTRAINT test_sessions_study_session_id_unique
    UNIQUE (study_session_id);

CREATE INDEX idx_test_sessions_study_session_id
  ON test_sessions(study_session_id);
