import { createClient } from "@/lib/supabase/server";

// ============================================================================
// TYPES
// ============================================================================

export type ShopCategory = "powers" | "stuff" | "access" | "status";

export interface ShopItemForList {
  id: string;
  slug: string;
  category: ShopCategory;
  title: string;
  description: string;
  /** Lucide icon name, resolved client-side. */
  icon: string | null;
  costCoins: number;
  effectType: string;
  effectValue: number;
  /** Lifetime cap per user. Null = unlimited. */
  maxOwned: number | null;
  displayOrder: number;
  /** Lifetime confirmed quantity the user already owns. */
  ownedCount: number;
  /** True when the user can't buy another (owned >= maxOwned). */
  atMaxOwned: boolean;
  /** True when the user's balance covers one unit at the listed price. */
  canAfford: boolean;
  /** Coins still needed to afford one unit (0 when affordable). */
  coinsShort: number;
}

export interface ShopData {
  coinBalance: number;
  items: ShopItemForList[];
}

// ============================================================================
// QUERY
// ============================================================================

interface ShopItemRow {
  id: string;
  slug: string;
  category: string;
  title: string;
  description: string;
  icon: string | null;
  cost_coins: number;
  effect_type: string;
  effect_value: number;
  max_owned: number | null;
  display_order: number;
}

/**
 * Fetch the active shop catalogue + the current user's coin balance and
 * per-item owned counts. RLS already filters to active rows for the public
 * read policy, so guests and authed users both see the same catalogue.
 *
 * Guest path: full catalogue, zero balance, nothing owned — every item shows
 * as unaffordable so the buy button gates correctly.
 *
 * Mirrors the bundling pattern in `getAchievementsForUser`.
 */
export async function getShopData(): Promise<ShopData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const itemsResult = await supabase
    .from("shop_items")
    .select(
      "id, slug, category, title, description, icon, cost_coins, effect_type, effect_value, max_owned, display_order"
    )
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("display_order", { ascending: true });

  const rows = (itemsResult.data ?? []) as ShopItemRow[];

  // Guest path: catalogue with zero balance, nothing owned.
  if (!user) {
    return {
      coinBalance: 0,
      items: rows.map((row) => toListItem(row, 0, 0)),
    };
  }

  const [userRowResult, purchasesResult] = await Promise.all([
    supabase
      .from("users")
      .select("coin_balance")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_purchases")
      .select("shop_item_id, quantity")
      .eq("user_id", user.id)
      .eq("status", "confirmed"),
  ]);

  const coinBalance = userRowResult.data?.coin_balance ?? 0;

  const ownedByItem = new Map<string, number>();
  for (const purchase of purchasesResult.data ?? []) {
    const prev = ownedByItem.get(purchase.shop_item_id) ?? 0;
    ownedByItem.set(purchase.shop_item_id, prev + (purchase.quantity ?? 0));
  }

  return {
    coinBalance,
    items: rows.map((row) =>
      toListItem(row, coinBalance, ownedByItem.get(row.id) ?? 0)
    ),
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function toListItem(
  row: ShopItemRow,
  coinBalance: number,
  ownedCount: number
): ShopItemForList {
  const atMaxOwned = row.max_owned !== null && ownedCount >= row.max_owned;

  return {
    id: row.id,
    slug: row.slug,
    category: row.category as ShopCategory,
    title: row.title,
    description: row.description,
    icon: row.icon,
    costCoins: row.cost_coins,
    effectType: row.effect_type,
    effectValue: row.effect_value,
    maxOwned: row.max_owned,
    displayOrder: row.display_order,
    ownedCount,
    atMaxOwned,
    canAfford: coinBalance >= row.cost_coins,
    coinsShort: Math.max(0, row.cost_coins - coinBalance),
  };
}
