import { createClient } from "@/lib/supabase/server";
import {
  mapEntry,
  type CoinHistoryPage,
  type CoinTotals,
  type CoinTransactionRow,
} from "@/lib/coins";

// Re-export the client-safe types/helpers so server callers can keep importing
// from a single place. The pure definitions live in `@/lib/coins` so client
// components can use them without pulling in server-only code.
export type {
  CoinHistoryEntry,
  CoinHistoryPage,
  CoinTotals,
} from "@/lib/coins";
export { coinTypeIcon, coinTypeLabel } from "@/lib/coins";

// ============================================================================
// QUERY
// ============================================================================

/**
 * Fetch a page of the current user's confirmed coin ledger, newest first.
 *
 * Source of truth is the full `coin_transactions` ledger (status = 'confirmed').
 * Uses the `coin_transactions_user_created_idx` (user_id, created_at DESC) index.
 *
 * Fetches `limit + 1` rows to detect whether more pages exist without a
 * separate count query, then slices back to `limit`.
 *
 * Guest path: no user → empty page so the History tab shows its empty state.
 */
export async function getCoinHistory(
  limit = 50,
  offset = 0
): Promise<CoinHistoryPage> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { entries: [], hasMore: false };
  }

  const result = await supabase
    .from("coin_transactions")
    .select("id, amount, type, description, created_at, balance_after")
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  const rows = (result.data ?? []) as CoinTransactionRow[];
  const hasMore = rows.length > limit;

  return {
    entries: rows.slice(0, limit).map(mapEntry),
    hasMore,
  };
}

/**
 * All-time earned / spent / net totals for the floating total bar.
 *
 * `earned` is the lifetime gross (sum of positive rows) via the
 * `get_lifetime_coins_earned` RPC; `net` is the cached `coin_balance`
 * (= SUM of all confirmed rows); `spent` is the difference, so the three
 * figures always reconcile (earned − spent = net).
 *
 * Guest path: no user → all zeroes.
 */
export async function getCoinTotals(): Promise<CoinTotals> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { earned: 0, spent: 0, net: 0 };
  }

  const [earnedResult, userRowResult] = await Promise.all([
    supabase.rpc("get_lifetime_coins_earned"),
    supabase.from("users").select("coin_balance").eq("id", user.id).maybeSingle(),
  ]);

  const earned = Number(earnedResult.data ?? 0);
  const net = userRowResult.data?.coin_balance ?? 0;
  const spent = Math.max(0, earned - net);

  return { earned, spent, net };
}
