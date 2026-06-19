-- ============================================================================
-- v1b — backfill coins for already-unlocked achievements
-- ============================================================================
--
-- Why
-- ---
-- The v1a `user_achievements` backfill (migration 20260530000012) deliberately
-- recorded historical unlocks WITHOUT crediting coins ("forward-only"), and the
-- runtime trophy path never called `unlock_achievement` at all. The net result
-- is users whose trophy page shows coins earned (e.g. 60) while their actual
-- wallet (`users.coin_balance`) reads 0.
--
-- This migration reconciles the two by paying out every reward-bearing unlock
-- that was never tied to a coin transaction. Each payout goes through
-- `award_coins`, so it lands in the `coin_transactions` ledger (the
-- earned-vs-spent record) and bumps the cached `users.coin_balance` exactly
-- like a live unlock would, then links the new transaction id back onto the
-- `user_achievements` row for audit closure.
--
-- Scope / idempotency
-- -------------------
-- Only rows with `achievement.coin_reward > 0` AND `coin_transaction_id IS NULL`
-- are processed. The NULL guard makes re-running this migration a clean no-op
-- and prevents double-paying rows that the new RPC path has since credited.
-- Rows are processed oldest-unlock-first so each ledger row's `balance_after`
-- reflects a sensible chronological accrual.
-- ============================================================================

DO $$
DECLARE
  r        RECORD;
  v_tx_id  uuid;
  v_count  integer := 0;
  v_coins  bigint  := 0;
BEGIN
  FOR r IN
    SELECT
      ua.id          AS user_achievement_id,
      ua.user_id     AS user_id,
      a.id           AS achievement_id,
      a.coin_reward  AS coin_reward,
      a.title        AS title
    FROM public.user_achievements ua
    JOIN public.achievements a ON a.id = ua.achievement_id
    WHERE a.coin_reward > 0
      AND ua.coin_transaction_id IS NULL
    ORDER BY ua.unlocked_at, ua.id
  LOOP
    v_tx_id := public.award_coins(
      r.user_id,
      r.coin_reward,
      'achievement',
      'achievement',
      r.achievement_id,
      format('Achievement unlocked: %s', r.title)
    );

    UPDATE public.user_achievements
      SET coin_transaction_id = v_tx_id
      WHERE id = r.user_achievement_id;

    v_count := v_count + 1;
    v_coins := v_coins + r.coin_reward;
  END LOOP;

  RAISE NOTICE
    'v1b backfill_achievement_coins: credited % coins across % unlock rows',
    v_coins, v_count;
END$$;
