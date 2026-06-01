-- ============================================================================
-- v1a Gamification — split activity counts + freeze auto-apply toggle
-- ============================================================================
--
-- Two unrelated-but-bundled additions:
--
-- 1. Per-user `streak_freeze_auto` flag controlling whether
--    `update_daily_activity` may burn freeze tokens to bridge a gap.
--    Default true (preserves current behaviour). When false, missed
--    days that the user could afford to freeze still break the streak.
--    Future migrations will add a manual-freeze RPC that users invoke
--    explicitly to shield specific days; the toggle is the UX gate that
--    decides which path is active.
--
-- 2. Three new per-day counters on `user_daily_activity`:
--      * `lesson_sessions_count` — incremented by study-session completion.
--      * `test_sessions_count`   — incremented by test-session completion.
--      * `words_learned_count`   — words that transitioned to "learned"
--        (first ≥1 full-mark 3/3 test) during this date.
--    The existing `sessions_count` column stays for back-compat (sums the
--    two new columns). The new columns power the per-page heatmap tooltips
--    on `/progress` ("Words" — X learned, Y mastered) and `/streak`
--    ("Sessions" — X lesson, Y test).
--
-- This migration:
--   a) Adds the user column (default true, NOT NULL).
--   b) Adds the three activity columns (default 0, NOT NULL).
--   c) Backfills the three counters from `study_sessions`,
--      `test_sessions`, and `user_word_progress` respectively.
--   d) Replaces `update_daily_activity` so it:
--        - accepts `p_lesson_sessions`, `p_test_sessions`, `p_words_learned`
--        - increments the new counters in step 1's UPSERT
--        - sums them into `sessions_count` for compatibility
--        - gates the freeze auto-consume branch on
--          `users.streak_freeze_auto = true`
--   e) Adds a small `set_streak_freeze_auto(p_user_id, p_enabled)` helper
--      for the future settings/toggle UI to call (mirrors the existing
--      mutation patterns in `src/lib/mutations`).
--
-- The function signature change (extra parameters) requires DROP + CREATE
-- because Postgres can't REPLACE when the parameter list differs. The new
-- params have defaults so existing callers that still pass the original
-- 7 args remain valid until the code deploy lands.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (a) users.streak_freeze_auto
-- ----------------------------------------------------------------------------

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS streak_freeze_auto boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.users.streak_freeze_auto IS
  'When true (default), update_daily_activity may consume streak_freezes_available to bridge a gap. When false, missed days break the streak even if the user has tokens to spare. UX surfaces a toggle on /streak; future migrations add a manual-freeze RPC for the false path.';

-- ----------------------------------------------------------------------------
-- (b) user_daily_activity split counters
-- ----------------------------------------------------------------------------

ALTER TABLE public.user_daily_activity
  ADD COLUMN IF NOT EXISTS lesson_sessions_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS test_sessions_count   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS words_learned_count   integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_daily_activity.lesson_sessions_count IS
  'Number of study-mode sessions completed on this date for this language. Written by update_daily_activity from the p_lesson_sessions param. Sum across all the day''s rows is what the /streak Sessions heatmap tooltips display.';
COMMENT ON COLUMN public.user_daily_activity.test_sessions_count IS
  'Number of test-mode sessions completed on this date for this language. Written by update_daily_activity from the p_test_sessions param.';
COMMENT ON COLUMN public.user_daily_activity.words_learned_count IS
  'Number of words that first reached the "learned" status (≥1 full-mark 3/3 test) on this date in this language. Written by update_daily_activity from the p_words_learned param. Powers the /progress Words heatmap tooltip alongside words_mastered.';

-- ----------------------------------------------------------------------------
-- (c) Backfill historical counts
-- ----------------------------------------------------------------------------

-- (c.1) Lesson sessions. Group study_sessions by (user, date(started_at),
--       language via course). Upsert into user_daily_activity, overwriting
--       lesson_sessions_count (the backfill is the authoritative source for
--       the historical column).
WITH ls AS (
  SELECT
    ss.user_id,
    (ss.started_at AT TIME ZONE 'UTC')::date AS activity_date,
    c.language_id,
    COUNT(*) AS n
  FROM public.study_sessions ss
  JOIN public.courses c ON c.id = ss.course_id
  WHERE ss.user_id IS NOT NULL
    AND ss.started_at IS NOT NULL
    AND ss.course_id IS NOT NULL
    AND c.language_id IS NOT NULL
  GROUP BY ss.user_id, (ss.started_at AT TIME ZONE 'UTC')::date, c.language_id
)
INSERT INTO public.user_daily_activity (
  user_id, activity_date, language_id, lesson_sessions_count
)
SELECT user_id, activity_date, language_id, n
FROM ls
ON CONFLICT (user_id, activity_date, language_id) DO UPDATE
  SET lesson_sessions_count = EXCLUDED.lesson_sessions_count,
      updated_at            = now();

