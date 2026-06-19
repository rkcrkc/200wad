-- v1b: store each user's IANA timezone so "a day" can be bucketed by the
-- user's local calendar day instead of UTC.
--
-- Background: daily activity is bucketed by date (user_daily_activity.activity_
-- date) and "today" was computed from the server's UTC date on both the write
-- (update_daily_activity RPC, CURRENT_DATE) and read (daily-goal query,
-- new Date().toISOString()) paths. For a user east/west of UTC this resets the
-- daily-goal ring at UTC midnight — e.g. 08:00 local for a UTC+8 user — rather
-- than their local midnight. Storing the timezone lets the day boundary follow
-- the user.
--
-- IANA name (e.g. 'Asia/Makassar', 'Europe/London'); defaults to 'UTC' so all
-- existing rows and any user whose browser hasn't synced yet behave exactly as
-- before. The column is consumed by migration 023's update_daily_activity and
-- the client syncs the browser value via the syncUserTimezone server action.
--
-- This also unblocks the deferred time-of-day mystery achievements
-- (night_owl / early_bird) referenced in migration 7's notes.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

COMMENT ON COLUMN public.users.timezone IS
  'IANA timezone name (e.g. ''Asia/Makassar'') used to bucket daily activity by the user''s local calendar day. Defaults to ''UTC''. Synced from the browser via syncUserTimezone.';
