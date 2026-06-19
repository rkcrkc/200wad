-- ============================================================================
-- v1a Gamification — extended `update_daily_activity` + template-fire helper
-- ============================================================================
--
-- Replaces the existing `update_daily_activity` with the v1a version. The
-- existing function did two things: upsert the per-language activity row and
-- update `users.current_streak` / `longest_streak`. The new version preserves
-- both of those exactly, then layers in:
--
--   3. Streak-freeze auto-consume on a gap (vs. unconditional reset).
--   4. XP cache bump to `users.lifetime_xp` (raw, never multiplied).
--   5. Cross-language daily-goal completion + 20-coin award.
--   6. Day-streak milestone unlocks via `unlock_achievement` (catalogue
--      defines the slugs `streak_N` and their coin/XP rewards + notification
--      template, so milestone economics are admin-editable post-deploy).
--   7. PB day + PB week comparison, with notification firing gated against
--      "PB was set on a different day/week" so the same threshold doesn't
--      spam toasts within a single window.
--   8. Low-cost mystery achievement evaluation (`comeback_kid` — returning
--      after a 7+ day gap). Time-of-day mystery slots (`night_owl`,
--      `early_bird`) are deferred until `users.timezone` exists.
--
-- One legacy behaviour is removed: the old function awarded Stripe credit
-- cents on streak milestones from `platform_config.streak_rewards`. v1a
-- moves milestone rewards to coins (single currency for in-app gamification,
-- credits stay as a Stripe billing mechanism only). The achievement
-- catalogue replaces the platform_config schedule.
--
-- All new behaviour is gated against the achievement / template existing in
-- the catalogue (catalogue + templates seed in migrations 8 and 9). Until
-- those land this function ships dark: existing behaviour preserved, new
-- branches silently no-op. When the seeds land the branches light up
-- automatically. No code-deploy gate required.
--
-- Helper: `fire_notification_template`
-- ------------------------------------
-- Mirrors the TS `insertFromTemplate` helper (`src/lib/notifications/
-- template.ts`) in SQL so SECURITY DEFINER RPCs can fire notifications
-- atomically inside their own transaction. Same gate order:
--   1. Template exists?       else skip (returns 0)
--   2. Template enabled?      else skip
--   3. notification_types.enabled for template.type? (missing row → enabled)
-- Same channel handling: one persisted notifications row per channel,
-- `toast` skipped (transient). Same placeholder substitution syntax:
-- `{varName}` replaced by string values from `p_overrides`. Same data
-- merge: `template.default_data` ⨁ `p_overrides` ⨁ `{template_key}` stamp.
--
-- The helper is SECURITY DEFINER + EXECUTE-restricted to service_role for
-- the same reasons as `award_coins` / `unlock_achievement`. Internal
-- cross-calls from other SECURITY DEFINER RPCs work because they all run as
-- postgres.
--
-- (Note: `unlock_achievement` from migration 6 has its own inlined copy of
-- this gate logic — left in place for now. A future cleanup migration can
-- refactor it to call this helper.)
--
-- Streak freeze semantics
-- -----------------------
-- A freeze "saves" a missed day. Each missed day in a gap consumes one
-- token from `users.streak_freezes_available`. The save is all-or-nothing:
-- if `gap_days > freezes_available`, the streak breaks AND no tokens are
-- consumed (we don't waste freezes on a gap they can't cover). This is
-- simpler to reason about than Duolingo's partial-consume model and matches
-- the "freeze is insurance" framing the analysis locked in.
--
-- Freeze rows on `user_daily_activity` carry zeroed metrics, `streak_frozen
-- = true`, and the language_id the user is studying when they return.
-- Day-streak math reads "did this user have ANY row on date X" (via
-- EXISTS), so a single row per date — across any language — is enough.
--
-- A `streak.frozen_today` template fires once per RPC call that consumes
-- freezes, with `{days_frozen}` substituted.
--
-- Daily goal semantics
-- --------------------
-- The 20-coin reward fires once per (user, date). The "did we already
-- award today" gate reads `EXISTS (… WHERE daily_goal_met = true AND
-- activity_date = today)` across all the user's language rows — so the
-- award is cross-language, fires the first time today's TOTAL XP crosses
-- the goal regardless of which language pushed it over. The `daily_goal_met
-- = true` flag is written only to the row matching the CURRENT call's
-- `language_id` (the one being upserted in step 1). Reads ignore which
-- language row carries the flag — only the per-date existence matters.
--
-- PB semantics
-- ------------
-- Day PB = max single-day total test_points_earned summed across all the
-- user's languages.
-- Week PB = max ISO-week total, summed across all languages, over the
-- ISO-week containing today.
-- Notification fires only when the previous PB's stamp date / week-start is
-- DIFFERENT from today / this week. Within a window the cached PB still
-- moves up (so leaderboards / surface UIs stay correct), the toast just
-- doesn't repeat.
--
-- Hardcoded constants in v1a
-- --------------------------
--   * Daily-goal coin reward = 20. Reconsider with shop pricing in v1b;
--     for now this matches the analysis doc's "1 coin per perfect answer +
--     bonuses, ~150/day soft cap" framing.
--   * Mystery achievement gap threshold for `comeback_kid` = 7 days.
-- Both can be promoted to platform_config keys later if admins want to
-- tune them.
--
-- Migration ordering
-- ------------------
-- Depends on migrations 1-6: users columns, user_daily_activity columns,
-- coin_transactions, achievements + user_achievements, award_coins,
-- unlock_achievement.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: fire_notification_template
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fire_notification_template(
  p_user_id uuid,
  p_template_key text,
  p_overrides jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_template       RECORD;
  v_type_enabled   boolean;
  v_data           jsonb;
  v_title          text;
  v_message        text;
  v_channel        text;
  v_count          integer := 0;
  v_pair           RECORD;
BEGIN
  IF p_template_key IS NULL OR length(btrim(p_template_key)) = 0 THEN
    RETURN 0;
  END IF;

  SELECT key, type, enabled, title, message, channels, default_data
  INTO v_template
  FROM public.notification_templates
  WHERE key = p_template_key;

  IF NOT FOUND OR NOT v_template.enabled THEN
    RETURN 0;
  END IF;

  -- Type-enabled gate. A missing row in notification_types is treated as
  -- enabled (matches the TS helper: only an explicit false blocks delivery).
  SELECT enabled INTO v_type_enabled
  FROM public.notification_types
  WHERE type = v_template.type;

  IF v_type_enabled IS NULL THEN
    v_type_enabled := true;
  END IF;

  IF NOT v_type_enabled THEN
    RETURN 0;
  END IF;

  -- Build the data payload. default_data ⨁ overrides ⨁ template_key stamp.
  v_data := COALESCE(v_template.default_data, '{}'::jsonb)
            || COALESCE(p_overrides, '{}'::jsonb)
            || jsonb_build_object('template_key', v_template.key);

  -- Placeholder substitution. Loop string-valued keys from p_overrides and
  -- replace `{key}` in title/message. Keys must be word chars only (matches
  -- the TS regex `/\{(\w+)\}/g`); callers pass keys like "days_frozen", not
  -- "user.name".
  v_title := v_template.title;
  v_message := v_template.message;

  FOR v_pair IN
    SELECT key, value
    FROM jsonb_each_text(COALESCE(p_overrides, '{}'::jsonb))
    WHERE value IS NOT NULL AND key ~ '^\w+$'
  LOOP
    v_title := regexp_replace(v_title,
      '\{' || v_pair.key || '\}', v_pair.value, 'g');
    v_message := regexp_replace(v_message,
      '\{' || v_pair.key || '\}', v_pair.value, 'g');
  END LOOP;

  -- One persisted notifications row per channel. Toast is transient.
  FOREACH v_channel IN ARRAY v_template.channels
  LOOP
    IF v_channel <> 'toast' THEN
      INSERT INTO public.notifications (
        user_id, channel, type, title, message, data, is_read
      )
      VALUES (
        p_user_id, v_channel, v_template.type, v_title, v_message, v_data, false
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION
  public.fire_notification_template(uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.fire_notification_template(uuid, text, jsonb)
  TO service_role;

COMMENT ON FUNCTION
  public.fire_notification_template(uuid, text, jsonb)
IS
  'SQL-side template firing helper for SECURITY DEFINER RPCs that need to insert a notifications row atomically with their other writes. Mirrors gate order + channel handling + placeholder substitution of the TS insertFromTemplate helper. Returns count of persisted rows inserted. Silently returns 0 (rather than raising) on missing/disabled template — admins can mute templates without breaking the calling RPC. EXECUTE restricted to service_role.';

-- ----------------------------------------------------------------------------
-- Extended update_daily_activity
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
END;
$$;

-- The legacy version was SECURITY DEFINER with the same EXECUTE grants
-- Supabase applies by default (public + anon + authenticated). CREATE OR
-- REPLACE preserves those grants, which is correct here: this RPC is the
-- entry point called from the application's authenticated mutation paths
-- (e.g. `completeTestSession` server actions). Tightening to service_role
-- would be a behavioural change for the existing caller surface and is
-- handled in a later migration if/when we move all callers to the admin
-- client.

COMMENT ON FUNCTION
  public.update_daily_activity(uuid, uuid, integer, integer, integer, integer, integer)
IS
  'v1a-extended daily activity rollup. Upserts the per-(user, date, language) activity row, then updates the user''s day-streak with freeze auto-consume on gaps, bumps the cached lifetime_xp, awards 20 coins on first-time daily-goal completion (cross-language), unlocks day-streak milestone achievements via unlock_achievement (catalogue defines the slugs and rewards), updates PB day/week stamps and fires notifications when crossing them on a fresh day/week, and evaluates low-cost mystery achievements (comeback_kid). New branches silently no-op until migrations 8/9 seed the catalogue + templates, so this is safe to ship dark. Idempotent across multiple same-day calls.';
