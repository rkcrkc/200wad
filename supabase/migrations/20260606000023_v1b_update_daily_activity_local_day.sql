-- v1b: bucket daily activity by the user's LOCAL calendar day instead of UTC.
--
-- Previously `v_today := CURRENT_DATE` (server UTC). Everything downstream —
-- the activity-row upsert, day-streak continuation/gap math, the daily-goal
-- completion flag + coin award, and the PB day/week stamps — derives from
-- v_today, so a UTC day boundary meant a UTC+8 user's daily counters rolled
-- over at 08:00 local. We now read the user's stored IANA timezone (migration
-- 022, default 'UTC') and compute today/yesterday/week bounds in that zone. A
-- single point-of-change fixes every dependent calculation at once.
--
-- Signature (RETURNS void) is unchanged, so CREATE OR REPLACE preserves the
-- existing EXECUTE grants. Only the date-derivation block at the top of BEGIN
-- changes vs. migration 20260530000007; all other logic is reproduced verbatim.

CREATE OR REPLACE FUNCTION public.update_daily_activity(
  p_user_id uuid,
  p_language_id uuid,
  p_words_studied integer DEFAULT 0,
  p_words_mastered integer DEFAULT 0,
  p_test_points_earned integer DEFAULT 0,
  p_test_max_points integer DEFAULT 0,
  p_study_time_seconds integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tz                 text;
  v_today              date;
  v_yesterday          date;
  v_user               RECORD;
  v_gap_days           integer := 0;
  v_freeze_date        date;
  v_today_total_xp     integer;
  v_week_start         date;
  v_week_end           date;
  v_week_total_xp      integer;
  v_streak_after       integer;
  v_milestone_slug     text;
  v_milestone_exists   boolean;
  v_comeback_exists    boolean;
BEGIN
  -- ------------------------------------------------------------------------
  -- 0. Resolve "today" in the user's local timezone
  -- ------------------------------------------------------------------------
  -- Read the stored IANA tz (defaults to 'UTC'). `now() AT TIME ZONE v_tz`
  -- yields the user's local wall-clock timestamp; ::date is their local day.
  -- All day/week math below flows from these, so the daily-goal ring and
  -- streak roll over at the user's local midnight, not UTC's.
  SELECT COALESCE(timezone, 'UTC') INTO v_tz
  FROM public.users WHERE id = p_user_id;

  IF v_tz IS NULL THEN
    v_tz := 'UTC';
  END IF;

  v_today      := (now() AT TIME ZONE v_tz)::date;
  v_yesterday  := v_today - 1;
  v_week_start := date_trunc('week', v_today)::date;
  v_week_end   := (date_trunc('week', v_today) + INTERVAL '6 days')::date;

  -- ------------------------------------------------------------------------
  -- 1. Upsert today's per-language activity row
  -- ------------------------------------------------------------------------

  INSERT INTO public.user_daily_activity (
    user_id, activity_date, language_id,
    words_studied, words_mastered,
    test_points_earned, test_max_points,
    study_time_seconds, sessions_count
  )
  VALUES (
    p_user_id, v_today, p_language_id,
    p_words_studied, p_words_mastered,
    p_test_points_earned, p_test_max_points,
    p_study_time_seconds, 1
  )
  ON CONFLICT (user_id, activity_date, language_id) DO UPDATE SET
    words_studied      = public.user_daily_activity.words_studied      + EXCLUDED.words_studied,
    words_mastered     = public.user_daily_activity.words_mastered     + EXCLUDED.words_mastered,
    test_points_earned = public.user_daily_activity.test_points_earned + EXCLUDED.test_points_earned,
    test_max_points    = public.user_daily_activity.test_max_points    + EXCLUDED.test_max_points,
    study_time_seconds = public.user_daily_activity.study_time_seconds + EXCLUDED.study_time_seconds,
    sessions_count     = public.user_daily_activity.sessions_count     + 1,
    updated_at         = now();

  -- ------------------------------------------------------------------------
  -- 2. Lock + read user state (single read serves steps 3-7)
  -- ------------------------------------------------------------------------

  SELECT
    last_activity_date,
    current_streak,
    longest_streak,
    streak_freezes_available,
    daily_xp_goal,
    pb_day_test_points,
    pb_day_test_points_at,
    pb_week_test_points,
    pb_week_test_points_at
  INTO v_user
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'update_daily_activity: user % not found', p_user_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- ------------------------------------------------------------------------
  -- 3. Streak update (with freeze auto-consume on gap)
  -- ------------------------------------------------------------------------

  IF v_user.last_activity_date = v_today THEN
    -- Already active today — no streak change.
    NULL;

  ELSIF v_user.last_activity_date = v_yesterday THEN
    -- Continued.
    UPDATE public.users SET
      current_streak     = COALESCE(current_streak, 0) + 1,
      longest_streak     = GREATEST(COALESCE(longest_streak, 0),
                                    COALESCE(current_streak, 0) + 1),
      last_activity_date = v_today,
      updated_at         = now()
    WHERE id = p_user_id;

  ELSE
    -- Gap. Count missed days strictly between last activity and today.
    v_gap_days := CASE
      WHEN v_user.last_activity_date IS NULL THEN 0
      ELSE (v_today - v_user.last_activity_date - 1)::integer
    END;

    IF v_gap_days > 0
       AND v_gap_days <= COALESCE(v_user.streak_freezes_available, 0) THEN
      -- Freezes cover the whole gap. Burn one per missed day, write zero-
      -- metric streak_frozen rows for each, preserve + continue the streak.
      FOR v_freeze_date IN
        SELECT generate_series(
          v_user.last_activity_date + 1,
          v_today - 1,
          '1 day'::interval
        )::date
      LOOP
        INSERT INTO public.user_daily_activity (
          user_id, activity_date, language_id,
          words_studied, words_mastered,
          test_points_earned, test_max_points,
          study_time_seconds, sessions_count,
          streak_frozen
        )
        VALUES (
          p_user_id, v_freeze_date, p_language_id,
          0, 0, 0, 0, 0, 0, true
        )
        ON CONFLICT (user_id, activity_date, language_id) DO UPDATE SET
          streak_frozen = true,
          updated_at    = now();
      END LOOP;

      UPDATE public.users SET
        streak_freezes_available = streak_freezes_available - v_gap_days,
        current_streak           = COALESCE(current_streak, 0) + 1,
        longest_streak           = GREATEST(COALESCE(longest_streak, 0),
                                            COALESCE(current_streak, 0) + 1),
        last_activity_date       = v_today,
        updated_at               = now()
      WHERE id = p_user_id;

      PERFORM public.fire_notification_template(
        p_user_id,
        'streak.frozen_today',
        jsonb_build_object('days_frozen', v_gap_days)
      );

    ELSE
      -- Gap not coverable (or no freezes). Streak breaks. Don't consume
      -- partial freezes — keeping them is the simpler mental model.
      UPDATE public.users SET
        current_streak     = 1,
        longest_streak     = GREATEST(COALESCE(longest_streak, 0), 1),
        last_activity_date = v_today,
        updated_at         = now()
      WHERE id = p_user_id;
    END IF;
  END IF;

  -- ------------------------------------------------------------------------
  -- 4. XP cache bump (raw test points, never multiplied)
  -- ------------------------------------------------------------------------

  IF p_test_points_earned > 0 THEN
    UPDATE public.users
      SET lifetime_xp = lifetime_xp + p_test_points_earned
    WHERE id = p_user_id;
  END IF;

  -- ------------------------------------------------------------------------
  -- 5. Daily-goal completion (cross-language, once per day)
  -- ------------------------------------------------------------------------

  SELECT COALESCE(SUM(test_points_earned), 0)
  INTO v_today_total_xp
  FROM public.user_daily_activity
  WHERE user_id = p_user_id AND activity_date = v_today;

  IF v_today_total_xp >= COALESCE(v_user.daily_xp_goal, 30)
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_daily_activity
       WHERE user_id = p_user_id
         AND activity_date = v_today
         AND daily_goal_met = true
     )
  THEN
    UPDATE public.user_daily_activity
      SET daily_goal_met = true,
          updated_at     = now()
    WHERE user_id      = p_user_id
      AND activity_date = v_today
      AND language_id   = p_language_id;

    PERFORM public.award_coins(
      p_user_id,
      20,
      'daily_goal',
      'user_daily_activity',
      NULL,
      'Daily XP goal completed'
    );

    PERFORM public.fire_notification_template(
      p_user_id,
      'goal.daily_complete',
      jsonb_build_object(
        'xp',   v_today_total_xp,
        'goal', COALESCE(v_user.daily_xp_goal, 30)
      )
    );
  END IF;

  -- ------------------------------------------------------------------------
  -- 6. Day-streak milestone (unlock_achievement gated by slug existence)
  -- ------------------------------------------------------------------------

  SELECT current_streak INTO v_streak_after
  FROM public.users WHERE id = p_user_id;

  IF v_streak_after IS NOT NULL AND v_streak_after > 0 THEN
    v_milestone_slug := 'streak_' || v_streak_after::text;

    SELECT EXISTS (
      SELECT 1 FROM public.achievements
      WHERE slug = v_milestone_slug AND enabled = true
    ) INTO v_milestone_exists;

    IF v_milestone_exists THEN
      -- Idempotent: unlock_achievement no-ops on re-call (UNIQUE constraint).
      PERFORM public.unlock_achievement(p_user_id, v_milestone_slug);
    END IF;
  END IF;

  -- ------------------------------------------------------------------------
  -- 7. PB comparison (day + ISO-week)
  -- ------------------------------------------------------------------------

  -- v_today_total_xp already computed in step 5.

  IF v_today_total_xp > 0
     AND v_today_total_xp > COALESCE(v_user.pb_day_test_points, 0)
  THEN
    UPDATE public.users SET
      pb_day_test_points    = v_today_total_xp,
      pb_day_test_points_at = v_today
    WHERE id = p_user_id;

    -- Only fire if previous PB was on a different day (no spam within today).
    IF v_user.pb_day_test_points_at IS DISTINCT FROM v_today THEN
      PERFORM public.fire_notification_template(
        p_user_id,
        'personal_best.day',
        jsonb_build_object('points', v_today_total_xp)
      );
    END IF;
  END IF;

  SELECT COALESCE(SUM(test_points_earned), 0)
  INTO v_week_total_xp
  FROM public.user_daily_activity
  WHERE user_id = p_user_id
    AND activity_date BETWEEN v_week_start AND v_week_end;

  IF v_week_total_xp > 0
     AND v_week_total_xp > COALESCE(v_user.pb_week_test_points, 0)
  THEN
    UPDATE public.users SET
      pb_week_test_points    = v_week_total_xp,
      pb_week_test_points_at = v_week_start
    WHERE id = p_user_id;

    IF v_user.pb_week_test_points_at IS DISTINCT FROM v_week_start THEN
      PERFORM public.fire_notification_template(
        p_user_id,
        'personal_best.week',
        jsonb_build_object('points', v_week_total_xp)
      );
    END IF;
  END IF;

  -- ------------------------------------------------------------------------
  -- 8. Low-cost mystery achievements
  -- ------------------------------------------------------------------------

  -- comeback_kid: returning after a 7+ day absence. Evaluated against the
  -- gap captured at the top of step 3 (last_activity_date vs today).
  IF v_user.last_activity_date IS NOT NULL
     AND (v_today - v_user.last_activity_date) >= 7
  THEN
    SELECT EXISTS (
      SELECT 1 FROM public.achievements
      WHERE slug = 'comeback_kid' AND enabled = true
    ) INTO v_comeback_exists;

    IF v_comeback_exists THEN
      PERFORM public.unlock_achievement(p_user_id, 'comeback_kid');
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION
  public.update_daily_activity(uuid, uuid, integer, integer, integer, integer, integer)
IS
  'v1b-extended daily activity rollup. Identical to the v1a version except "today" (and the derived yesterday / ISO-week bounds) is computed in the user''s stored IANA timezone (users.timezone, default UTC) rather than server UTC, so the activity bucket, day-streak, daily-goal completion, and PB day/week stamps all roll over at the user''s local midnight. Idempotent across multiple same-day calls.';
