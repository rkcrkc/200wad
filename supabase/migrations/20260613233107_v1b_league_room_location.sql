-- v1b: surface user location (free-text, e.g. "Bali, Indonesia") instead of the
-- nationalities array on the league-room board. The Weekly tab now shows a
-- dedicated Location column, so the room RPC returns `location` in its place.
--
-- RETURNS TABLE shape changes (nationalities text[] -> location text), so the
-- function must be dropped and recreated rather than CREATE OR REPLACE.

DROP FUNCTION IF EXISTS public.get_or_create_league_room(uuid);

CREATE FUNCTION public.get_or_create_league_room(p_user_id uuid)
RETURNS TABLE(
  rank bigint,
  user_id uuid,
  username text,
  name text,
  avatar_url text,
  location text,
  current_streak integer,
  xp_earned integer,
  is_current_user boolean,
  league_slug text,
  league_name text,
  league_color text,
  tier_order integer,
  division integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
-- The RETURNS TABLE columns (user_id, name, division, ...) are plpgsql OUT
-- variables that would otherwise shadow same-named table columns — notably in
-- the INSERT's ON CONFLICT (user_id, week_start) target. Resolve identifier
-- clashes in favour of the column.
#variable_conflict use_column
DECLARE
  v_week_start DATE := date_trunc('week', CURRENT_DATE)::DATE;
  v_league_id uuid;
  v_division integer;
  v_division_size integer;
BEGIN
  -- Resolve (or create) the caller's membership for this week.
  SELECT lm.league_id, lm.division
    INTO v_league_id, v_division
  FROM league_memberships lm
  WHERE lm.user_id = p_user_id AND lm.week_start = v_week_start;

  IF NOT FOUND THEN
    -- Enrol into the lowest enabled tier.
    SELECT l.id, l.division_size
      INTO v_league_id, v_division_size
    FROM leagues l
    WHERE l.enabled
    ORDER BY l.tier_order ASC
    LIMIT 1;

    -- No enabled tiers configured -> nothing to show.
    IF v_league_id IS NULL THEN
      RETURN;
    END IF;

    -- Find the first non-full division in this tier for the week, else start a
    -- new one. (Best-effort packing; the Phase 2 close job does the authoritative
    -- reseed. A small over/under-fill from concurrent first-views is acceptable.)
    SELECT lm.division
      INTO v_division
    FROM league_memberships lm
    WHERE lm.week_start = v_week_start AND lm.league_id = v_league_id
    GROUP BY lm.division
    HAVING COUNT(*) < v_division_size
    ORDER BY lm.division ASC
    LIMIT 1;

    IF v_division IS NULL THEN
      SELECT COALESCE(MAX(lm.division), 0) + 1
        INTO v_division
      FROM league_memberships lm
      WHERE lm.week_start = v_week_start AND lm.league_id = v_league_id;
    END IF;

    INSERT INTO league_memberships (user_id, week_start, league_id, division)
    VALUES (p_user_id, v_week_start, v_league_id, v_division)
    ON CONFLICT (user_id, week_start) DO NOTHING;

    -- Re-read in case a concurrent call won the insert (ON CONFLICT no-op).
    SELECT lm.league_id, lm.division
      INTO v_league_id, v_division
    FROM league_memberships lm
    WHERE lm.user_id = p_user_id AND lm.week_start = v_week_start;
  END IF;

  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(wx.xp, 0) DESC, u.created_at ASC
    ) AS rank,
    u.id AS user_id,
    u.username,
    u.name,
    u.avatar_url,
    u.location,
    u.current_streak,
    COALESCE(wx.xp, 0)::integer AS xp_earned,
    (u.id = p_user_id) AS is_current_user,
    l.slug AS league_slug,
    l.name AS league_name,
    l.color AS league_color,
    l.tier_order,
    lm.division
  FROM league_memberships lm
  JOIN users u ON u.id = lm.user_id
  JOIN leagues l ON l.id = lm.league_id
  LEFT JOIN (
    SELECT da.user_id, SUM(da.test_points_earned) AS xp
    FROM user_daily_activity da
    WHERE da.activity_date >= v_week_start
    GROUP BY da.user_id
  ) wx ON wx.user_id = lm.user_id
  WHERE lm.week_start = v_week_start
    AND lm.league_id = v_league_id
    AND lm.division = v_division
  ORDER BY COALESCE(wx.xp, 0) DESC, u.created_at ASC;
END;
$function$;
