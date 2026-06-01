-- ============================================================================
-- v1a Gamification — `recover_streak` RPC + `streak.recovered` template
-- ============================================================================
--
-- Spending path for the `/streak` page's "Recover streak" button. The user
-- spends coins to back-fill freeze rows for a recent 1–3 day gap so that the
-- next legitimate `update_daily_activity` call sees a clean continuation
-- instead of a reset.
--
-- Cost model
-- ----------
-- 50 coins per missed day. Constant local to this function; tweak by editing
-- this migration body and re-applying. Round number that sits between the
-- daily-goal award (20) and the bronze streak achievement payouts.
--
-- Why coins-only (no freeze tokens consumed)
-- ------------------------------------------
-- v1a separates the two recovery models:
--   * Auto freeze (proactive, free, capped by `streak_freezes_available`) —
--     handled inside `update_daily_activity`.
--   * Manual coin recovery (reactive, paid, capped at 3 days) — this RPC.
-- Mixing them would require deciding precedence per gap-day and complicates
-- the UX. Keeping them disjoint means each surface has one knob.
--
-- Why the 3-day cap
-- -----------------
-- Lets a user rescue a long weekend / brief trip, but stops trivialising the
-- streak loop. Anything beyond 3 days should be a fresh start.
--
-- Atomicity / security
-- --------------------
-- SECURITY DEFINER, `SET search_path = public, pg_temp`. EXECUTE granted to
-- `authenticated` so it can be called directly from the server action via the
-- user's anon client (same surface as `update_daily_activity` and
-- `unlock_achievement`). Internal call to `award_coins` (service_role only)
-- works because both are SECURITY DEFINER running as postgres.
--
-- The `users` row is locked FOR UPDATE up-front so the validation snapshot
-- (gap, balance, streak) cannot drift between the checks and the writes.
--
-- Refusal semantics
-- -----------------
-- Validation failures raise (rather than returning a partial JSON) so the
-- server action surfaces them via the error path. The UI already gates the
-- button via `getStreakPageData().recover.eligible`, so a raised exception is
-- a "shouldn't happen — race condition or stale client" signal, not a normal
-- flow.
--
-- Idempotency
-- -----------
-- Re-running this migration is safe: CREATE OR REPLACE on the function;
-- ON CONFLICT (key) DO UPDATE on the template (so copy tweaks in a later
-- migration land cleanly without stomping admin edits when the description
-- changes).
--
-- Migration ordering
-- ------------------
-- Depends on migrations 1-9: users + user_daily_activity columns,
-- award_coins, fire_notification_template helper, notification_templates +
-- notification_types tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. streak.recovered notification template
-- ----------------------------------------------------------------------------
-- UPSERT so the seed migration (20260530000009) remains canonical and this
-- migration adds the new template without editing the seed in-place.

INSERT INTO public.notification_templates (
  key,
  label,
  description,
  type,
  enabled,
  title,
  message,
  channels,
  default_data,
  toast_title,
  toast_message
)
VALUES (
  'streak.recovered',
  'Streak recovered',
  'Fires from recover_streak when the user spends coins to back-fill freeze rows for a recent 1-3 day gap. {days_recovered} = number of days bridged, {coin_cost} = coins debited, {streak_length} = the preserved streak length.',
  'streak',
  true,
  'Streak recovered!',
  'Your {streak_length}-day streak is safe. We bridged {days_recovered} day(s) for {coin_cost} coins.',
  ARRAY['in_app','toast']::text[],
  '{"severity":"info"}'::jsonb,
  'Streak recovered!',
  'Bridged {days_recovered} day(s) for {coin_cost} coins.'
)
ON CONFLICT (key) DO UPDATE SET
  label         = EXCLUDED.label,
  description   = EXCLUDED.description,
  type          = EXCLUDED.type,
  enabled       = EXCLUDED.enabled,
  title         = EXCLUDED.title,
  message       = EXCLUDED.message,
  channels      = EXCLUDED.channels,
  default_data  = EXCLUDED.default_data,
  toast_title   = EXCLUDED.toast_title,
  toast_message = EXCLUDED.toast_message,
  updated_at    = now();

