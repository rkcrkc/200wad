-- ============================================================================
-- v1b Economy — purchase_shop_item RPC + shop.purchase notification template
-- ============================================================================
--
-- The single spend path for the coin shop. Mirrors recover_streak:
-- SECURITY DEFINER, locks the users row up-front so the balance/cap snapshot
-- can't drift, debits through award_coins (negative amount), records a
-- user_purchases row, applies the item effect, and fires a notification.
--
-- Effect application (v1b)
-- ------------------------
--   * streak_freeze → users.streak_freezes_available += effect_value * qty
-- Other effect_types (coin_multiplier, subscription_discount, cosmetic) are
-- accepted in the catalogue but not yet wired here; their items ship inactive
-- until the supporting subsystems land, so they cannot reach this RPC.
--
-- Refusal semantics
-- -----------------
-- Validation failures RAISE (surfaced via the server action's error path).
-- The UI gates the buy button on balance, but a raised exception is the
-- race-condition / stale-client backstop.
--
-- Idempotency
-- -----------
-- CREATE OR REPLACE on the function; ON CONFLICT (key) DO UPDATE on the
-- template. Note: purchases themselves are NOT idempotent — each successful
-- call is a distinct ledgered purchase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. shop.purchase notification template
-- ----------------------------------------------------------------------------
-- Typed 'coins' (a purchase is a coin-spend event); notification_types has no
-- dedicated 'shop' type yet.

INSERT INTO public.notification_templates (
  key, label, description, type, enabled,
  title, message, channels, default_data, toast_title, toast_message
)
VALUES (
  'shop.purchase',
  'Shop purchase',
  'Fires from purchase_shop_item after a successful coin-shop purchase. {item_title} = purchased item, {coin_cost} = coins debited, {quantity} = units bought.',
  'coins',
  true,
  'Purchase complete',
  'You bought {item_title} for {coin_cost} coins.',
  ARRAY['in_app','toast']::text[],
  '{"severity":"info"}'::jsonb,
  'Purchase complete',
  'You bought {item_title} for {coin_cost} coins.'
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
-- 2. purchase_shop_item RPC
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purchase_shop_item(
  p_user_id uuid,
  p_item_id uuid,
  p_quantity integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item            RECORD;
  v_balance         integer;
  v_cost            integer;
  v_owned           integer;
  v_transaction_id  uuid;
  v_purchase_id     uuid;
BEGIN
  -- ----- Validation: quantity ---------------------------------------------
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'purchase_shop_item: quantity must be >= 1 (got %)', p_quantity
      USING ERRCODE = 'check_violation';
  END IF;

  -- ----- Load + gate the item ---------------------------------------------
  SELECT id, slug, title, cost_coins, effect_type, effect_value,
         max_owned, is_active
  INTO v_item
  FROM public.shop_items
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase_shop_item: item % not found', p_item_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF NOT v_item.is_active THEN
    RAISE EXCEPTION 'purchase_shop_item: item % is not purchasable', v_item.slug
      USING ERRCODE = 'check_violation';
  END IF;

  -- v1b only the streak_freeze effect is wired up. Refuse anything else even
  -- if an admin flips it active before its subsystem ships.
  IF v_item.effect_type <> 'streak_freeze' THEN
    RAISE EXCEPTION 'purchase_shop_item: effect_type % not yet purchasable', v_item.effect_type
      USING ERRCODE = 'feature_not_supported';
  END IF;

  v_cost := v_item.cost_coins * p_quantity;

  -- ----- Lock the user row (snapshot can't drift) -------------------------
  SELECT coin_balance INTO v_balance
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase_shop_item: user % not found', p_user_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- ----- Validation: max owned --------------------------------------------
  IF v_item.max_owned IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_owned
    FROM public.user_purchases
    WHERE user_id = p_user_id
      AND shop_item_id = p_item_id
      AND status = 'confirmed';

    IF v_owned + p_quantity > v_item.max_owned THEN
      RAISE EXCEPTION
        'purchase_shop_item: max owned (%) exceeded for %', v_item.max_owned, v_item.slug
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- ----- Validation: balance ----------------------------------------------
  IF v_balance < v_cost THEN
    RAISE EXCEPTION
      'purchase_shop_item: insufficient balance (have %, need %)', v_balance, v_cost
      USING ERRCODE = 'check_violation';
  END IF;

  -- ----- Debit via award_coins (negative amount) --------------------------
  v_transaction_id := public.award_coins(
    p_user_id,
    -v_cost,
    'shop_purchase',
    'shop_item',
    p_item_id,
    'Shop purchase — ' || v_item.title
      || CASE WHEN p_quantity > 1 THEN ' x' || p_quantity ELSE '' END
  );

  -- ----- Record the purchase ----------------------------------------------
  INSERT INTO public.user_purchases (
    user_id, shop_item_id, quantity, coins_spent, coin_transaction_id
  )
  VALUES (
    p_user_id, p_item_id, p_quantity, v_cost, v_transaction_id
  )
  RETURNING id INTO v_purchase_id;

  -- ----- Apply the effect -------------------------------------------------
  -- streak_freeze: top up the freeze counter the streak engine consumes.
  UPDATE public.users
    SET streak_freezes_available =
          streak_freezes_available + (v_item.effect_value * p_quantity),
        updated_at = now()
    WHERE id = p_user_id;

  -- ----- Notify -----------------------------------------------------------
  PERFORM public.fire_notification_template(
    p_user_id,
    'shop.purchase',
    jsonb_build_object(
      'item_title', v_item.title,
      'coin_cost',  v_cost,
      'quantity',   p_quantity
    )
  );

  RETURN jsonb_build_object(
    'purchase_id',         v_purchase_id,
    'coin_cost',           v_cost,
    'coin_transaction_id', v_transaction_id,
    'item_slug',           v_item.slug
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- Execution privileges (mirror recover_streak)
-- ----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION
  public.purchase_shop_item(uuid, uuid, integer)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.purchase_shop_item(uuid, uuid, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION
  public.purchase_shop_item(uuid, uuid, integer)
IS
  'Spend coins on a shop_items row. Validates active/cap/balance, debits cost*qty via award_coins, records a user_purchases row, applies the effect (v1b: streak_freeze tops up users.streak_freezes_available), fires shop.purchase. Returns jsonb {purchase_id, coin_cost, coin_transaction_id, item_slug}. SECURITY DEFINER; EXECUTE granted to authenticated.';
