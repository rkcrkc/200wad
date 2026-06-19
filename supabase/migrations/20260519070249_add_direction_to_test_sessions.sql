-- Add direction to test_sessions.
--
-- The client supports three test directions today (english-to-foreign,
-- foreign-to-english, picture-only) but none of that has been persisted —
-- the row says "you took a test" without recording which way it ran.
-- This column closes that gap so the history view can show direction
-- badges and so analytics can group by direction.

ALTER TABLE test_sessions
  ADD COLUMN direction TEXT;

-- Backfill: every historical row was implicitly english-to-foreign (the
-- default test type). No DB record of any other direction exists, so
-- there is no ambiguity to preserve.
UPDATE test_sessions SET direction = 'english-to-foreign' WHERE direction IS NULL;

ALTER TABLE test_sessions
  ALTER COLUMN direction SET NOT NULL,
  ADD CONSTRAINT test_sessions_direction_check
    CHECK (direction IN ('english-to-foreign','foreign-to-english','picture-only'));
