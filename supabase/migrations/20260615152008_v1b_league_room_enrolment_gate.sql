-- v1b Leagues (Phase 3): gate enrolment inside get_or_create_league_room.
--
-- The room RPC lazily enrols any logged-in user into the bottom tier on first
-- view. That means a pure UI gate would still create memberships and pollute
-- divisions (locked users would be promoted/relegated by the close job). The
-- gate has to live INSIDE the RPC: locked users (logged in, but fewer than the
-- configured distinct real lessons tested) return zero rows — same shape as a
-- guest — and never get a membership row.
--
-- Base verbatim on 20260615000002 (league_icon + zero-XP-member filter). The
-- only change is the gate block inside the `IF NOT FOUND THEN` branch, before
-- enrolment. RETURNS TABLE shape is unchanged, so CREATE OR REPLACE (no DROP)
-- preserves existing grants.

CREATE OR REPLACE FUNCTION public.get_or_create_league_room(p_user_id uuid)
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
  league_icon text,
  tier_order integer,
  division integer,
  promote_count integer,
  relegate_count integer,
  is_top boolean,
  is_bottom boolean
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
  v_min_lessons integer;
BEGIN
  -- Resolve (or create) the caller's membership for this week.
  SELECT lm.league_id, lm.division
    INTO v_league_id, v_division
  FROM league_memberships lm
  WHERE lm.user_id = p_user_id AND lm.week_start = v_week_start;

  IF NOT FOUND THEN
    -- Gate: don't enrol users who haven't tested enough distinct lessons yet.
    -- Users with an EXISTING membership skip this (the gate only blocks first
    -- enrolment), so a mid-week config bump never evicts current competitors.
    SELECT COALESCE((pc.value)::text::int, 3) INTO v_min_lessons
      FROM platform_config pc
      WHERE pc.key = 'min_lessons_tested_to_join_leagues';
    v_min_lessons := COALESCE(v_min_lessons, 3);
    IF public.get_distinct_lessons_tested(p_user_id) < v_min_lessons THEN
      RETURN; -- locked: no membership row created, RPC returns 0 rows
    END IF;

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
    l.icon AS league_icon,
    l.tier_order,
    lm.division,
    l.promote_count,
    l.relegate_count,
    (l.tier_order = (SELECT MAX(tier_order) FROM leagues WHERE enabled)) AS is_top,
    (l.tier_order = (SELECT MIN(tier_order) FROM leagues WHERE enabled)) AS is_bottom
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
    -- Hide members who haven't scored yet this week; always keep the caller.
    AND (COALESCE(wx.xp, 0) > 0 OR u.id = p_user_id)
  ORDER BY COALESCE(wx.xp, 0) DESC, u.created_at ASC;
END;
$function$;
