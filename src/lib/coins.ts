import {
  Coins,
  Trophy,
  Flame,
  Target,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { Podium } from "@/components/ui/podium-icon";

// ============================================================================
// TYPES
// ============================================================================
//
// Client-safe coin types + pure presentation helpers. Kept free of any
// server-only imports (e.g. the Supabase server client / next/headers) so
// client components can import the types and `coinTypeVisual`/`coinTypeLabel`
// without dragging server code into the browser bundle. The server query
// (`getCoinHistory`) lives in `src/lib/queries/coins.ts` and re-uses these.

export interface CoinHistoryEntry {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
  type: string;
  /** Snapshot of the coin balance immediately after this row — the running total. */
  balanceAfter: number;
}

export interface CoinHistoryPage {
  entries: CoinHistoryEntry[];
  hasMore: boolean;
}

export interface CoinTotals {
  /** Lifetime gross coins earned (sum of positive ledger rows). */
  earned: number;
  /** Lifetime coins spent, as a positive magnitude. */
  spent: number;
  /** Net balance (= earned − spent), mirrors users.coin_balance. */
  net: number;
}

export interface CoinTransactionRow {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
  balance_after: number;
}

// ============================================================================
// HELPERS
// ============================================================================

export function mapEntry(row: CoinTransactionRow): CoinHistoryEntry {
  return {
    id: row.id,
    amount: row.amount,
    description: formatDescription(row.type, row.description),
    createdAt: row.created_at,
    type: row.type,
    balanceAfter: row.balance_after,
  };
}

/**
 * Resolve the row's display text. Achievement rows are stored as
 * "Achievement unlocked: {title}"; strip the prefix so the history shows just
 * the trophy name (the icon already conveys it's an achievement). Falls back to
 * the friendly type label when there's no stored description.
 */
function formatDescription(type: string, description: string | null): string {
  const text = description?.trim();
  if (!text) return coinTypeLabel(type);
  if (type === "achievement") {
    return text.replace(/^Achievement unlocked:\s*/i, "");
  }
  return text;
}

/**
 * Icon shown in a history row's circle, keyed off the transaction type. The
 * circle's colour (earn green / spend red) is derived from the amount sign at
 * render time, not from the type.
 */
export function coinTypeIcon(type: string): LucideIcon {
  switch (type) {
    case "perfect_answer":
    case "lesson_mastered":
    case "course_mastered":
    case "achievement":
      return Trophy;
    case "leaderboard":
      return Podium;
    case "day_streak_milestone":
    case "week_streak_milestone":
      return Flame;
    case "daily_goal":
      return Target;
    case "shop_purchase":
      return ShoppingBag;
    case "refund":
    case "manual_adjustment":
    default:
      return Coins;
  }
}

/**
 * Friendly fallback label for a transaction type, used when the row has no
 * stored description.
 */
export function coinTypeLabel(type: string): string {
  switch (type) {
    case "perfect_answer":
      return "Perfect answer";
    case "lesson_mastered":
      return "Lesson mastered";
    case "course_mastered":
      return "Course mastered";
    case "day_streak_milestone":
      return "Day streak milestone";
    case "week_streak_milestone":
      return "Week streak milestone";
    case "daily_goal":
      return "Daily goal";
    case "achievement":
      return "Achievement unlocked";
    case "leaderboard":
      return "Leaderboard reward";
    case "shop_purchase":
      return "Shop purchase";
    case "refund":
      return "Refund";
    case "manual_adjustment":
      return "Adjustment";
    default:
      return "Coin transaction";
  }
}
