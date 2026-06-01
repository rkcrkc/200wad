-- ============================================================================
-- v1a Gamification — Add streak-freeze + daily-goal columns to user_daily_activity
-- ============================================================================
--
-- Second migration in the v1a gamification rollout. Extends the per-day,
-- per-language activity rollup with two booleans:
--
--   * streak_frozen   — true on a row written by `update_daily_activity` to
--                       cover a missed day, paid for by a streak freeze token.
--                       The row carries no test activity (zeros / nulls); its
--                       sole purpose is to preserve `current_streak` continuity
--                       and act as the audit trail for "a freeze was used on
--                       this date for this language".
--   * daily_goal_met  — true on the first activity row of a (user, date) at
--                       which the user's cross-language lifetime_xp delta for
--                       that day reaches their `daily_xp_goal`. Sticky once
--                       set; never flipped back to false within the day.
--
-- Both are safe additive booleans with sensible defaults (`false`). No data
-- movement, no behavioural change until `update_daily_activity` is extended
-- (migration 6) to write them.
--
-- Note on `streak_frozen` rows + composite PK
-- -------------------------------------------
-- `user_daily_activity` is keyed by `(user_id, language_id, activity_date)`
-- with `language_id` NOT NULL. A streak freeze covers the user's day-streak,
-- which is global (cross-language) — but we still need a concrete
-- `language_id` to insert a row. The extended `update_daily_activity` will
-- write the freeze row against the language being passed into the RPC at the
-- moment the freeze triggers (i.e. the language the user is studying when
-- they return after a gap). This is acceptable because:
--   1. Day-streak math reads `EXISTS` per date across all languages, so the
--      single freeze row on any language satisfies the continuity check.
--   2. UI surfaces "you used a freeze on <date>" without per-language framing.
--   3. Multi-day gaps consume one token per missed day; the same `language_id`
--      is used for every backfill row in a single RPC call, which keeps the
--      writes simple and deterministic.
--
-- Idempotency
-- -----------
-- `ADD COLUMN IF NOT EXISTS` makes the column adds re-runnable. The DEFAULT
-- false propagates to existing rows on the first run and is a no-op on
-- re-runs.
-- ============================================================================

ALTER TABLE user_daily_activity
  ADD COLUMN IF NOT EXISTS streak_frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_goal_met boolean NOT NULL DEFAULT false;

-- ----------------------------------------------------------------------------
-- Column documentation
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN user_daily_activity.streak_frozen IS
  'True when this row was synthesised by update_daily_activity to cover a missed day using a streak freeze token. The row will carry no real activity (zeroed test_points/words/study_time) and exists only to preserve current_streak continuity and provide an audit trail. Multi-day gaps produce one frozen row per missed date, each consuming one token from users.streak_freezes_available. The row is written against the language_id the user is studying when they return — day-streak math reads EXISTS per date across all languages, so a single row per date is sufficient.';

COMMENT ON COLUMN user_daily_activity.daily_goal_met IS
  'True once the user has earned enough XP across all languages on this date to meet users.daily_xp_goal. Set sticky on the activity row that crosses the threshold; never flipped back to false within the day. Drives the dashboard daily-goal ring fill state and the once-per-day goal_completion notification template.';
