-- ============================================================================
-- v1b — surface the exact coin amount in coin-earning notifications
-- ============================================================================
--
-- Why
-- ---
-- Every notification fired off the back of a coin award ("Daily goal complete!",
-- achievement unlocks, streak milestones, …) said some variant of "coins added
-- to your balance" without ever stating HOW MANY. This migration threads the
-- coin amount through to the rendered copy via a new `{coins}` placeholder and
-- standardises the wording to "+N coins earned".
--
-- Three coordinated changes, all idempotent:
--   1. Template copy — rewrite the 9 coin-earning templates to use `{coins}`.
--   2. unlock_achievement — substitute `{coins}` from achievements.coin_reward
--      (covers achievement.unlocked + achievement.day_streak_milestone, i.e.
--      comeback_kid, streak_N, and every default-firing unlock).
--   3. update_daily_activity — pass the 20-coin daily-goal reward into the
--      goal.daily_complete fire so the message can render it.
--
-- The remaining coin-earning templates (first_word_*, first_lesson_complete,
-- first_perfect_test, words/lessons milestones) fire from the TS path
-- (recordProgressAchievements); that caller is updated separately to pass the
-- `coins` override.
--
-- Note: spend-side templates (shop.purchase, streak.recovered) already show
-- their coin cost and are intentionally left untouched.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Template copy
-- ----------------------------------------------------------------------------
-- Unconditional UPDATEs (not guarded on prior text): this migration owns the
-- canonical "+{coins} coins earned" wording for these keys.

UPDATE public.notification_templates
SET message       = 'You hit your daily XP goal ({xp}/{goal}). +{coins} coins earned.',
    toast_message = '{xp}/{goal} XP — +{coins} coins earned.',
    updated_at    = now()
WHERE key = 'goal.daily_complete';

UPDATE public.notification_templates
SET message       = 'Locked in a {title}. +{coins} coins earned.',
    toast_message = '{title} — +{coins} coins earned.',
    updated_at    = now()
WHERE key = 'achievement.day_streak_milestone';

UPDATE public.notification_templates
SET message       = 'Achievement unlocked: {title}. +{coins} coins earned.',
    toast_message = '{title} — +{coins} coins',
    updated_at    = now()
WHERE key = 'achievement.unlocked';

UPDATE public.notification_templates
SET message       = 'You answered a word with full marks (3/3) — no clues, no mistakes. +{coins} coins earned.',
    toast_message = 'Full marks (3/3). +{coins} coins earned.',
    updated_at    = now()
WHERE key = 'achievement.first_word_learned';

UPDATE public.notification_templates
SET message       = 'You just mastered your first word. +{coins} coins earned.',
    toast_message = 'Three full-mark answers in a row. +{coins} coins earned.',
    updated_at    = now()
WHERE key = 'achievement.first_word_mastered';

UPDATE public.notification_templates
SET message    = 'You mastered every word in a lesson. +{coins} coins earned.',
    updated_at = now()
WHERE key = 'achievement.first_lesson_complete';

UPDATE public.notification_templates
SET message    = 'You aced your first test with no mistakes. +{coins} coins earned.',
    updated_at = now()
WHERE key = 'achievement.first_perfect_test';

UPDATE public.notification_templates
SET message    = 'You''ve mastered {count} words. +{coins} coins earned.',
    updated_at = now()
WHERE key = 'achievement.words_mastered_milestone';

UPDATE public.notification_templates
SET message    = 'You''ve fully mastered {count} lessons. +{coins} coins earned.',
    updated_at = now()
WHERE key = 'achievement.lessons_complete_milestone';

-- ----------------------------------------------------------------------------
-- 2. unlock_achievement — substitute {coins} from the catalogue coin_reward
-- ----------------------------------------------------------------------------
-- Identical to migration 20260606000004 except: the firing block now stamps
-- `coins` into the notification data payload and substitutes the `{coins}`
-- placeholder (alongside the existing `{title}`) in both title and message.
-- CREATE OR REPLACE preserves the existing grants.

