"use server";

import { getCoinHistory, type CoinHistoryPage } from "@/lib/queries/coins";

/**
 * Page back through the coin history. Thin wrapper over `getCoinHistory` so the
 * client can request older rows; the query stays the single source of truth.
 */
export async function loadMoreCoinHistoryAction(
  offset: number
): Promise<CoinHistoryPage> {
  return getCoinHistory(50, offset);
}
