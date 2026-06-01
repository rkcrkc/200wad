-- ============================================================================
-- v1a Gamification — backfill `users.pb_*` personal-best columns
-- ============================================================================
--
-- Final v1a migration. Recomputes three personal bests from the historical
-- record so existing users see their real PBs on the new gamification UI
-- instead of NULL placeholders.
--
-- Columns set
-- -----------
--   pb_day_test_points,        pb_day_test_points_at   (integer, date)
--   pb_week_test_points,       pb_week_test_points_at  (integer, date)
--   pb_session_score_percent,  pb_session_score_at     (integer, timestamptz)
--
-- Source-of-truth formulae
-- ------------------------
--   pb_day_test_points
--     = MAX over (SUM(user_daily_activity.test_points_earned)
--                 GROUP BY user_id, activity_date)
--     pb_day_test_points_at = the activity_date that produced that max.
--
--   pb_week_test_points
--     = MAX over (SUM(user_daily_activity.test_points_earned)
--                 GROUP BY user_id, date_trunc('week', activity_date))
--     pb_week_test_points_at = the ISO-week start date (Monday) of the
--     winning week. `date_trunc('week', d)` returns the Monday in Postgres.
--
--   pb_session_score_percent
--     = MAX(test_sessions.score_percent) per user_id
--     pb_session_score_at = the taken_at of that session.
--
-- Tie-break
-- ---------
-- When multiple rows tie at the same maximum value, the earliest date / oldest
-- timestamp wins — that's the moment the user FIRST hit the PB, which is the
-- correct semantic for "personal best".
--
-- Zero-day filter
-- ---------------
-- A user can have user_daily_activity rows with 0 points (study-only days, or
-- days where update_daily_activity was called for streak bookkeeping without a
-- test). Setting pb_day_test_points = 0 with a date attached would create a
-- nonsense "best" record. We exclude `day_total = 0` (and same for week) so
-- the column stays NULL until the user actually earns test points.
--
-- For pb_session_score_percent we DO NOT apply this filter — score_percent is
-- a 0-100 quality metric and a 0% session is still a valid (if unflattering)
-- personal-best record on first attempt.
--
-- Idempotency
-- -----------
-- Updates ONLY rows whose six PB columns differ from the recomputed values
-- (`IS DISTINCT FROM` on the whole tuple). Re-running is a no-op for any user
-- already in sync. Safe to run after additional sessions / activity have
-- happened — it always converges on the source-of-truth MAX.
--
-- Side effects: none
-- ------------------
-- Per the v1a backfill plan, PBs are forward-only data: no coin grant, no
-- notification firing. The "first time you set a PB" notifications
-- (personal_best.day/week/session) are runtime concerns — this migration
-- writes ONLY the six pb_* columns and updated_at.
-- ============================================================================

WITH
day_totals AS (
  SELECT
    user_id,
    activity_date,
    SUM(test_points_earned)::integer AS day_total
  FROM public.user_daily_activity
  GROUP BY user_id, activity_date
),
day_pb AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    day_total      AS pb_day_test_points_new,
    activity_date  AS pb_day_test_points_at_new
  FROM day_totals
  WHERE day_total > 0
  ORDER BY user_id, day_total DESC, activity_date ASC
),
week_totals AS (
  SELECT
    user_id,
    date_trunc('week', activity_date)::date AS week_start,
    SUM(test_points_earned)::integer        AS week_total
  FROM public.user_daily_activity
  GROUP BY user_id, date_trunc('week', activity_date)::date
),
week_pb AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    week_total  AS pb_week_test_points_new,
    week_start  AS pb_week_test_points_at_new
  FROM week_totals
  WHERE week_total > 0
  ORDER BY user_id, week_total DESC, week_start ASC
),
session_pb AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    score_percent AS pb_session_score_percent_new,
    taken_at      AS pb_session_score_at_new
  FROM public.test_sessions
  WHERE user_id IS NOT NULL
    AND taken_at IS NOT NULL
  ORDER BY user_id, score_percent DESC, taken_at ASC
),
recomputed AS (
  SELECT
    u.id,
    d.pb_day_test_points_new,
    d.pb_day_test_points_at_new,
    w.pb_week_test_points_new,
    w.pb_week_test_points_at_new,
    s.pb_session_score_percent_new,
    s.pb_session_score_at_new
  FROM public.users u
  LEFT JOIN day_pb     d ON d.user_id = u.id
  LEFT JOIN week_pb    w ON w.user_id = u.id
  LEFT JOIN session_pb s ON s.user_id = u.id
)
UPDATE public.users u
SET
  pb_day_test_points       = r.pb_day_test_points_new,
  pb_day_test_points_at    = r.pb_day_test_points_at_new,
  pb_week_test_points      = r.pb_week_test_points_new,
  pb_week_test_points_at   = r.pb_week_test_points_at_new,
  pb_session_score_percent = r.pb_session_score_percent_new,
  pb_session_score_at      = r.pb_session_score_at_new,
  updated_at               = now()
