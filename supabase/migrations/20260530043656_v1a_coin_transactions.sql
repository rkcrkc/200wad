-- ============================================================================
-- v1a Gamification — coin_transactions ledger
-- ============================================================================
--
-- Append-only ledger of every coin movement: earns, spends, refunds, and
-- adjustments. Mirrors the shape of `credit_transactions` (Stripe credit
-- ledger) so the two systems are structurally familiar but stay strictly
-- separate at runtime — coins are soft currency, credits are real money,
-- they never interconvert.
--
-- Source of truth for users.coin_balance: SUM(amount) WHERE status='confirmed'
-- and user_id = X. The `users.coin_balance` column is a cached aggregate
-- bumped by the `award_coins` SECURITY DEFINER RPC (migration 5) as a write-
-- side optimisation. A future cron / job can recompute the cache from this
-- ledger to detect drift.
--
-- Write protection
-- ----------------
-- RLS denies all client writes. Inserts happen exclusively from server-side
-- SECURITY DEFINER RPCs (`award_coins`, `spend_coins`). Users read their own
-- transactions for the /coins history UI.
--
-- Schema notes
-- ------------
--   * amount: signed integer. Positive = earn, negative = spend / reversal.
--             Stored as the post-multiplier value (i.e. the actual delta to
--             coin_balance). The pre-multiplier base lives in `description`
--             or — if we need to filter / aggregate on it later — gets
--             promoted to a column.
--   * type: free-text discriminator written by the RPC. v1a values include:
--             perfect_answer, lesson_mastered, course_mastered,
--             day_streak_milestone, week_streak_milestone, daily_goal,
--             achievement, manual_adjustment, shop_purchase, refund.
--           Kept as text (not enum) so admins can add new earn/spend sources
--           in future without a migration.
--   * status: 'confirmed' for the vast majority of rows. 'reversed' is set
--             on rows that were retracted (e.g. anti-cheat clawback,
--             accidental admin grant rolled back). Reversals are recorded as
--             a NEW row with opposite-sign amount AND the original row is
--             flipped to 'reversed' — this keeps the ledger append-only-ish
--             while still allowing the cached balance to exclude both sides
--             of a roundtrip.
--   * reference_type / reference_id: optional pointer to the entity that
--             produced this row. e.g. ('test_question', <uuid>) for a
--             perfect_answer, ('achievement', <uuid>) for an achievement
--             unlock, ('shop_purchase', <uuid>) for a spend. Indexed
--             partially for fast "show me coins from X" lookups.
--   * balance_after: snapshot of users.coin_balance immediately after this
--             row was applied. Pure denormalisation for the history UI so
--             we don't have to re-sum every row on render. Never used as a
--             source of truth.
--
-- Idempotency
-- -----------
-- `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` + `CREATE
-- POLICY` guarded by DO block so the migration is re-runnable.
-- ============================================================================

CREATE TABLE IF NOT EXISTS coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'reversed')),
  description text,
  reference_type text,
  reference_id uuid,
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

-- Primary access pattern: a user's transaction history newest-first.
CREATE INDEX IF NOT EXISTS coin_transactions_user_created_idx
  ON coin_transactions (user_id, created_at DESC);

-- Partial index for "show me the coin row tied to <entity>" lookups
-- (e.g. clicking an achievement row in history to jump to the unlock).
CREATE INDEX IF NOT EXISTS coin_transactions_reference_idx
  ON coin_transactions (reference_type, reference_id)
  WHERE reference_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------

ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions (for the /coins history UI).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coin_transactions'
      AND policyname = 'coin_transactions_select_own'
  ) THEN
    CREATE POLICY coin_transactions_select_own
      ON coin_transactions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- No INSERT/UPDATE/DELETE policies are created — writes are restricted to
-- SECURITY DEFINER RPCs (award_coins, spend_coins) which bypass RLS. The
-- anon/authenticated client cannot mutate this table directly.

-- ----------------------------------------------------------------------------
-- Table + column documentation
-- ----------------------------------------------------------------------------

COMMENT ON TABLE coin_transactions IS
  'Append-only ledger of all coin movements (earns, spends, refunds, reversals). Source of truth for users.coin_balance, which is a cached SUM(amount) WHERE status=''confirmed''. Writes are RPC-only via SECURITY DEFINER functions; users read their own rows. Mirrors credit_transactions shape but is structurally separate — coins (soft currency) never interconvert with credits (Stripe money).';

COMMENT ON COLUMN coin_transactions.amount IS
  'Signed coin delta. Positive = earn, negative = spend or reversal. Post-multiplier value (the actual change applied to coin_balance). Pre-multiplier base, if needed, is recorded in description.';

COMMENT ON COLUMN coin_transactions.type IS
  'Free-text discriminator naming the earn/spend source. v1a values: perfect_answer, lesson_mastered, course_mastered, day_streak_milestone, week_streak_milestone, daily_goal, achievement, manual_adjustment, shop_purchase, refund. Kept as text (not enum) so new sources can be added without a migration.';

COMMENT ON COLUMN coin_transactions.status IS
  'confirmed = row contributes to balance. reversed = retracted (anti-cheat clawback, admin rollback). Reversals are recorded as a NEW opposite-sign row AND the original row is flipped to reversed, so cached balance recompute excludes both sides.';

COMMENT ON COLUMN coin_transactions.description IS
  'Human-readable explanation shown in the history UI. e.g. "Perfect answer (3× streak multiplier)", "Mastered lesson #12", "Streak freeze (shop)".';

COMMENT ON COLUMN coin_transactions.reference_type IS
  'Optional category of the entity that produced this row. Paired with reference_id. v1a values: test_question, lesson, course, achievement, shop_purchase, day_streak, week_streak.';

COMMENT ON COLUMN coin_transactions.reference_id IS
  'Optional uuid of the entity that produced this row. Used for "show me the coin row tied to X" lookups via the partial index on (reference_type, reference_id).';

COMMENT ON COLUMN coin_transactions.balance_after IS
  'Cached snapshot of users.coin_balance immediately after this row was applied. Pure denormalisation for the history UI; not a source of truth. CHECK (>= 0) since balances cannot go negative — award_coins/spend_coins enforces this on the way in.';