CREATE OR REPLACE FUNCTION public.unlock_achievement(
  p_user_id uuid,
  p_achievement_slug text,
  p_fire_notification boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ach            RECORD;
  v_unlock_id      uuid;
  v_coin_tx_id     uuid;
  v_template       RECORD;
  v_type_enabled   boolean;
  v_data           jsonb;
  v_channel        text;
  v_title          text;
  v_message        text;
BEGIN
  -- ----- Input validation -------------------------------------------------

  IF p_achievement_slug IS NULL OR length(btrim(p_achievement_slug)) = 0 THEN
    RAISE EXCEPTION 'unlock_achievement: slug is required'
      USING ERRCODE = 'check_violation';
  END IF;

  -- ----- Look up the catalogue row ---------------------------------------

  SELECT
    id,
    slug,
    title,
    description,
    coin_reward,
    xp_reward,
    notification_template_key,
    enabled
  INTO v_ach
  FROM public.achievements
  WHERE slug = p_achievement_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unlock_achievement: no achievement with slug %', p_achievement_slug
      USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT v_ach.enabled THEN
    RAISE EXCEPTION 'unlock_achievement: achievement % is disabled', p_achievement_slug
      USING ERRCODE = 'check_violation';
  END IF;

  -- ----- Idempotent insert -----------------------------------------------

  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (p_user_id, v_ach.id)
  ON CONFLICT (user_id, achievement_id) DO NOTHING
  RETURNING id INTO v_unlock_id;

  IF v_unlock_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- ----- Coin reward ------------------------------------------------------

  IF v_ach.coin_reward > 0 THEN
    v_coin_tx_id := public.award_coins(
      p_user_id,
      v_ach.coin_reward,
      'achievement',
      'achievement',
      v_ach.id,
      format('Achievement unlocked: %s', v_ach.title)
    );

    UPDATE public.user_achievements
      SET coin_transaction_id = v_coin_tx_id
      WHERE id = v_unlock_id;
  END IF;

  -- ----- XP reward --------------------------------------------------------

  IF v_ach.xp_reward > 0 THEN
    UPDATE public.users
      SET lifetime_xp = lifetime_xp + v_ach.xp_reward
      WHERE id = p_user_id;
  END IF;

  -- ----- Notification firing ---------------------------------------------
  -- Skipped entirely when the caller opts out (p_fire_notification = false),
  -- e.g. recordProgressAchievements which fires its own richer notification.

  IF p_fire_notification AND v_ach.notification_template_key IS NOT NULL THEN
    SELECT
      key,
      type,
      enabled,
      title,
      message,
      channels,
      default_data
    INTO v_template
    FROM public.notification_templates
    WHERE key = v_ach.notification_template_key;

    IF FOUND AND v_template.enabled THEN
      SELECT COALESCE(enabled, true)
      INTO v_type_enabled
      FROM public.notification_types
      WHERE type = v_template.type;

      IF v_type_enabled IS NULL THEN
        v_type_enabled := true;
      END IF;

      IF v_type_enabled THEN
        v_data := COALESCE(v_template.default_data, '{}'::jsonb)
                  || jsonb_build_object(
                       'template_key',          v_template.key,
                       'achievement_slug',      v_ach.slug,
                       'achievement_id',        v_ach.id,
                       'user_achievement_id',   v_unlock_id,
                       'coins',                 v_ach.coin_reward
                     );

        -- {title} and {coins} substitution (matches TS regex /\{(\w+)\}/g).
        v_title := regexp_replace(v_template.title, '\{title\}', v_ach.title, 'g');
        v_title := regexp_replace(v_title, '\{coins\}', v_ach.coin_reward::text, 'g');
        v_message := regexp_replace(v_template.message, '\{title\}', v_ach.title, 'g');
        v_message := regexp_replace(v_message, '\{coins\}', v_ach.coin_reward::text, 'g');

        FOREACH v_channel IN ARRAY v_template.channels
        LOOP
          IF v_channel <> 'toast' THEN
            INSERT INTO public.notifications (
              user_id,
              channel,
              type,
              title,
              message,
              data,
              is_read
            )
            VALUES (
              p_user_id,
              v_channel,
              v_template.type,
              v_title,
              v_message,
              v_data,
              false
            );
          END IF;
        END LOOP;
      END IF;
    END IF;
  END IF;

  RETURN v_unlock_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. update_daily_activity — pass the daily-goal coin reward to the template
-- ----------------------------------------------------------------------------
-- Identical to migration 20260606000023 except the goal.daily_complete fire
-- now passes `coins` (the same literal 20 awarded one statement above) so the
-- message can render "+20 coins earned". CREATE OR REPLACE preserves grants.

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
        'xp',    v_today_total_xp,
        'goal',  COALESCE(v_user.daily_xp_goal, 30),
        'coins', 20
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
