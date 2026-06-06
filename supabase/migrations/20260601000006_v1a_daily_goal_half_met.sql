-- ============================================================================
-- v1a — Daily-goal halfway flag + 50% threshold toast
-- ============================================================================
--
-- Adds `user_daily_activity.daily_goal_half_met` (sticky boolean mirroring
-- `daily_goal_met`) and extends `update_daily_activity` to fire the
-- `goal.daily_50_percent` notification template exactly once per (user, date)
-- the first time today's cross-language XP crosses HALF of the user's
-- `daily_xp_goal`.
--
-- Ordering inside the RPC body
-- ----------------------------
-- The new 50% block sits immediately BEFORE the existing 100% block, so the
-- canonical reading order is "halfway → done". When a single big session
-- crosses both thresholds in one RPC call, the 50% block detects that the
-- session also crossed 100% and skips its toast (the user gets the more
-- celebratory `goal.daily_complete` toast and a single coin grant instead of
-- two adjacent notifications).
--
-- Both flags are written atomically with the rest of the upsert because the
-- whole RPC runs in one statement context. Both default to false on existing
-- rows.
--
-- Idempotency
-- -----------
-- `ADD COLUMN IF NOT EXISTS` makes the column add re-runnable; `CREATE OR
-- REPLACE FUNCTION` makes the RPC body update re-runnable.
-- ============================================================================

ALTER TABLE public.user_daily_activity
  ADD COLUMN IF NOT EXISTS daily_goal_half_met boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_daily_activity.daily_goal_half_met IS
  'True once the user has earned at least HALF of users.daily_xp_goal in cross-language XP on this date. Set sticky on the activity row that crosses the half threshold; never flipped back to false within the day. Drives the once-per-day goal.daily_50_percent notification template. Mirrors daily_goal_met but for the 50% milestone.';

-- ----------------------------------------------------------------------------
-- Extended update_daily_activity (50% threshold block inserted before 100%)
-- ----------------------------------------------------------------------------

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
  v_today              date := CURRENT_DATE;
  v_yesterday          date := v_today - 1;
  v_user               RECORD;
  v_gap_days           integer := 0;
  v_freeze_date        date;
  v_today_total_xp     integer;
  v_week_start         date := date_trunc('week', v_today)::date;
  v_week_end           date := (date_trunc('week', v_today) + INTERVAL '6 days')::date;
  v_week_total_xp      integer;
  v_streak_after       integer;
  v_milestone_slug     text;
  v_milestone_exists   boolean;
  v_comeback_exists    boolean;
BEGIN
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
  -- 5a. Daily-goal HALFWAY (cross-language, once per day)
  -- ------------------------------------------------------------------------
  --
  -- Compute today's cross-language XP once and reuse for both 5a and 5b.

  SELECT COALESCE(SUM(test_points_earned), 0)
  INTO v_today_total_xp
  FROM public.user_daily_activity
  WHERE user_id = p_user_id AND activity_date = v_today;

  IF v_today_total_xp >= GREATEST(1, COALESCE(v_user.daily_xp_goal, 30) / 2)
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_daily_activity
       WHERE user_id = p_user_id
         AND activity_date = v_today
         AND daily_goal_half_met = true
     )
  THEN
    UPDATE public.user_daily_activity
      SET daily_goal_half_met = true,
          updated_at          = now()
    WHERE user_id      = p_user_id
      AND activity_date = v_today
      AND language_id   = p_language_id;

    -- Skip toast if 100% already crossed this turn (single big session) —
    -- the 5b block below will fire the more celebratory daily_complete
    -- toast, so we don't want two adjacent goal toasts.
    IF v_today_total_xp < COALESCE(v_user.daily_xp_goal, 30) THEN
      PERFORM public.fire_notification_template(
        p_user_id,
        'goal.daily_50_percent',
        jsonb_build_object(
          'percent', LEAST(100, ROUND(v_today_total_xp * 100.0 /
            GREATEST(1, COALESCE(v_user.daily_xp_goal, 30))))
        )
      );
    END IF;
  END IF;

  -- ------------------------------------------------------------------------
  -- 5b. Daily-goal completion (cross-language, once per day)
  -- ------------------------------------------------------------------------

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

  -- v_today_total_xp already computed in step 5a.

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
  'v1a-extended daily activity rollup with halfway-goal toast. Same behaviour as the previous version (upsert per-language row, streak update with freeze auto-consume, lifetime_xp bump, 20-coin daily-goal completion, day-streak milestones, PB day/week, comeback_kid) plus a new 5a block that sets user_daily_activity.daily_goal_half_met sticky-true and fires goal.daily_50_percent the first time today''s cross-language XP crosses HALF the daily_xp_goal. The 50% toast self-skips when the same RPC call also crosses 100% so users don''t get two adjacent goal toasts.';
