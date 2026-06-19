-- v1b close_league_week: fire league placement achievements after settlement.
--
-- Builds verbatim on 20260615000004 (zero-XP hold + league notifications).
-- Signature unchanged -> no DROP needed. Adds a new Step 6 AFTER the next-week
-- reseed (Step 5), looping the just-seeded v_week_end rows so each member's NEW
-- tier is visible, and firing the A/B placement achievements:
--
--   A. Climb the ladder — league_*_reached, gated on the member's new tier_order.
--   B. Podium & wins     — league_first_podium / league_first_win / league_wins_5,
--                          from the cumulative league_memberships history.
--
-- unlock_achievement is idempotent (no-ops on re-unlock via user_achievements
-- UNIQUE), credits coins, and inserts the in_app notification (its notify path
-- skips the toast channel — fine, this runs in the Monday cron when the user is
-- offline, so in_app is the meaningful delivery). close_league_week is SECURITY
-- DEFINER (postgres) so it may call unlock_achievement despite its
-- service_role-only grant.
--
-- Still idempotent (keyed by p_week_start; no-op once final_rank is set).

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

  -- 3. Promote / relegate / hold, respecting per-tier caps. Zero-XP members are
  --    always held — they never join the board, so they never move.
  WITH room AS (
    SELECT lm.id,
      lm.final_rank,
      lm.xp_earned,
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
    WHEN room.xp_earned = 0 THEN 'held'
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

  -- 4b. Pay out via the v1a coin ledger and notify the recipient.
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

    PERFORM fire_notification_template(
      rec.user_id,
      'league.reward',
      jsonb_build_object(
        'coins', rec.coin_reward,
        'rank', rec.final_rank,
        'league_name', rec.league_name
      )
    );
  END LOOP;

  -- 4c. Notify promoted / relegated members, keyed to the destination tier name
  --     (next tier up for promoted, next down for relegated — same subqueries as
  --     the Step 5 reseed).
  FOR rec IN
    SELECT
      lm.user_id,
      lm.final_rank,
      lm.result,
      CASE lm.result
        WHEN 'promoted' THEN (
          SELECT up.name FROM leagues up
          WHERE up.enabled AND up.tier_order > l.tier_order
          ORDER BY up.tier_order ASC LIMIT 1
        )
        WHEN 'relegated' THEN (
          SELECT dn.name FROM leagues dn
          WHERE dn.enabled AND dn.tier_order < l.tier_order
          ORDER BY dn.tier_order DESC LIMIT 1
        )
      END AS dest_name
    FROM league_memberships lm
    JOIN leagues l ON l.id = lm.league_id
    WHERE lm.week_start = v_week_start
      AND lm.result IN ('promoted', 'relegated')
  LOOP
    IF rec.dest_name IS NOT NULL THEN
      PERFORM fire_notification_template(
        rec.user_id,
        CASE WHEN rec.result = 'promoted' THEN 'league.promoted' ELSE 'league.relegated' END,
        jsonb_build_object(
          'league_name', rec.dest_name,
          'rank', rec.final_rank
        )
      );
    END IF;
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

  -- 6. Fire placement achievements (idempotent: unlock_achievement no-ops on
  --    re-unlock). Loops the just-seeded v_week_end rows so the NEW tier is
  --    visible; podium/win counts come from the cumulative membership history.
  FOR rec IN
    SELECT nm.user_id, nl.tier_order AS new_tier_order,
      (SELECT COUNT(*) FROM league_memberships h
         WHERE h.user_id = nm.user_id AND h.final_rank BETWEEN 1 AND 3) AS podiums,
      (SELECT COUNT(*) FROM league_memberships h
         WHERE h.user_id = nm.user_id AND h.final_rank = 1) AS wins
    FROM league_memberships nm
    JOIN leagues nl ON nl.id = nm.league_id
    WHERE nm.week_start = v_week_end
  LOOP
    IF rec.new_tier_order >= 2 THEN PERFORM unlock_achievement(rec.user_id, 'league_stone_reached'); END IF;
    IF rec.new_tier_order >= 3 THEN PERFORM unlock_achievement(rec.user_id, 'league_copper_reached'); END IF;
    IF rec.new_tier_order >= 4 THEN PERFORM unlock_achievement(rec.user_id, 'league_bronze_reached'); END IF;
    IF rec.new_tier_order >= 5 THEN PERFORM unlock_achievement(rec.user_id, 'league_silver_reached'); END IF;
    IF rec.new_tier_order >= 6 THEN PERFORM unlock_achievement(rec.user_id, 'league_gold_reached'); END IF;
    IF rec.podiums >= 1 THEN PERFORM unlock_achievement(rec.user_id, 'league_first_podium'); END IF;
    IF rec.wins   >= 1 THEN PERFORM unlock_achievement(rec.user_id, 'league_first_win'); END IF;
    IF rec.wins   >= 5 THEN PERFORM unlock_achievement(rec.user_id, 'league_wins_5'); END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.close_league_week(date) FROM PUBLIC, anon, authenticated;