FROM recomputed r
WHERE u.id = r.id
  AND (
    u.pb_day_test_points,
    u.pb_day_test_points_at,
    u.pb_week_test_points,
    u.pb_week_test_points_at,
    u.pb_session_score_percent,
    u.pb_session_score_at
  ) IS DISTINCT FROM (
    r.pb_day_test_points_new,
    r.pb_day_test_points_at_new,
    r.pb_week_test_points_new,
    r.pb_week_test_points_at_new,
    r.pb_session_score_percent_new,
    r.pb_session_score_at_new
  );

-- ----------------------------------------------------------------------------
-- Sanity assertions (inside the migration tx — failure aborts the migration)
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  v_users_with_history     integer;
  v_users_with_pb_day      integer;
  v_users_with_pb_session  integer;
  v_max_pb_day             integer;
  v_max_pb_day_source      integer;
BEGIN
  -- Every user with at least one positive-points day should now have a pb_day.
  SELECT count(DISTINCT user_id)
  INTO   v_users_with_history
  FROM   public.user_daily_activity
  WHERE  test_points_earned > 0;

  SELECT count(*)
  INTO   v_users_with_pb_day
  FROM   public.users
  WHERE  pb_day_test_points IS NOT NULL;

  IF v_users_with_pb_day < v_users_with_history THEN
    RAISE EXCEPTION
      'v1a backfill_personal_bests: % users have positive-points history but only % got pb_day_test_points',
      v_users_with_history, v_users_with_pb_day;
  END IF;

  -- Every user with at least one test session should now have a pb_session.
  SELECT count(*)
  INTO   v_users_with_pb_session
  FROM   public.users
  WHERE  pb_session_score_percent IS NOT NULL;

  IF v_users_with_pb_session < (
    SELECT count(DISTINCT user_id)
    FROM   public.test_sessions
    WHERE  user_id IS NOT NULL
      AND  taken_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'v1a backfill_personal_bests: pb_session_score_percent is missing for some users with test session history';
  END IF;

  -- pb_day_test_points should equal the MAX day_total in source.
  SELECT COALESCE(MAX(pb_day_test_points), 0) INTO v_max_pb_day FROM public.users;
  SELECT COALESCE(MAX(day_total), 0) INTO v_max_pb_day_source FROM (
    SELECT SUM(test_points_earned)::integer AS day_total
    FROM   public.user_daily_activity
    GROUP  BY user_id, activity_date
  ) t;

  IF v_max_pb_day <> v_max_pb_day_source THEN
    RAISE EXCEPTION
      'v1a backfill_personal_bests: MAX(users.pb_day_test_points)=% but source MAX(day_total)=%',
      v_max_pb_day, v_max_pb_day_source;
  END IF;

  RAISE NOTICE
    'v1a backfill_personal_bests: % users with pb_day, % users with pb_session (max pb_day=%)',
    v_users_with_pb_day, v_users_with_pb_session, v_max_pb_day;
END$$;
