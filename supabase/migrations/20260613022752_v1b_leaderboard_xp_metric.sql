-- ============================================================================
-- v1b Leaderboard — XP metric + global (cross-language) scope
-- ============================================================================
--
-- Phase 0 of the XP-leagues rearchitecture (docs/V1B_LEADERBOARD_PLAN.md). The
-- board collapses to a single metric, XP, and goes global:
--
--   * XP weekly/monthly = SUM(user_daily_activity.test_points_earned) in range
--   * XP all-time        = users.lifetime_xp (cached cumulative — includes test
--                          points + achievement XP rewards)
--   * Global scope        = p_language_id NULL skips the language filter, so XP
--                          is summed across every language the user studies.
--
-- The existing avg_words_per_day / words_mastered / streak branches are kept
-- untouched: the /streak page still calls get_leaderboard(..., 'streak') with a
-- concrete language id for its "top N streaks" badge (src/lib/queries/streaks.ts).
-- Only the new 'xp' branch honours NULL (global) language.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_language_id uuid,
  p_metric text DEFAULT 'avg_words_per_day'::text,
  p_period text DEFAULT 'week'::text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  rank bigint,
  user_id uuid,
  username text,
  name text,
  avatar_url text,
  nationalities text[],
  league text,
  current_streak integer,
  metric_value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_start_date DATE;
BEGIN
  -- Determine date range
  IF p_period = 'week' THEN
    v_start_date := date_trunc('week', CURRENT_DATE)::DATE;
  ELSIF p_period = 'month' THEN
    v_start_date := date_trunc('month', CURRENT_DATE)::DATE;
  ELSE
    v_start_date := '2000-01-01'::DATE; -- all-time
  END IF;

  IF p_metric = 'xp' THEN
    IF p_period = 'all-time' THEN
      -- All-time ranks on the cached lifetime total (cross-language already).
      RETURN QUERY
      SELECT
        ROW_NUMBER() OVER (ORDER BY u.lifetime_xp DESC) AS rank,
        u.id AS user_id,
        u.username,
        u.name,
        u.avatar_url,
        u.nationalities,
        u.league,
        u.current_streak,
        u.lifetime_xp::NUMERIC AS metric_value
      FROM users u
      WHERE COALESCE(u.lifetime_xp, 0) > 0
      ORDER BY u.lifetime_xp DESC
      LIMIT p_limit;
    ELSE
      -- Weekly / monthly XP = summed test points in range. NULL language = global.
      RETURN QUERY
      SELECT
        ROW_NUMBER() OVER (ORDER BY SUM(da.test_points_earned) DESC) AS rank,
        u.id AS user_id,
        u.username,
        u.name,
        u.avatar_url,
        u.nationalities,
        u.league,
        u.current_streak,
        SUM(da.test_points_earned)::NUMERIC AS metric_value
      FROM users u
      JOIN user_daily_activity da ON da.user_id = u.id
      WHERE (p_language_id IS NULL OR da.language_id = p_language_id)
        AND da.activity_date >= v_start_date
      GROUP BY u.id, u.username, u.name, u.avatar_url, u.nationalities, u.league, u.current_streak
      HAVING SUM(da.test_points_earned) > 0
      ORDER BY metric_value DESC
      LIMIT p_limit;
    END IF;

  ELSIF p_metric = 'avg_words_per_day' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY
        CASE WHEN COUNT(DISTINCT da.activity_date) > 0
             THEN SUM(da.words_studied)::NUMERIC / COUNT(DISTINCT da.activity_date)
             ELSE 0 END DESC
      ) AS rank,
      u.id AS user_id,
      u.username,
      u.name,
      u.avatar_url,
      u.nationalities,
      u.league,
      u.current_streak,
      CASE WHEN COUNT(DISTINCT da.activity_date) > 0
           THEN ROUND(SUM(da.words_studied)::NUMERIC / COUNT(DISTINCT da.activity_date), 1)
           ELSE 0 END AS metric_value
    FROM users u
    JOIN user_daily_activity da ON da.user_id = u.id
    WHERE da.language_id = p_language_id
      AND da.activity_date >= v_start_date
    GROUP BY u.id, u.username, u.name, u.avatar_url, u.nationalities, u.league, u.current_streak
    HAVING SUM(da.words_studied) > 0
    ORDER BY metric_value DESC
    LIMIT p_limit;

  ELSIF p_metric = 'words_mastered' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY SUM(da.words_mastered) DESC) AS rank,
      u.id AS user_id,
      u.username,
      u.name,
      u.avatar_url,
      u.nationalities,
      u.league,
      u.current_streak,
      SUM(da.words_mastered)::NUMERIC AS metric_value
    FROM users u
    JOIN user_daily_activity da ON da.user_id = u.id
    WHERE da.language_id = p_language_id
      AND da.activity_date >= v_start_date
    GROUP BY u.id, u.username, u.name, u.avatar_url, u.nationalities, u.league, u.current_streak
    HAVING SUM(da.words_mastered) > 0
    ORDER BY metric_value DESC
    LIMIT p_limit;

  ELSIF p_metric = 'streak' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY u.current_streak DESC) AS rank,
      u.id AS user_id,
      u.username,
      u.name,
      u.avatar_url,
      u.nationalities,
      u.league,
      u.current_streak,
      u.current_streak::NUMERIC AS metric_value
    FROM users u
    WHERE u.current_streak > 0
      AND EXISTS (
        SELECT 1 FROM user_daily_activity da
        WHERE da.user_id = u.id AND da.language_id = p_language_id
      )
    ORDER BY u.current_streak DESC
    LIMIT p_limit;

  END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_user_leaderboard_position(
  p_user_id uuid,
  p_language_id uuid,
  p_metric text DEFAULT 'avg_words_per_day'::text,
  p_period text DEFAULT 'week'::text
)
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
      -- Weekly / monthly XP = summed test points in range. NULL language = global.
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
