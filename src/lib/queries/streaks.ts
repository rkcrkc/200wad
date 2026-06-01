import { createClient } from "@/lib/supabase/server";
import type { HeatmapDay } from "./stats";

// ============================================================================
// TYPES
// ============================================================================

/** Recover-streak cost model: must mirror the SQL constant in the RPC. */
const RECOVER_COIN_COST_PER_DAY = 50;
/** Maximum gap (in days) eligible for coin-recovery, mirrors the RPC clamp. */
const RECOVER_MAX_DAYS = 3;

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  freezesAvailable: number;
  /** When true, freezes auto-consume on the next gap; user can disable. */
  freezeAuto: boolean;
  coinBalance: number;
}

export interface StreakRecoverState {
  /** True when the user can act on the recover banner (regardless of balance). */
  eligible: boolean;
  /** Days the user has missed (1-3 when eligible, 0 otherwise). */
  daysMissed: number;
  /** Cost in coins to recover (50 × daysMissed when eligible, 0 otherwise). */
  coinCost: number;
  /** Whether the user has enough coins to recover right now. */
  canAfford: boolean;
  /** The streak length that would be preserved by recovery. */
  streakAtRisk: number;
}

export interface StreakPageData {
  summary: StreakSummary;
  recover: StreakRecoverState;
  /** Full heatmap range (earliest activity → today), collapsed across languages. */
  heatmap: HeatmapDay[];
}

// ============================================================================
// QUERY
// ============================================================================

const ZERO_DATA: StreakPageData = {
  summary: {
    currentStreak: 0,
    longestStreak: 0,
    freezesAvailable: 0,
    freezeAuto: true,
    coinBalance: 0,
  },
  recover: {
    eligible: false,
    daysMissed: 0,
    coinCost: 0,
    canAfford: false,
    streakAtRisk: 0,
  },
  heatmap: [],
};

/**
 * Server query for the `/streak` page. Returns the summary stats, the
 * recover-banner eligibility snapshot, and the full activity heatmap
 * (collapsed across languages).
 *
 * Guest path returns a zero state — header shows zeros, recover banner is
 * hidden, heatmap is empty.
 */
export async function getStreakPageData(): Promise<StreakPageData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return ZERO_DATA;
  }

  const [userRowResult, activityResult] = await Promise.all([
    supabase
      .from("users")
      .select(
        "current_streak, longest_streak, streak_freezes_available, streak_freeze_auto, coin_balance, last_activity_date"
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_daily_activity")
      .select(
        "activity_date, lesson_sessions_count, test_sessions_count, streak_frozen"
      )
      .eq("user_id", user.id)
      .order("activity_date", { ascending: true }),
  ]);

  const userRow = userRowResult.data;
  const activityRows = activityResult.data ?? [];

  const summary: StreakSummary = {
    currentStreak: userRow?.current_streak ?? 0,
    longestStreak: userRow?.longest_streak ?? 0,
    freezesAvailable: userRow?.streak_freezes_available ?? 0,
    freezeAuto: userRow?.streak_freeze_auto ?? true,
    coinBalance: userRow?.coin_balance ?? 0,
  };

  // ----- Recover-streak eligibility snapshot ------------------------------
  // The RPC re-validates server-side, so this is purely a UX gate.
  const recover = computeRecoverState({
    lastActivityDate: userRow?.last_activity_date ?? null,
    currentStreak: summary.currentStreak,
    coinBalance: summary.coinBalance,
  });

  // ----- Heatmap (collapse across languages) ------------------------------
  // Per-date aggregate. Intensity = total sessions (lesson + test). Frozen
  // iff EVERY row for the date is streak_frozen — a real-activity row on the
  // same date as a frozen row (cross-language) cancels the frozen flag.
  type Agg = {
    lessonSessions: number;
    testSessions: number;
    frozenAll: boolean;
    anyRow: boolean;
  };
  const byDate = new Map<string, Agg>();

  for (const row of activityRows) {
    const date = row.activity_date;
    const existing = byDate.get(date) ?? {
      lessonSessions: 0,
      testSessions: 0,
      frozenAll: true,
      anyRow: false,
    };
    existing.anyRow = true;
    existing.lessonSessions += row.lesson_sessions_count ?? 0;
    existing.testSessions += row.test_sessions_count ?? 0;
    if (!row.streak_frozen) {
      existing.frozenAll = false;
    }
    byDate.set(date, existing);
  }

  const heatmap = buildHeatmapRange(byDate);

  return { summary, recover, heatmap };
}

// ============================================================================
// HELPERS
// ============================================================================

function computeRecoverState(input: {
  lastActivityDate: string | null;
  currentStreak: number;
  coinBalance: number;
}): StreakRecoverState {
  const { lastActivityDate, currentStreak, coinBalance } = input;

  if (!lastActivityDate || currentStreak <= 0) {
    return {
      eligible: false,
      daysMissed: 0,
      coinCost: 0,
      canAfford: false,
      streakAtRisk: 0,
    };
  }

  // Compute "days missed" = full calendar days between last_activity_date
  // and today, exclusive of both endpoints. Mirrors the RPC's
  // (today - last_activity_date - 1) integer arithmetic.
  const today = todayDateOnly();
  const last = parseDateOnly(lastActivityDate);
  if (!last) {
    return {
      eligible: false,
      daysMissed: 0,
      coinCost: 0,
      canAfford: false,
      streakAtRisk: 0,
    };
  }
  const diffMs = today.getTime() - last.getTime();
  const daysMissed = Math.floor(diffMs / (1000 * 60 * 60 * 24)) - 1;

  if (daysMissed < 1 || daysMissed > RECOVER_MAX_DAYS) {
    return {
      eligible: false,
      daysMissed: 0,
      coinCost: 0,
      canAfford: false,
      streakAtRisk: 0,
    };
  }

  const coinCost = RECOVER_COIN_COST_PER_DAY * daysMissed;

  return {
    eligible: true,
    daysMissed,
    coinCost,
    canAfford: coinBalance >= coinCost,
    streakAtRisk: currentStreak,
  };
}

/**
 * Build the full heatmap range from the earliest aggregated date through
 * today, filling gaps with empty cells. Returns at least the last 7 days even
 * when the user has no activity yet, so the grid renders cleanly.
 */
function buildHeatmapRange(
  byDate: Map<
    string,
    {
      lessonSessions: number;
      testSessions: number;
      frozenAll: boolean;
      anyRow: boolean;
    }
  >
): HeatmapDay[] {
  const today = todayDateOnly();
  const dates = Array.from(byDate.keys()).sort();
  const earliestStr = dates[0];
  const earliest = earliestStr ? parseDateOnly(earliestStr) : null;

  // Default range: 7 days back when there's no activity, so the empty-state
  // grid still renders a row of cells.
  const startDate = earliest ?? addDays(today, -6);

  const out: HeatmapDay[] = [];
  let cursor = startDate;
  while (cursor.getTime() <= today.getTime()) {
    const key = formatDateOnly(cursor);
    const agg = byDate.get(key);
    const lessons = agg?.lessonSessions ?? 0;
    const tests = agg?.testSessions ?? 0;
    out.push({
      date: key,
      count: lessons + tests,
      lessonSessions: lessons,
      testSessions: tests,
      frozen: agg?.anyRow && agg.frozenAll ? true : undefined,
    });
    cursor = addDays(cursor, 1);
  }

  return out;
}

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDateOnly(s: string): Date | null {
  // Accept "YYYY-MM-DD" (Postgres date column) without injecting a TZ shift.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
