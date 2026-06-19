-- =============================================================================
-- notifications_last_seen_at on users
-- =============================================================================
-- Tracks the timestamp the user last opened the notifications dropdown.
--
-- Used to compute the bell badge count:
--   badge = COUNT(notifications WHERE created_at > users.notifications_last_seen_at
--                                AND channel = 'in_app'
--                                AND dismissed_at IS NULL
--                                AND (expires_at IS NULL OR expires_at > now()))
--
-- Per-row `is_read` is unchanged and still drives the visual style of individual
-- rows in the dropdown. The badge tracks "new since you last looked" — opening
-- the bell clears the badge without auto-marking each row as read.
-- =============================================================================

ALTER TABLE users
  ADD COLUMN notifications_last_seen_at TIMESTAMPTZ;

COMMENT ON COLUMN users.notifications_last_seen_at IS
  'When the user last opened the notifications dropdown. Drives the unread badge count; per-row is_read remains independent.';