-- ----------------------------------------------------------------------------
-- 2. recover_streak RPC
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recover_streak(
  p_user_id uuid,
  p_days_missed integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today               date := CURRENT_DATE;
  v_user                RECORD;
  v_actual_days_missed  integer;
  v_cost                integer;
  v_language_id         uuid;
  v_freeze_date         date;
  v_transaction_id      uuid;
BEGIN
  -- ----- Validation: p_days_missed range ----------------------------------
  IF p_days_missed IS NULL OR p_days_missed < 1 OR p_days_missed > 3 THEN
    RAISE EXCEPTION
      'recover_streak: p_days_missed must be between 1 and 3 (got %)',
      p_days_missed
      USING ERRCODE = 'check_violation';
  END IF;

  v_cost := 50 * p_days_missed;

  -- ----- Lock + read user state -------------------------------------------
  SELECT
    last_activity_date,
    current_streak,
    coin_balance,
    current_language_id
  INTO v_user
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'recover_streak: user % not found', p_user_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- ----- Validation: there is something to recover -------------------------
  IF v_user.current_streak IS NULL OR v_user.current_streak < 1 THEN
    RAISE EXCEPTION
      'recover_streak: current_streak is zero, nothing to preserve'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_user.last_activity_date IS NULL THEN
    RAISE EXCEPTION
      'recover_streak: no last_activity_date on record'
      USING ERRCODE = 'check_violation';
  END IF;

  -- ----- Validation: server-side gap matches client claim ------------------
  v_actual_days_missed := (v_today - v_user.last_activity_date - 1)::integer;

  IF v_actual_days_missed <> p_days_missed THEN
    RAISE EXCEPTION
      'recover_streak: actual gap (%) does not match claimed days_missed (%)',
      v_actual_days_missed, p_days_missed
      USING ERRCODE = 'check_violation';
  END IF;

  -- ----- Validation: balance ---------------------------------------------
  IF v_user.coin_balance < v_cost THEN
    RAISE EXCEPTION
      'recover_streak: insufficient balance (have %, need %)',
      v_user.coin_balance, v_cost
      USING ERRCODE = 'check_violation';
  END IF;

  -- ----- Resolve a language_id for the frozen rows -----------------------
  -- Prefer users.current_language_id. Fall back to the language on the
  -- user's most recent user_daily_activity row. Frozen rows MUST carry a
  -- language_id (NOT NULL on the table), so refuse if neither is available.
  v_language_id := v_user.current_language_id;

  IF v_language_id IS NULL THEN
    SELECT language_id INTO v_language_id
    FROM public.user_daily_activity
    WHERE user_id = p_user_id
    ORDER BY activity_date DESC
    LIMIT 1;
  END IF;

  IF v_language_id IS NULL THEN
    RAISE EXCEPTION
      'recover_streak: no language_id available for freeze rows'
      USING ERRCODE = 'check_violation';
  END IF;

  -- ----- Write freeze rows for each missed day ----------------------------
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
      p_user_id, v_freeze_date, v_language_id,
      0, 0, 0, 0, 0, 0, true
    )
    ON CONFLICT (user_id, activity_date, language_id) DO UPDATE SET
      streak_frozen = true,
      updated_at    = now();
  END LOOP;

  -- ----- Advance last_activity_date so the next normal call continues ----
  UPDATE public.users
    SET last_activity_date = v_today - 1,
        updated_at         = now()
    WHERE id = p_user_id;

  -- ----- Debit the cost via award_coins (negative amount) ----------------
  v_transaction_id := public.award_coins(
    p_user_id,
    -v_cost,
    'streak_recover',
    'day_streak',
    NULL,
    'Streak recovery — bridged ' || p_days_missed || ' day(s)'
  );

  -- ----- Fire the notification template ----------------------------------
  PERFORM public.fire_notification_template(
    p_user_id,
    'streak.recovered',
    jsonb_build_object(
      'days_recovered', p_days_missed,
      'coin_cost',      v_cost,
      'streak_length',  v_user.current_streak
    )
  );

  RETURN jsonb_build_object(
    'recovered_days',       p_days_missed,
    'coin_cost',            v_cost,
    'coin_transaction_id',  v_transaction_id,
    'new_streak',           v_user.current_streak
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- Execution privileges
-- ----------------------------------------------------------------------------
-- Mirrors update_daily_activity / unlock_achievement: callable from the
-- application's authenticated mutation paths (server actions using the user's
-- anon-keyed Supabase client).

REVOKE EXECUTE ON FUNCTION
  public.recover_streak(uuid, integer)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.recover_streak(uuid, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION
  public.recover_streak(uuid, integer)
IS
  'Spend-coins-to-recover a 1-3 day streak gap. Validates gap matches claim, balance, and that current_streak > 0; writes streak_frozen rows for each missed day; advances last_activity_date to yesterday; debits 50*days coins via award_coins; fires streak.recovered template. Returns jsonb {recovered_days, coin_cost, coin_transaction_id, new_streak}. SECURITY DEFINER; EXECUTE granted to authenticated.';
