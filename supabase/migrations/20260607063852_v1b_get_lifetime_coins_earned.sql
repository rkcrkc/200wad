-- ============================================================================
-- v1b — `get_lifetime_coins_earned` read RPC
-- ============================================================================
--
-- Returns the caller's lifetime GROSS coins earned: the sum of every positive
-- `coin_transactions` row (achievements, test answers, daily goal, streak
-- milestones, admin grants — all earning sources), independent of spending.
--
-- This backs the trophies page "Coins earned" stat, replacing the previous
-- client-side sum of unlocked achievements' catalogue `coin_reward` (which was
-- both trophy-only and recomputed from current catalogue values rather than
-- what was actually credited).
--
-- Security
-- --------
-- SECURITY DEFINER + pinned search_path. The function ignores any external
-- identifier and keys strictly off `auth.uid()`, so an authenticated caller
-- can only ever read their OWN total — the definer rights are safe because the
-- WHERE clause is not user-controllable. EXECUTE is granted to `authenticated`
-- only (revoked from PUBLIC + anon); guests never call it (the query layer
-- short-circuits to 0).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_lifetime_coins_earned()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(amount), 0)::bigint
  FROM public.coin_transactions
  WHERE user_id = auth.uid()
    AND amount > 0;
$$;

REVOKE EXECUTE ON FUNCTION public.get_lifetime_coins_earned() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lifetime_coins_earned() TO authenticated;

COMMENT ON FUNCTION public.get_lifetime_coins_earned()
IS
  'Returns the caller''s lifetime gross coins earned: COALESCE(SUM(amount),0) over coin_transactions where user_id = auth.uid() and amount > 0. SECURITY DEFINER but keyed strictly off auth.uid() so it can only read the caller''s own total. EXECUTE granted to authenticated only.';
