-- Secure SECURITY DEFINER functions against cross-user (IDOR) and self-cheat abuse.
--
-- Context (see docs/SECURITY_AUDIT.md, item S1):
-- These functions run above RLS and trusted the p_user_id ARGUMENT instead of
-- auth.uid(). EXECUTE was granted to anon/authenticated, so a user could call the
-- REST RPC directly with any p_user_id to drain another user's coins, alter their
-- streak/settings, read their stats, or (for update_daily_activity) inflate their
-- own XP/streak/coins with fabricated numbers.
--
-- Fix, two layers:
--   * Mutations  -> revoke anon/authenticated EXECUTE; only service_role may run
--                   them. The app now invokes them via the service-role client
--                   inside validated server actions.
--   * Self reads -> revoke anon EXECUTE; enforce p_user_id = auth.uid() in-body
--                   (permissive for service_role, where auth.uid() is NULL, so the
--                   admin achievement-processing flow still works).
--   * get_users_levels is intentionally multi-user (leaderboard display): revoke
--                   anon only, no per-user guard.

-- ---------------------------------------------------------------------------
-- Layer 2: mutations become service-role-only (no body change needed).
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.update_daily_activity(uuid, uuid, integer, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_daily_activity(uuid, uuid, integer, integer, integer, integer, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purchase_shop_item(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recover_streak(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_streak_freeze_auto(uuid, boolean) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Layer 1: self-scoped read functions gain an ownership guard.
-- (Also pins search_path where it was previously mutable.)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_course_vocab_count(p_user_id uuid, p_course_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN (
    SELECT count(DISTINCT uwp.word_id)::integer
    FROM user_word_progress uwp
    JOIN lesson_words lw ON lw.word_id = uwp.word_id
    JOIN lessons l ON l.id = lw.lesson_id
    JOIN words w ON w.id = uwp.word_id
    WHERE uwp.user_id = p_user_id
      AND l.course_id = p_course_id
      AND uwp.status IN ('learned', 'mastered')
      AND (w.category IS NULL OR w.category != 'information')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_distinct_lessons_tested(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN (
    SELECT COUNT(DISTINCT ts.lesson_id)::int
    FROM test_sessions ts
    WHERE ts.user_id = p_user_id
      AND ts.lesson_id IS NOT NULL
      AND ts.taken_at IS NOT NULL
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_league_achievement_stats(p_user_id uuid)
 RETURNS TABLE(highest_tier_order integer, podium_finishes integer, wins integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
    SELECT
      COALESCE((SELECT MAX(l.tier_order) FROM league_memberships m
                JOIN leagues l ON l.id = m.league_id WHERE m.user_id = p_user_id), 0),
      (SELECT COUNT(*) FROM league_memberships m
       WHERE m.user_id = p_user_id AND m.final_rank BETWEEN 1 AND 3)::int,
      (SELECT COUNT(*) FROM league_memberships m
       WHERE m.user_id = p_user_id AND m.final_rank = 1)::int;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_leaderboard_position(p_user_id uuid, p_language_id uuid, p_metric text DEFAULT 'avg_words_per_day'::text, p_period text DEFAULT 'week'::text)
 RETURNS TABLE(rank bigint, metric_value numeric, total_users bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start_date DATE;
  v_user_value NUMERIC;
  v_rank BIGINT;
  v_total BIGINT;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_period = 'week' THEN
    v_start_date := date_trunc('week', CURRENT_DATE)::DATE;
  ELSIF p_period = 'month' THEN
    v_start_date := date_trunc('month', CURRENT_DATE)::DATE;
  ELSE
    v_start_date := '2000-01-01'::DATE;
  END IF;

  IF p_metric = 'xp' THEN
    IF p_period = 'all-time' THEN
      SELECT COALESCE(u.lifetime_xp, 0) INTO v_user_value
      FROM users u WHERE u.id = p_user_id;

      SELECT COUNT(*) + 1 INTO v_rank
      FROM users u2
      WHERE COALESCE(u2.lifetime_xp, 0) > v_user_value
        AND u2.id != p_user_id;

      SELECT COUNT(*) INTO v_total
      FROM users u3
      WHERE COALESCE(u3.lifetime_xp, 0) > 0;
    ELSE
      SELECT COALESCE(SUM(da.test_points_earned), 0) INTO v_user_value
      FROM user_daily_activity da
      WHERE da.user_id = p_user_id
        AND (p_language_id IS NULL OR da.language_id = p_language_id)
        AND da.activity_date >= v_start_date;

      SELECT COUNT(*) + 1 INTO v_rank
      FROM (
        SELECT da2.user_id, SUM(da2.test_points_earned) AS val
        FROM user_daily_activity da2
        WHERE (p_language_id IS NULL OR da2.language_id = p_language_id)
          AND da2.activity_date >= v_start_date
          AND da2.user_id != p_user_id
        GROUP BY da2.user_id
        HAVING SUM(da2.test_points_earned) > 0
      ) ranked WHERE ranked.val > v_user_value;

      SELECT COUNT(*) INTO v_total
      FROM (
        SELECT da3.user_id
        FROM user_daily_activity da3
        WHERE (p_language_id IS NULL OR da3.language_id = p_language_id)
          AND da3.activity_date >= v_start_date
        GROUP BY da3.user_id
        HAVING SUM(da3.test_points_earned) > 0
      ) counted;
    END IF;

  ELSIF p_metric = 'avg_words_per_day' THEN
    SELECT CASE WHEN COUNT(DISTINCT da.activity_date) > 0
                THEN ROUND(SUM(da.words_studied)::NUMERIC / COUNT(DISTINCT da.activity_date), 1)
                ELSE 0 END
    INTO v_user_value
    FROM user_daily_activity da
    WHERE da.user_id = p_user_id
      AND da.language_id = p_language_id
      AND da.activity_date >= v_start_date;

    SELECT COUNT(*) + 1 INTO v_rank
    FROM (
      SELECT da2.user_id,
        CASE WHEN COUNT(DISTINCT da2.activity_date) > 0
             THEN ROUND(SUM(da2.words_studied)::NUMERIC / COUNT(DISTINCT da2.activity_date), 1)
             ELSE 0 END AS val
      FROM user_daily_activity da2
      WHERE da2.language_id = p_language_id
        AND da2.activity_date >= v_start_date
        AND da2.user_id != p_user_id
      GROUP BY da2.user_id
      HAVING SUM(da2.words_studied) > 0
    ) ranked WHERE ranked.val > v_user_value;

    SELECT COUNT(DISTINCT da3.user_id) INTO v_total
    FROM user_daily_activity da3
    WHERE da3.language_id = p_language_id
      AND da3.activity_date >= v_start_date
      AND EXISTS (SELECT 1 FROM user_daily_activity x WHERE x.user_id = da3.user_id AND x.words_studied > 0);

  ELSIF p_metric = 'words_mastered' THEN
    SELECT COALESCE(SUM(da.words_mastered), 0)
    INTO v_user_value
    FROM user_daily_activity da
    WHERE da.user_id = p_user_id
      AND da.language_id = p_language_id
      AND da.activity_date >= v_start_date;

    SELECT COUNT(*) + 1 INTO v_rank
    FROM (
      SELECT da2.user_id, SUM(da2.words_mastered) AS val
      FROM user_daily_activity da2
      WHERE da2.language_id = p_language_id
        AND da2.activity_date >= v_start_date
        AND da2.user_id != p_user_id
      GROUP BY da2.user_id
      HAVING SUM(da2.words_mastered) > 0
    ) ranked WHERE ranked.val > v_user_value;

    SELECT COUNT(DISTINCT da3.user_id) INTO v_total
    FROM user_daily_activity da3
    WHERE da3.language_id = p_language_id
      AND da3.activity_date >= v_start_date;

  ELSIF p_metric = 'streak' THEN
    SELECT COALESCE(u.current_streak, 0) INTO v_user_value
    FROM users u WHERE u.id = p_user_id;

    SELECT COUNT(*) + 1 INTO v_rank
    FROM users u2
    WHERE u2.current_streak > v_user_value
      AND u2.id != p_user_id
      AND EXISTS (
        SELECT 1 FROM user_daily_activity da WHERE da.user_id = u2.id AND da.language_id = p_language_id
      );

    SELECT COUNT(*) INTO v_total
    FROM users u3
    WHERE u3.current_streak > 0
      AND EXISTS (
        SELECT 1 FROM user_daily_activity da WHERE da.user_id = u3.id AND da.language_id = p_language_id
      );
  END IF;

  RETURN QUERY SELECT COALESCE(v_rank, 1), COALESCE(v_user_value, 0), COALESCE(v_total, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_league_room(p_user_id uuid)
 RETURNS TABLE(rank bigint, user_id uuid, username text, name text, avatar_url text, location text, current_streak integer, xp_earned integer, is_current_user boolean, league_slug text, league_name text, league_color text, league_icon text, tier_order integer, division integer, promote_count integer, relegate_count integer, is_top boolean, is_bottom boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_week_start DATE := date_trunc('week', CURRENT_DATE)::DATE;
  v_league_id uuid;
  v_division integer;
  v_division_size integer;
  v_min_lessons integer;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT lm.league_id, lm.division
    INTO v_league_id, v_division
  FROM league_memberships lm
  WHERE lm.user_id = p_user_id AND lm.week_start = v_week_start;

  IF NOT FOUND THEN
    -- Gate: don't enrol users who haven't tested enough distinct lessons yet.
    SELECT COALESCE((pc.value)::text::int, 3) INTO v_min_lessons
      FROM platform_config pc
      WHERE pc.key = 'min_lessons_tested_to_join_leagues';
    v_min_lessons := COALESCE(v_min_lessons, 3);
    IF public.get_distinct_lessons_tested(p_user_id) < v_min_lessons THEN
      RETURN; -- locked: no membership row created, RPC returns 0 rows
    END IF;

    SELECT l.id, l.division_size
      INTO v_league_id, v_division_size
    FROM leagues l
    WHERE l.enabled
    ORDER BY l.tier_order ASC
    LIMIT 1;

    IF v_league_id IS NULL THEN
      RETURN;
    END IF;

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
    AND (COALESCE(wx.xp, 0) > 0 OR u.id = p_user_id)
  ORDER BY COALESCE(wx.xp, 0) DESC, u.created_at ASC;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Grants: reads are authenticated (self) + service_role; never anonymous.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_course_vocab_count(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_distinct_lessons_tested(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_league_achievement_stats(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_leaderboard_position(uuid, uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_league_room(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_users_levels(uuid[]) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_course_vocab_count(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_distinct_lessons_tested(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_league_achievement_stats(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_leaderboard_position(uuid, uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_league_room(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_users_levels(uuid[]) TO authenticated, service_role;
