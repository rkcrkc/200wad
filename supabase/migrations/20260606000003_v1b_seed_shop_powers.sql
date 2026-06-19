-- ============================================================================
-- v1b Economy — seed the Powers shop category
-- ============================================================================
--
-- Starting catalogue. All numbers are starting values; the admin dashboard
-- retunes them via the row columns (same model as the achievements seed).
--
-- Live now (effect wired in purchase_shop_item):
--   * streak_freeze         — 200 coins, +1 freeze
--   * streak_freeze_bundle  — 500 coins, +3 freezes (bulk discount)
--
-- Seeded inactive (catalogue scaffolding; subsystems not built yet, so they
-- stay is_active=false and are filtered out of the public read policy):
--   * coin_multiplier_2x / _3x — need the time-windowed multiplier engine.
--
-- Streak recovery is intentionally NOT a shop item: it runs from the /streak
-- page via recover_streak with a per-day dynamic cost. The shop links there.
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING so re-applying never stomps admin
-- retunes.
-- ============================================================================

INSERT INTO public.shop_items (
  slug, category, title, description, icon,
  cost_coins, effect_type, effect_value, required_level, max_owned,
  is_active, display_order
)
VALUES
  (
    'streak_freeze',
    'powers',
    'Streak Freeze',
    'Banks one freeze. A freeze auto-protects your day streak on a day you miss, so a single slip won''t reset it.',
    'Snowflake',
    200, 'streak_freeze', 1, 0, NULL,
    true, 1
  ),
  (
    'streak_freeze_bundle',
    'powers',
    'Streak Freeze 3-Pack',
    'Three freezes at a discount. Stock up so a busy week never costs you your streak.',
    'Snowflake',
    500, 'streak_freeze', 3, 0, NULL,
    true, 2
  ),
  (
    'coin_multiplier_2x',
    'powers',
    '2× Coin Boost',
    'Double the coins you earn from tests for one hour.',
    'Zap',
    300, 'coin_multiplier', 2, 0, NULL,
    false, 3
  ),
  (
    'coin_multiplier_3x',
    'powers',
    '3× Coin Boost',
    'Triple the coins you earn from tests for one hour.',
    'Zap',
    600, 'coin_multiplier', 3, 0, NULL,
    false, 4
  )
ON CONFLICT (slug) DO NOTHING;
