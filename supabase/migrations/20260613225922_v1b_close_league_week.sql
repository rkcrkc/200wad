-- v1b close_league_week: the weekly league close + movement + payout job.
--
-- For the competition week starting `p_week_start` (defaults to the PREVIOUS ISO
-- week — the one that just ended when run at the Monday boundary), per
-- (league_id, division):
--   1. Freeze each member's xp_earned from user_daily_activity over that week.
--   2. Assign final_rank by xp_earned desc (tie-break: earlier enrolment).
--   3. Set result: top `promote_count` -> 'promoted', bottom `relegate_count` ->
--      'relegated', rest 'held'. The top tier caps promotion and the bottom tier
--      caps relegation (nowhere to go).
--   4. Resolve coin_reward from league_rewards (podium bands) and pay it via the
--      v1a award_coins ledger (type='leaderboard', reference='league_membership').
--   5. Seed next week's memberships: move each member to their new tier and pack
--      into divisions of the target tier's division_size. New/returning users are
--      not seeded here — get_or_create_league_room lazily enrols them into the
--      bottom tier on first view.
--
-- Idempotent: keyed by p_week_start. If the week is already closed (any row has a
-- final_rank), the function is a no-op, so a re-run never double-pays.
--
-- SECURITY DEFINER so cron (and admins) can run it across all users; execution is
-- revoked from anon/authenticated so end users can't trigger payouts.

CREATE OR REPLACE FUNCTION public.close_league_week(p_week_start date DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_week_start date := COALESCE(p_week_start, date_trunc('week', CURRENT_DATE)::date - 7);
  v_week_end date := v_week_start + 7;
  rec record;
BEGIN
  -- No participants for the week -> nothing to do.
  IF NOT EXISTS (
    SELECT 1 FROM league_memberships WHERE week_start = v_week_start
  ) THEN
    RETURN;
  END IF;

  -- Idempotency: already closed (final_rank set) -> no-op.
  IF EXISTS (
    SELECT 1 FROM league_memberships
    WHERE week_start = v_week_start AND final_rank IS NOT NULL
  ) THEN
    RETURN;
  END IF;

  -- 1. Freeze the week's XP from daily activity (global, all languages).
  UPDATE league_memberships lm
  SET xp_earned = COALESCE(wx.xp, 0)
  FROM (
    SELECT da.user_id, SUM(da.test_points_earned) AS xp
    FROM user_daily_activity da
    WHERE da.activity_date >= v_week_start AND da.activity_date < v_week_end
    GROUP BY da.user_id
  ) wx
  WHERE lm.week_start = v_week_start AND lm.user_id = wx.user_id;

  -- 2. Rank within each room.
  WITH ranked AS (
    SELECT lm.id,
      ROW_NUMBER() OVER (
        PARTITION BY lm.league_id, lm.division
        ORDER BY lm.xp_earned DESC, lm.created_at ASC
      ) AS rnk
    FROM league_memberships lm
    WHERE lm.week_start = v_week_start
  )
  UPDATE league_memberships lm
  SET final_rank = ranked.rnk
  FROM ranked
  WHERE lm.id = ranked.id;

  -- 3. Promote / relegate / hold, respecting per-tier caps.
  WITH room AS (
    SELECT lm.id,
      lm.final_rank,
      l.promote_count,
      l.relegate_count,
      COUNT(*) OVER (PARTITION BY lm.league_id, lm.division) AS room_size,
      (l.tier_order = (SELECT MAX(tier_order) FROM leagues WHERE enabled)) AS is_top,
      (l.tier_order = (SELECT MIN(tier_order) FROM leagues WHERE enabled)) AS is_bottom
    FROM league_memberships lm
    JOIN leagues l ON l.id = lm.league_id
    WHERE lm.week_start = v_week_start
  )
  UPDATE league_memberships lm
  SET result = CASE
    WHEN room.final_rank <= room.promote_count AND NOT room.is_top THEN 'promoted'
    WHEN room.final_rank > room.room_size - room.relegate_count AND NOT room.is_bottom THEN 'relegated'
    ELSE 'held'
  END
  FROM room
  WHERE lm.id = room.id;

  -- 4a. Resolve coin payout from the podium bands.
  UPDATE league_memberships lm
  SET coin_reward = lr.coin_reward
  FROM league_rewards lr
  WHERE lm.week_start = v_week_start
    AND lr.league_id = lm.league_id
    AND lr.enabled
    AND lm.final_rank BETWEEN lr.rank_min AND lr.rank_max;

  -- 4b. Pay out via the v1a coin ledger.
  FOR rec IN
    SELECT lm.id AS membership_id, lm.user_id, lm.final_rank, lm.coin_reward, l.name AS league_name
    FROM league_memberships lm
    JOIN leagues l ON l.id = lm.league_id
    WHERE lm.week_start = v_week_start AND lm.coin_reward > 0
  LOOP
    PERFORM award_coins(
      rec.user_id,
      rec.coin_reward,
      'leaderboard',
      'league_membership',
      rec.membership_id,
      format('%s League · #%s finish', rec.league_name, rec.final_rank)
    );
  END LOOP;

  -- 5. Seed next week: move members to their new tier and pack into divisions.
  WITH moves AS (
    SELECT
      lm.user_id,
      lm.xp_earned,
      lm.league_id AS old_league_id,
      CASE lm.result
        WHEN 'promoted' THEN (
          SELECT u.id FROM leagues u
          WHERE u.enabled AND u.tier_order > l.tier_order
          ORDER BY u.tier_order ASC LIMIT 1
        )
        WHEN 'relegated' THEN (
          SELECT d.id FROM leagues d
          WHERE d.enabled AND d.tier_order < l.tier_order
          ORDER BY d.tier_order DESC LIMIT 1
        )
        ELSE lm.league_id
      END AS new_league_id
    FROM league_memberships lm
    JOIN leagues l ON l.id = lm.league_id
    WHERE lm.week_start = v_week_start
  ),
  resolved AS (
    -- Caps guarantee a target, but COALESCE keeps a member in place defensively.
    SELECT user_id, COALESCE(new_league_id, old_league_id) AS new_league_id, xp_earned
    FROM moves
  ),
  packed AS (
    SELECT
      r.user_id,
      r.new_league_id,
      CEIL(
        ROW_NUMBER() OVER (PARTITION BY r.new_league_id ORDER BY r.xp_earned DESC, r.user_id)::numeric
        / nl.division_size
      )::int AS division
    FROM resolved r
    JOIN leagues nl ON nl.id = r.new_league_id
  )
  INSERT INTO league_memberships (user_id, week_start, league_id, division)
  SELECT user_id, v_week_end, new_league_id, division
  FROM packed
  ON CONFLICT (user_id, week_start) DO NOTHING;
END;
$function$;

REVOKE ALL ON FUNCTION public.close_league_week(date) FROM PUBLIC, anon, authenticated;