-- (c.2) Test sessions. Same shape, sourced from test_sessions.
WITH ts AS (
  SELECT
    t.user_id,
    (t.taken_at AT TIME ZONE 'UTC')::date AS activity_date,
    c.language_id,
    COUNT(*) AS n
  FROM public.test_sessions t
  JOIN public.courses c ON c.id = t.course_id
  WHERE t.user_id IS NOT NULL
    AND t.taken_at IS NOT NULL
    AND t.course_id IS NOT NULL
    AND c.language_id IS NOT NULL
  GROUP BY t.user_id, (t.taken_at AT TIME ZONE 'UTC')::date, c.language_id
)
INSERT INTO public.user_daily_activity (
  user_id, activity_date, language_id, test_sessions_count
)
SELECT user_id, activity_date, language_id, n
FROM ts
ON CONFLICT (user_id, activity_date, language_id) DO UPDATE
  SET test_sessions_count = EXCLUDED.test_sessions_count,
      updated_at          = now();

-- (c.3) Words learned. user_word_progress carries `learned_at` set on the
--       first ≥1 full-mark 3/3 test for the word. Group by (user,
--       date(learned_at), word→lesson_words→lessons→course→language_id).
--       A word that appears in multiple lessons across multiple languages
--       counts once per language it's exposed in — that mirrors how the
--       live RPC will write it (the test session is scoped to one language
--       at a time, so per-language attribution is unambiguous going forward).
WITH learned AS (
  SELECT DISTINCT
    uwp.user_id,
    (uwp.learned_at AT TIME ZONE 'UTC')::date AS activity_date,
    c.language_id,
    uwp.word_id
  FROM public.user_word_progress uwp
  JOIN public.lesson_words lw ON lw.word_id = uwp.word_id
  JOIN public.lessons l       ON l.id = lw.lesson_id
  JOIN public.courses c       ON c.id = l.course_id
  WHERE uwp.learned_at IS NOT NULL
    AND c.language_id IS NOT NULL
),
agg AS (
  SELECT user_id, activity_date, language_id, COUNT(*) AS n
  FROM learned
  GROUP BY user_id, activity_date, language_id
)
INSERT INTO public.user_daily_activity (
  user_id, activity_date, language_id, words_learned_count
)
SELECT user_id, activity_date, language_id, n
FROM agg
ON CONFLICT (user_id, activity_date, language_id) DO UPDATE
  SET words_learned_count = EXCLUDED.words_learned_count,
      updated_at          = now();

-- ----------------------------------------------------------------------------
-- (d) Extended update_daily_activity
-- ----------------------------------------------------------------------------

