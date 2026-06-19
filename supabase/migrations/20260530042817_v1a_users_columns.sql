-- ============================================================================
-- v1a Gamification — Add gamification columns to `users`
-- ============================================================================
--
-- First migration in the v1a gamification rollout. Adds cached balance /
-- aggregate columns needed by the new coin economy, XP system, streak freeze
-- primitive, daily goal, and personal-best surfaces.
--
-- All additions are NOT NULL with safe defaults or nullable, so this is a
-- pure additive change — no data movement, no behavioural change. Subsequent
-- migrations add the supporting tables (coin_transactions, achievements,
-- user_achievements), the RPCs that populate these columns (`award_coins`,
-- the extended `update_daily_activity`), and the seed data.
--
-- Write protection
-- ----------------
-- The coin/XP/PB columns are intended to be RPC-only writes via SECURITY
-- DEFINER functions (`award_coins`, `update_daily_activity`). Row-level
-- security on the `users` table already restricts updates to the user's
-- own row; column-level protection (so users can't bump their own
-- `coin_balance` directly) will be added in the same migration that
-- introduces `award_coins`. Until then no application code writes these
-- columns directly — the anon-key client has no surface that touches them.
--
-- `daily_xp_goal` is the one column the user is allowed to change directly
-- (it's their setting). It defaults to 30 — roughly one perfect 10-word
-- lesson test — and is user-configurable from the settings UI when that
-- ships. The Casual / Regular / Serious chooser is deferred to v2.
--
-- `streak_freezes_available DEFAULT 1` is the launch grant for new users.
-- Existing users get the same grant via a later backfill migration
-- (idempotent: only applied where the value is still 0).
--
-- Idempotency
-- -----------
-- `ADD COLUMN IF NOT EXISTS` makes the column adds re-runnable. CHECK
-- clauses are part of the column definition and are skipped on a no-op
-- re-run.
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS coin_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_xp integer NOT NULL DEFAULT 0
    CHECK (lifetime_xp >= 0),
  ADD COLUMN IF NOT EXISTS streak_freezes_available integer NOT NULL DEFAULT 1
    CHECK (streak_freezes_available >= 0),
  ADD COLUMN IF NOT EXISTS daily_xp_goal integer NOT NULL DEFAULT 30
    CHECK (daily_xp_goal > 0),
  ADD COLUMN IF NOT EXISTS pb_day_test_points integer
    CHECK (pb_day_test_points IS NULL OR pb_day_test_points >= 0),
  ADD COLUMN IF NOT EXISTS pb_day_test_points_at date,
  ADD COLUMN IF NOT EXISTS pb_week_test_points integer
    CHECK (pb_week_test_points IS NULL OR pb_week_test_points >= 0),
  ADD COLUMN IF NOT EXISTS pb_week_test_points_at date,
  ADD COLUMN IF NOT EXISTS pb_session_score_percent integer
    CHECK (pb_session_score_percent IS NULL OR pb_session_score_percent BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS pb_session_score_at timestamptz;

-- ----------------------------------------------------------------------------
-- Column documentation
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN users.coin_balance IS
  'Cached spendable coin balance. Source of truth is SUM(amount) from coin_transactions WHERE status=''confirmed''. Bumped exclusively by the award_coins RPC; never written directly from application code. v1a awards coins on perfect test answers, lesson/course mastery, day-streak milestones, daily goal completion, and achievement unlocks.';

COMMENT ON COLUMN users.lifetime_xp IS
  'Cached lifetime experience points, raw and never multiplied. Source of truth is SUM(points_earned) from test_questions for sessions belonging to this user. Drives levels (v1b) and all-time leaderboards. Kept separate from coins so spending coins does not visibly de-level the user.';

COMMENT ON COLUMN users.streak_freezes_available IS
  'Number of streak freeze tokens currently held. Each freeze covers one missed day and is auto-consumed by update_daily_activity when a gap is detected (decrement, write streak_frozen=true row for the missed day, preserve current_streak). Default 1 = launch grant for new users; existing users get the same grant via a backfill migration.';

COMMENT ON COLUMN users.daily_xp_goal IS
  'Target XP the user aims to earn per day. Default 30 (~one perfect 10-word lesson). Scope is total XP across all languages. User-configurable from settings; Casual/Regular/Serious chooser deferred to v2.';

COMMENT ON COLUMN users.pb_day_test_points IS
  'Personal best: highest single-day test points earned across all languages. NULL until first PB set. Updated by update_daily_activity after PB comparison; firing personal_best.day notification template on break.';

COMMENT ON COLUMN users.pb_day_test_points_at IS
  'Date on which the day PB was set. NULL until first PB.';

COMMENT ON COLUMN users.pb_week_test_points IS
  'Personal best: highest ISO-week test points earned across all languages. NULL until first PB set.';

COMMENT ON COLUMN users.pb_week_test_points_at IS
  'Week-start date of the week in which the week PB was set. NULL until first PB.';

COMMENT ON COLUMN users.pb_session_score_percent IS
  'Personal best: highest score_percent achieved on a single test session. NULL until first PB set.';

COMMENT ON COLUMN users.pb_session_score_at IS
  'Timestamp of the session on which the session PB was set. NULL until first PB.';
