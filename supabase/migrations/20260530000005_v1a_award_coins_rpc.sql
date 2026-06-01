-- ============================================================================
-- v1a Gamification — `award_coins` RPC
-- ============================================================================
--
-- Single source of truth for every coin movement: inserts an audit row into
-- `coin_transactions` and atomically bumps the cached `users.coin_balance`.
-- All earning paths (test answers, lesson/course mastery, achievements, daily
-- goal, streak milestones, admin grants) and — in v1b — every spending path
-- go through this function. Application code never writes the ledger or the
-- balance column directly.
--
-- Returns
-- -------
-- The new `coin_transactions.id` (uuid). Callers store this on the entity
-- that triggered the award when there's a back-reference column (e.g.
-- `user_achievements.coin_transaction_id`) for audit trail closure.
--
-- Atomicity
-- ---------
-- A PL/pgSQL function executes inside the caller's transaction, so the
-- `SELECT … FOR UPDATE` on `users`, the `INSERT` on `coin_transactions`, and
-- the `UPDATE` on `users.coin_balance` are committed together or not at all.
-- The row lock serialises concurrent awards on the same user so two parallel
-- calls cannot read the same `balance_after` snapshot.
--
-- Validation
-- ----------
--   * amount = 0 → rejected (no-op rows pollute the ledger).
--   * type IS NULL / empty → rejected (every row must be classified).
--   * user not found → rejected with FK-violation error code.
--   * new balance < 0 → rejected with check-violation error code. The
--     `coin_transactions.balance_after CHECK (>= 0)` would catch this at the
--     storage layer, but raising explicitly here gives callers a friendlier
--     SQLSTATE + message and avoids tripping the CHECK with a partially-
--     constructed transaction.
--
-- Sign convention
-- ---------------
-- amount > 0 = earn, amount < 0 = spend. v1a only emits positive amounts via
-- the call sites in `complete_test_session`, `update_daily_activity`, and
-- `unlock_achievement`. Negative-amount support is implemented now so v1b
-- shop spend paths layer in without re-plumbing.
--
-- Reversal semantics (NOT implemented here)
-- -----------------------------------------
-- "Reversing" an existing row (anti-cheat clawback, admin rollback) is a
-- distinct two-step operation: emit a NEW opposite-sign row via this RPC AND
-- flip the original's `status` to 'reversed'. That two-step lives in a
-- future `reverse_coin_transaction` RPC, not here, because it must be the
-- only path that mutates an existing ledger row.
--
-- Idempotency
-- -----------
-- Award idempotency is the CALLER's responsibility. This RPC does not
-- de-duplicate on `(user_id, reference_type, reference_id)`. Legitimate
-- same-reference repeats exist (e.g. multiple perfect answers in a session
-- all reference `test_session`/<session_id>), so a uniqueness constraint
-- would be wrong here. Callers protect themselves with their own gates
-- (e.g. `user_achievements UNIQUE`, `user_lesson_progress` state checks).
--
-- Security
-- --------
-- SECURITY DEFINER + `SET search_path = public, pg_temp` so unprivileged
-- search-path tricks cannot redirect calls inside the function. EXECUTE is
-- revoked from PUBLIC and granted only to `service_role` — meaning:
--   * Anon / authenticated clients cannot call this directly via PostgREST.
--   * Server-side code using the service-role key (admin routes, webhooks)
--     can call it.
--   * Other SECURITY DEFINER functions (unlock_achievement,
--     update_daily_activity, etc.) call it under their own definer role
--     (postgres), which has implicit privileges — the GRANT is not the
--     gate for those callers.
--
-- Type allowlist
-- --------------
-- Kept in application code (an exported const), not a CHECK constraint, so
-- new earn/spend sources can be added without a schema migration. Documented
-- on `coin_transactions.type` for discoverability.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_coins(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_balance integer;
  v_new_balance integer;
  v_transaction_id uuid;
BEGIN
  -- ----- Input validation -------------------------------------------------

  IF p_amount = 0 THEN
    RAISE EXCEPTION 'award_coins: amount must be non-zero'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_type IS NULL OR length(btrim(p_type)) = 0 THEN
    RAISE EXCEPTION 'award_coins: type is required'
      USING ERRCODE = 'check_violation';
  END IF;

  -- ----- Lock + read current balance --------------------------------------
  -- FOR UPDATE serialises concurrent awards on the same user so two parallel
  -- calls cannot both read the same pre-image and write the same balance_after.

  SELECT coin_balance INTO v_current_balance
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'award_coins: user % not found', p_user_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  v_new_balance := v_current_balance + p_amount;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION
      'award_coins: insufficient balance (current=%, delta=%)',
      v_current_balance, p_amount
      USING ERRCODE = 'check_violation';
  END IF;

  -- ----- Write ledger row -------------------------------------------------

  INSERT INTO public.coin_transactions (
    user_id,
    amount,
    type,
    description,
    reference_type,
    reference_id,
    balance_after
  )
  VALUES (
    p_user_id,
    p_amount,
    p_type,
    p_description,
    p_reference_type,
    p_reference_id,
    v_new_balance
  )
  RETURNING id INTO v_transaction_id;

  -- ----- Update cached balance -------------------------------------------

  UPDATE public.users
    SET coin_balance = v_new_balance
    WHERE id = p_user_id;

  RETURN v_transaction_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- Execution privileges
-- ----------------------------------------------------------------------------
-- Supabase grants EXECUTE on every new function in `public` to PUBLIC, anon,
-- and authenticated via default privileges. Strip all three explicitly and
-- grant only to service_role so anon/authenticated clients cannot call this
-- RPC via PostgREST. Other SECURITY DEFINER functions that call this one run
-- as postgres (their definer role), which has implicit privileges — the
-- GRANT here is not the gate for those callers.

REVOKE EXECUTE ON FUNCTION
  public.award_coins(uuid, integer, text, text, uuid, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.award_coins(uuid, integer, text, text, uuid, text)
  TO service_role;

-- ----------------------------------------------------------------------------
-- Documentation
-- ----------------------------------------------------------------------------

COMMENT ON FUNCTION
  public.award_coins(uuid, integer, text, text, uuid, text)
IS
  'Atomic coin award: inserts a coin_transactions row with computed balance_after and bumps users.coin_balance. Single source of truth for all coin movements. Signed amount (positive=earn, negative=spend; v1a always positive). Locks users row FOR UPDATE to serialise concurrent calls. Returns coin_transactions.id. Idempotency is the caller''s responsibility — no de-duplication on (reference_type, reference_id). SECURITY DEFINER; EXECUTE restricted to service_role.';
