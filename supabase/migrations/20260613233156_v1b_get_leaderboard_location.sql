-- v1b: surface user location (free-text) instead of the nationalities array on
-- the leaderboard board, matching the league-room change. The All-time tab now
-- shows a Location column, so get_leaderboard returns `location` in place of
-- `nationalities` across all metric branches.
--
-- RETURNS TABLE shape changes, so the function must be dropped and recreated.
-- Only `metric_value` is consumed by the /streak caller, so dropping the
-- nationalities column is safe.

DROP FUNCTION IF EXISTS public.get_leaderboard(uuid, text, text, integer);

CREATE FUNCTION public.get_leaderboard(
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
  location text,
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
  IF p_period = 'week' THEN
    v_start_date := date_trunc('week', CURRENT_DATE)::DATE;
  ELSIF p_period = 'month' THEN
    v_start_date := date_trunc('month', CURRENT_DATE)::DATE;
  ELSE
    v_start_date := '2000-01-01'::DATE;
  END IF;

  IF p_metric = 'xp' THEN
    IF p_period = 'all-time' THEN
      RETURN QUERY
      SELECT
        ROW_NUMBER() OVER (ORDER BY u.lifetime_xp DESC) AS rank,
        u.id AS user_id,
        u.username,
        u.name,
        u.avatar_url,
        u.location,
        u.league,
        u.current_streak,
        u.lifetime_xp::NUMERIC AS metric_value
      FROM users u
      WHERE COALESCE(u.lifetime_xp, 0) > 0
      ORDER BY u.lifetime_xp DESC
      LIMIT p_limit;
    ELSE
      RETURN QUERY
      SELECT
        ROW_NUMBER() OVER (ORDER BY SUM(da.test_points_earned) DESC) AS rank,
        u.id AS user_id,
        u.username,
        u.name,
        u.avatar_url,
        u.location,
        u.league,
        u.current_streak,
        SUM(da.test_points_earned)::NUMERIC AS metric_value
      FROM users u
      JOIN user_daily_activity da ON da.user_id = u.id
      WHERE (p_language_id IS NULL OR da.language_id = p_language_id)
        AND da.activity_date >= v_start_date
      GROUP BY u.id, u.username, u.name, u.avatar_url, u.location, u.league, u.current_streak
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
      u.location,
      u.league,
      u.current_streak,
      CASE WHEN COUNT(DISTINCT da.activity_date) > 0
           THEN ROUND(SUM(da.words_studied)::NUMERIC / COUNT(DISTINCT da.activity_date), 1)
           ELSE 0 END AS metric_value
    FROM users u
    JOIN user_daily_activity da ON da.user_id = u.id
    WHERE da.language_id = p_language_id
      AND da.activity_date >= v_start_date
    GROUP BY u.id, u.username, u.name, u.avatar_url, u.location, u.league, u.current_streak
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
      u.location,
      u.league,
      u.current_streak,
      SUM(da.words_mastered)::NUMERIC AS metric_value
    FROM users u
    JOIN user_daily_activity da ON da.user_id = u.id
    WHERE da.language_id = p_language_id
      AND da.activity_date >= v_start_date
    GROUP BY u.id, u.username, u.name, u.avatar_url, u.location, u.league, u.current_streak
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
      u.location,
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