-- Function signature is changing (3 new params). DROP first because
-- CREATE OR REPLACE can't change the parameter list.
DROP FUNCTION IF EXISTS public.update_daily_activity(uuid, uuid, integer, integer, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.update_daily_activity(
  p_user_id uuid,
  p_language_id uuid,
  p_words_studied integer DEFAULT 0,
  p_words_mastered integer DEFAULT 0,
  p_test_points_earned integer DEFAULT 0,
  p_test_max_points integer DEFAULT 0,
  p_study_time_seconds integer DEFAULT 0,
  p_lesson_sessions integer DEFAULT 0,
  p_test_sessions integer DEFAULT 0,
  p_words_learned integer DEFAULT 0
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
  v_sessions_delta     integer := GREATEST(p_lesson_sessions, 0)
                                + GREATEST(p_test_sessions, 0);
BEGIN
  -- Backward-compat: callers that pass none of the new session counters fall
  -- back to the legacy "every call counts as one session" behaviour so we
  -- don't lose the row on otherwise-zero metric calls (e.g. study sessions
  -- pre-deploy that haven't started passing p_lesson_sessions yet).
  IF v_sessions_delta = 0 THEN
    v_sessions_delta := 1;
  END IF;

  -- ------------------------------------------------------------------------
  -- 1. Upsert today's per-language activity row
  -- ------------------------------------------------------------------------

  INSERT INTO public.user_daily_activity (
    user_id, activity_date, language_id,
    words_studied, words_mastered, words_learned_count,
    test_points_earned, test_max_points,
    study_time_seconds,
    sessions_count, lesson_sessions_count, test_sessions_count
  )
  VALUES (
    p_user_id, v_today, p_language_id,
    p_words_studied, p_words_mastered, GREATEST(p_words_learned, 0),
    p_test_points_earned, p_test_max_points,
    p_study_time_seconds,
    v_sessions_delta,
    GREATEST(p_lesson_sessions, 0),
    GREATEST(p_test_sessions, 0)
  )
  ON CONFLICT (user_id, activity_date, language_id) DO UPDATE SET
    words_studied         = public.user_daily_activity.words_studied         + EXCLUDED.words_studied,
    words_mastered        = public.user_daily_activity.words_mastered        + EXCLUDED.words_mastered,
    words_learned_count   = public.user_daily_activity.words_learned_count   + EXCLUDED.words_learned_count,
    test_points_earned    = public.user_daily_activity.test_points_earned    + EXCLUDED.test_points_earned,
    test_max_points       = public.user_daily_activity.test_max_points       + EXCLUDED.test_max_points,
    study_time_seconds    = public.user_daily_activity.study_time_seconds    + EXCLUDED.study_time_seconds,
    sessions_count        = public.user_daily_activity.sessions_count        + EXCLUDED.sessions_count,
    lesson_sessions_count = public.user_daily_activity.lesson_sessions_count + EXCLUDED.lesson_sessions_count,
    test_sessions_count   = public.user_daily_activity.test_sessions_count   + EXCLUDED.test_sessions_count,
    updated_at            = now();

  -- ------------------------------------------------------------------------
  -- 2. Lock + read user state (single read serves steps 3-7)
  -- ------------------------------------------------------------------------

  SELECT
    last_activity_date,
    current_streak,
    longest_streak,
    streak_freezes_available,
    streak_freeze_auto,
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
  -- 3. Streak update (with freeze auto-consume on gap, gated by toggle)
  -- ------------------------------------------------------------------------

  IF v_user.last_activity_date = v_today THEN
    NULL;

  ELSIF v_user.last_activity_date = v_yesterday THEN
    UPDATE public.users SET
      current_streak     = COALESCE(current_streak, 0) + 1,
      longest_streak     = GREATEST(COALESCE(longest_streak, 0),
                                    COALESCE(current_streak, 0) + 1),
      last_activity_date = v_today,
      updated_at         = now()
    WHERE id = p_user_id;

  ELSE
    v_gap_days := CASE
      WHEN v_user.last_activity_date IS NULL THEN 0
      ELSE (v_today - v_user.last_activity_date - 1)::integer
    END;

    IF v_gap_days > 0
       AND COALESCE(v_user.streak_freeze_auto, true) = true
       AND v_gap_days <= COALESCE(v_user.streak_freezes_available, 0) THEN
      FOR v_freeze_date IN
        SELECT generate_series(
          v_user.last_activity_date + 1,
          v_today - 1,
          '1 day'::interval
        )::date
      LOOP
        INSERT INTO public.user_daily_activity (
          user_id, activity_date, language_id,
          words_studied, words_mastered, words_learned_count,
          test_points_earned, test_max_points,
          study_time_seconds,
          sessions_count, lesson_sessions_count, test_sessions_count,
          streak_frozen
        )
        VALUES (
          p_user_id, v_freeze_date, p_language_id,
          0, 0, 0, 0, 0, 0, 0, 0, 0, true
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
      -- Gap not coverable, or freeze-auto disabled, or no freezes.
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
  -- 6. Day-streak milestone
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
      PERFORM public.unlock_achievement(p_user_id, v_milestone_slug);
    END IF;
  END IF;

  -- ------------------------------------------------------------------------
  -- 7. PB comparison (day + ISO-week)
  -- ------------------------------------------------------------------------

  IF v_today_total_xp > 0
     AND v_today_total_xp > COALESCE(v_user.pb_day_test_points, 0)
  THEN
    UPDATE public.users SET
      pb_day_test_points    = v_today_total_xp,
      pb_day_test_points_at = v_today
    WHERE id = p_user_id;

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
  public.update_daily_activity(uuid, uuid, integer, integer, integer, integer, integer, integer, integer, integer)
IS
  'v1a-extended daily activity rollup. Accepts split lesson/test session counters and a per-call words-learned delta in addition to the legacy seven params. Auto-freeze on streak gaps is now gated on users.streak_freeze_auto. All other behaviour (XP cache, daily-goal coin award, streak milestones, PB tracking, comeback_kid) is preserved. Backward compatible: callers that omit p_lesson_sessions/p_test_sessions still get one session counted toward sessions_count (legacy behaviour) until they''re updated.';

-- ----------------------------------------------------------------------------
-- (e) set_streak_freeze_auto helper
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_streak_freeze_auto(
  p_user_id uuid,
  p_enabled boolean
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.users
    SET streak_freeze_auto = COALESCE(p_enabled, true),
        updated_at         = now()
  WHERE id = p_user_id
  RETURNING streak_freeze_auto;
$$;

REVOKE EXECUTE ON FUNCTION public.set_streak_freeze_auto(uuid, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_streak_freeze_auto(uuid, boolean)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.set_streak_freeze_auto(uuid, boolean) IS
  'Flip users.streak_freeze_auto for a single user. EXECUTE granted to authenticated so a server action can call it on behalf of the signed-in user (RLS on users blocks cross-user writes from the client-side anon role, but the RPC runs as definer; the server action checks auth.getUser() and passes user.id only).';
