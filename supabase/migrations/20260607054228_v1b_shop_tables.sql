-- ============================================================================
-- v1b Economy — Shop catalogue + purchase ledger
-- ============================================================================
--
-- First slice of the coin shop (see docs/GAMIFICATION_ANALYSIS.md §"Spending /
-- Rewards" and docs/V1A_GAMIFICATION_PLAN.md). v1b ships the Powers category
-- first; Stuff / Access / Status land later.
--
-- Two tables:
--   * shop_items     — admin-managed catalogue, mirrors the achievements table
--                      pattern (public read of active rows, writes via admin /
--                      service role only).
--   * user_purchases — append-only purchase ledger. Doubles as the inventory
--                      record for v1b (consumable Powers apply their effect to
--                      users.* on purchase; permanent cosmetics in v2 will read
--                      ownership from this table). Writes go exclusively through
--                      the purchase_shop_item RPC.
--
-- Coins themselves already exist: users.coin_balance cache + coin_transactions
-- ledger + award_coins() RPC (negative amount = spend). The purchase RPC
-- (next migration) debits through award_coins so the ledger stays the single
-- source of truth for the balance.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. shop_items — catalogue
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  category text NOT NULL
    CHECK (category IN ('powers', 'stuff', 'access', 'status')),
  title text NOT NULL,
  description text NOT NULL,
  icon text,                                  -- lucide icon name, resolved client-side
  cost_coins integer NOT NULL CHECK (cost_coins >= 0),
  -- What the purchase grants. The RPC branches on this to apply the effect.
  effect_type text NOT NULL
    CHECK (effect_type IN (
      'streak_freeze',          -- increments users.streak_freezes_available
      'streak_recover',         -- (catalogue only; recovery runs via /streak)
      'coin_multiplier',        -- time-windowed earn multiplier (engine TBD)
      'subscription_discount',  -- one-time Stripe coupon (TBD)
      'cosmetic'                -- permanent unlock (v2)
    )),
  -- Magnitude of the effect: freeze count granted, multiplier factor, percent
  -- off, etc. Interpreted per effect_type. Defaults to 1.
  effect_value integer NOT NULL DEFAULT 1,
  -- Forward-compat level gate. No level system exists yet, so the RPC treats
  -- 0 as "no gate" and does not enforce >0 until levels ship.
  required_level integer NOT NULL DEFAULT 0,
  -- Cap on lifetime owned quantity per user. NULL = unlimited (e.g. freezes);
  -- 1 = one-time unlock (cosmetics).
  max_owned integer CHECK (max_owned IS NULL OR max_owned > 0),
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_items_category_display_idx
  ON public.shop_items (category, display_order)
  WHERE is_active = true;

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

-- Public read of active items only (mirrors "public read enabled achievements").
DROP POLICY IF EXISTS "public read active shop items" ON public.shop_items;
CREATE POLICY "public read active shop items"
  ON public.shop_items FOR SELECT
  USING (is_active = true);
-- Admin writes only via service role.

COMMENT ON TABLE public.shop_items IS
  'Admin-managed coin shop catalogue. Public read of active rows; writes via service role. v1b seeds the Powers category.';

-- ----------------------------------------------------------------------------
-- 2. user_purchases — purchase ledger / inventory
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_item_id uuid NOT NULL REFERENCES public.shop_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  coins_spent integer NOT NULL CHECK (coins_spent >= 0),
  -- Links to the debit row created by award_coins for audit / refund.
  coin_transaction_id uuid REFERENCES public.coin_transactions(id),
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_purchases_user_created_idx
  ON public.user_purchases (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_purchases_user_item_idx
  ON public.user_purchases (user_id, shop_item_id);

ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own purchases" ON public.user_purchases;
CREATE POLICY "users read own purchases"
  ON public.user_purchases FOR SELECT
  USING (auth.uid() = user_id);
-- No client INSERT/UPDATE/DELETE — all writes via the purchase_shop_item RPC.

COMMENT ON TABLE public.user_purchases IS
  'Append-only coin-shop purchase ledger (also serves as v1b inventory). Written only by purchase_shop_item. Users read own rows.';
