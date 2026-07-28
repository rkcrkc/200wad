-- BACKFILLED from supabase_migrations.schema_migrations (version 20260624043204).
--
-- This is the most important of the backfills. It was applied directly to the
-- remote DB and never committed, which left the repo's newest definition of
-- close_league_week in 20260622120000_remove_league_tier_reached_trophies.sql —
-- a version with no `ordinal` in the league.reward notification payload. A
-- `supabase db reset` (or a `db push` against a fresh DB) therefore rebuilt an
-- older function and silently dropped the ordinal from every league reward
-- notification.
--
-- Recovered verbatim from the ledger. Its version sorts after 20260622120000,
-- so replays now land on this definition last, matching production.

CREATE OR REPLACE FUNCTION public.close_league_week(p_week_start date DEFAULT NULL::date)
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
  IF NOT EXISTS (
    SELECT 1 FROM league_memberships WHERE week_start = v_week_start
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM league_memberships
    WHERE week_start = v_week_start AND final_rank IS NOT NULL
  ) THEN
    RETURN;
  END IF;

  UPDATE league_memberships lm
  SET xp_earned = COALESCE(wx.xp, 0)
  FROM (
    SELECT da.user_id, SUM(da.test_points_earned) AS xp
    FROM user_daily_activity da
    WHERE da.activity_date >= v_week_start AND da.activity_date < v_week_end
    GROUP BY da.user_id
  ) wx
  WHERE lm.week_start = v_week_start AND lm.user_id = wx.user_id;

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

  UPDATE league_memberships lm
  SET coin_reward = lr.coin_reward
  FROM league_rewards lr
  WHERE lm.week_start = v_week_start
    AND lr.league_id = lm.league_id
    AND lr.enabled
    AND lm.final_rank BETWEEN lr.rank_min AND lr.rank_max;

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
        'league_name', rec.league_name,
        'ordinal', (
          CASE
            WHEN (rec.final_rank % 100) BETWEEN 11 AND 13 THEN rec.final_rank::text || 'th'
            WHEN rec.final_rank % 10 = 1 THEN rec.final_rank::text || 'st'
            WHEN rec.final_rank % 10 = 2 THEN rec.final_rank::text || 'nd'
            WHEN rec.final_rank % 10 = 3 THEN rec.final_rank::text || 'rd'
            ELSE rec.final_rank::text || 'th'
          END
        )
      )
    );
  END LOOP;

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

  -- Placement achievements: tier-reached trophies retired, so only podium/wins.
  FOR rec IN
    SELECT nm.user_id,
      (SELECT COUNT(*) FROM league_memberships h
         WHERE h.user_id = nm.user_id AND h.final_rank BETWEEN 1 AND 3) AS podiums,
      (SELECT COUNT(*) FROM league_memberships h
         WHERE h.user_id = nm.user_id AND h.final_rank = 1) AS wins
    FROM league_memberships nm
    WHERE nm.week_start = v_week_end
  LOOP
    IF rec.podiums >= 1 THEN PERFORM unlock_achievement(rec.user_id, 'league_first_podium'); END IF;
    IF rec.wins   >= 1 THEN PERFORM unlock_achievement(rec.user_id, 'league_first_win'); END IF;
    IF rec.wins   >= 5 THEN PERFORM unlock_achievement(rec.user_id, 'league_wins_5'); END IF;
  END LOOP;
END;
$function$;
