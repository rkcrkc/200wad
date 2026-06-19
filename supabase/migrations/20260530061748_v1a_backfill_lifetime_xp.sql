-- ============================================================================
-- v1a Gamification — backfill `users.lifetime_xp`
-- ============================================================================
--
-- One-shot recompute of every user's `lifetime_xp` from the historical record.
-- Migration 1 added the column with DEFAULT 0; until this runs, every user is
-- stuck at zero regardless of how much they've already tested.
--
-- Source-of-truth formula
-- -----------------------
-- lifetime_xp = SUM(test_questions.points_earned over the user's sessions)
--             + SUM(achievements.xp_reward over the user's unlocks)
--
-- Why both terms:
--
--   * `test_questions.points_earned` is the canonical XP per answered question.
--     This is what `update_daily_activity` accumulates going forward via
--     `p_test_points_earned`. Re-summing it here gives us the true historical
--     baseline.
--
--   * `achievements.xp_reward` is the second (and only other) XP source in
--     v1a — `unlock_achievement` adds it directly to `users.lifetime_xp` on
--     first unlock. It is NOT recorded in `test_questions`, so a pure
--     test-points SUM would miss any achievement XP earned between migration
--     6 (when unlock_achievement landed) and this backfill. Today every
--     seeded achievement has xp_reward = 0, but admin tweaks or future seeds
--     may set it >0 — including the term now means the backfill stays
--     correct regardless.
--
-- Idempotency
-- -----------
-- Computes the full recompute and `UPDATE … WHERE lifetime_xp IS DISTINCT
-- FROM recomputed`. Re-running is a no-op for any user already in sync.
-- Running this AFTER additional tests / unlocks have happened is also safe:
-- it always converges on the source-of-truth SUM.
--
-- What this does NOT touch
-- ------------------------
-- * `coin_balance` — coins are forward-only, no retroactive grant (per the
--   plan's "Backfill plan" table). Untouched here.
-- * `streak_freezes_available` — separate backfill (migration 11).
-- * `pb_*` — separate backfill (migration 13).
-- * `current_streak` / `longest_streak` — already computed by the legacy
--   update_daily_activity path, no backfill needed.
--
-- Safety
-- ------
-- The recompute runs in a CTE and joins on existing PKs. No rows are
-- inserted; no rows are deleted. Only `users.lifetime_xp` and
-- `users.updated_at` are mutated.
-- ============================================================================

WITH
test_xp AS (
  SELECT ts.user_id, COALESCE(SUM(tq.points_earned), 0)::integer AS total
  FROM public.test_questions tq
  JOIN public.test_sessions ts ON ts.id = tq.test_session_id
  WHERE tq.points_earned IS NOT NULL
  GROUP BY ts.user_id
),
ach_xp AS (
  SELECT ua.user_id, COALESCE(SUM(a.xp_reward), 0)::integer AS total
  FROM public.user_achievements ua
  JOIN public.achievements a ON a.id = ua.achievement_id
  GROUP BY ua.user_id
),
recomputed AS (
  SELECT
    u.id,
    COALESCE(t.total, 0) + COALESCE(a.total, 0) AS lifetime_xp_new
  FROM public.users u
  LEFT JOIN test_xp t ON t.user_id = u.id
  LEFT JOIN ach_xp  a ON a.user_id = u.id
)
UPDATE public.users u
SET lifetime_xp = r.lifetime_xp_new,
    updated_at  = now()
FROM recomputed r
WHERE u.id = r.id
  AND u.lifetime_xp IS DISTINCT FROM r.lifetime_xp_new;

-- ----------------------------------------------------------------------------
-- Sanity assertions (run inside the migration so a failure aborts the txn)
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  v_total_xp_users   bigint;
  v_total_xp_source  bigint;
BEGIN
  SELECT COALESCE(SUM(lifetime_xp), 0) INTO v_total_xp_users
  FROM public.users;

  SELECT
    COALESCE((SELECT SUM(tq.points_earned)
              FROM public.test_questions tq
              JOIN public.test_sessions ts ON ts.id = tq.test_session_id), 0)
    +
    COALESCE((SELECT SUM(a.xp_reward)
              FROM public.user_achievements ua
              JOIN public.achievements a ON a.id = ua.achievement_id), 0)
  INTO v_total_xp_source;

  IF v_total_xp_users <> v_total_xp_source THEN
    RAISE EXCEPTION
      'v1a backfill_lifetime_xp: post-condition failed. SUM(users.lifetime_xp)=% but SUM(sources)=%',
      v_total_xp_users, v_total_xp_source;
  END IF;
END$$;
