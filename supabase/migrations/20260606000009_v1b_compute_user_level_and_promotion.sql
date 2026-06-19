-- ============================================================================
-- v1b Levels — compute_user_level + update_daily_activity promotion + backfill
-- ============================================================================
--
-- Adds the dual-gate level resolver and wires rank promotion into the activity
-- rollup. compute_user_level is a pure resolver (no side effects); the RPC owns
-- the persist + notify on promotion. Levels are monotonic status — we only ever
-- promote, never demote (e.g. if an admin later raises a threshold a user has
-- already passed, their cached rank stays).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. compute_user_level — pure dual-gate resolver
-- ----------------------------------------------------------------------------
-- Highest enabled level whose BOTH thresholds are cleared by the user's cached
-- lifetime_xp and their cross-language lessons-mastered count. COALESCE to 1 so
-- the entry rank is always held (level 1 seeds with 0/0 thresholds anyway).

CREATE OR REPLACE FUNCTION public.compute_user_level(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(MAX(l.level_number), 1)
  FROM public.levels l
  WHERE l.enabled = true
    AND l.xp_threshold <= (
      SELECT COALESCE(u.lifetime_xp, 0)
      FROM public.users u WHERE u.id = p_user_id
    )
    AND l.lessons_mastered_threshold <= (
      SELECT COUNT(*)
      FROM public.user_lesson_progress ulp
      WHERE ulp.user_id = p_user_id AND ulp.status = 'mastered'
    );
$$;

REVOKE EXECUTE ON FUNCTION public.compute_user_level(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_user_level(uuid)
  TO service_role;

COMMENT ON FUNCTION public.compute_user_level(uuid) IS
  'Pure dual-gate level resolver: highest enabled levels.level_number whose xp_threshold and lessons_mastered_threshold are both cleared by the user. Returns 1 (entry rank) when nothing higher qualifies. No side effects — callers persist users.current_level themselves.';

-- ----------------------------------------------------------------------------
-- 2. update_daily_activity — add step 9 (level promotion)
-- ----------------------------------------------------------------------------
-- Full CREATE OR REPLACE preserving steps 1-8; adds three locals and a final
-- promotion step after the XP bump has settled and lesson mastery for this
-- activity is reflected in user_lesson_progress.

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
  v_old_level          integer;
  v_new_level          integer;
  v_new_level_name     text;
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

  -- night_owl / early_bird: deferred until users.timezone exists. Without
  -- per-user TZ, server-local time-of-day is meaningless across a global
  -- user base. Will move to a session-complete hook driven by client-supplied
  -- local hour, or to a future migration that adds the timezone column.

  -- ------------------------------------------------------------------------
  -- 9. Level promotion (dual gate: lifetime_xp + lessons_mastered)
  -- ------------------------------------------------------------------------
  -- Recompute the cached rank from the freshly-bumped lifetime_xp + current
  -- lessons-mastered count. Monotonic: only ever promote, never demote. On an
  -- increase, persist current_level + fire level.promoted. No-op otherwise.

  SELECT current_level INTO v_old_level
  FROM public.users WHERE id = p_user_id;

  v_new_level := public.compute_user_level(p_user_id);

  IF v_new_level > COALESCE(v_old_level, 1) THEN
    UPDATE public.users SET
      current_level = v_new_level,
      updated_at    = now()
    WHERE id = p_user_id;

    SELECT name INTO v_new_level_name
    FROM public.levels
    WHERE level_number = v_new_level AND enabled = true;

    IF v_new_level_name IS NOT NULL THEN
      PERFORM public.fire_notification_template(
        p_user_id,
        'level.promoted',
        jsonb_build_object('level_name', v_new_level_name)
      );
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION
  public.update_daily_activity(uuid, uuid, integer, integer, integer, integer, integer)
IS
  'v1b daily activity rollup. Upserts the per-(user, date, language) activity row, updates the day-streak with freeze auto-consume on gaps, bumps cached lifetime_xp, awards 20 coins on first-time daily-goal completion (cross-language), unlocks day-streak milestone achievements, updates PB day/week stamps with notifications, evaluates low-cost mystery achievements (comeback_kid), and recomputes the cached current_level (dual gate: lifetime_xp + lessons_mastered), firing level.promoted on a monotonic promotion. Idempotent across same-day calls.';

-- ----------------------------------------------------------------------------
-- 3. Backfill existing users' cached current_level
-- ----------------------------------------------------------------------------

UPDATE public.users u
  SET current_level = public.compute_user_level(u.id),
      updated_at    = now()
WHERE u.current_level IS DISTINCT FROM public.compute_user_level(u.id);
