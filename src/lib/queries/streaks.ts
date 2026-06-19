import { createClient } from "@/lib/supabase/server";
import { getDueTestsCount } from "./schedule";
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
  /**
   * Whole days between the user's last activity date and today. `null` when
   * the user has never logged any activity. `0` means activity was logged
   * today. Used by the streak-header lapsed CTA to render "You haven't
   * studied in N days".
   */
  daysSinceLastActivity: number | null;
  /**
   * What the streak-header CTA should point the user at next. `"test"` when
   * any milestone tests are due, `"lesson"` otherwise. Drives the button
   * label ("Start next test" vs "Start next lesson").
   */
  nextActivityKind: "test" | "lesson";
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
    daysSinceLastActivity: null,
    nextActivityKind: "lesson",
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

  const [userRowResult, activityResult, dueTestsCount] = await Promise.all([
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
    // Global due-tests count — mirrors the sidebar badge. Drives the
    // streak-header CTA label.
    getDueTestsCount(),
  ]);

  const userRow = userRowResult.data;
  const activityRows = activityResult.data ?? [];

  // `users.current_streak` is a snapshot written by `update_daily_activity`
  // at session end. Without a new session, the column never refreshes — so a
  // user whose last activity was N days ago still shows their last recorded
  // streak even when the actual streak has lapsed. Derive an effective value
  // from `last_activity_date` + freezes so the UI matches reality.
  const storedStreak = userRow?.current_streak ?? 0;
  const freezesAvailable = userRow?.streak_freezes_available ?? 0;
  const freezeAuto = userRow?.streak_freeze_auto ?? true;
  const effectiveCurrentStreak = computeEffectiveCurrentStreak({
    storedStreak,
    lastActivityDate: userRow?.last_activity_date ?? null,
    freezesAvailable,
    freezeAuto,
  });

  const summary: StreakSummary = {
    currentStreak: effectiveCurrentStreak,
    longestStreak: userRow?.longest_streak ?? 0,
    freezesAvailable,
    freezeAuto,
    coinBalance: userRow?.coin_balance ?? 0,
    daysSinceLastActivity: computeDaysSinceLastActivity(
      userRow?.last_activity_date ?? null
    ),
    nextActivityKind: dueTestsCount > 0 ? "test" : "lesson",
  };

  // ----- Recover-streak eligibility snapshot ------------------------------
  // The RPC re-validates server-side, so this is purely a UX gate.
  // Pass the *stored* streak so a lapsed-but-recoverable streak (1-3 day gap)
  // still surfaces as "Recover your N-day streak".
  const recover = computeRecoverState({
    lastActivityDate: userRow?.last_activity_date ?? null,
    currentStreak: storedStreak,
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

/**
 * Lightweight "what should we show in the sidebar badge?" query. Returns the
 * effective current streak (same derivation as `getStreakPageData`) without
 * touching the activity-rows or leaderboard tables. Guests / never-started
 * users get `0`.
 *
 * Used by the dashboard layout's streamed header bundle so the Streaks
 * sidebar item can show a flame-count badge that matches the /streak page.
 */
export async function getCurrentStreak(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { data } = await supabase
    .from("users")
    .select(
      "current_streak, last_activity_date, streak_freezes_available, streak_freeze_auto"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return 0;

  return computeEffectiveCurrentStreak({
    storedStreak: data.current_streak ?? 0,
    lastActivityDate: data.last_activity_date ?? null,
    freezesAvailable: data.streak_freezes_available ?? 0,
    freezeAuto: data.streak_freeze_auto ?? true,
  });
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

/**
 * Returns the streak value the UI should display today.
 *
 * - Same-day or yesterday activity → stored streak (alive).
 * - Older gap → check freezes: if auto-apply is enabled and the user has
 *   enough freezes to bridge every missed day, the streak is preserved
 *   (freezes are consumed lazily on next activity by the RPC, but the result
 *   is already determined). Otherwise the streak is dead → 0.
 * - No `last_activity_date` or stored streak already 0 → 0.
 */
function computeEffectiveCurrentStreak(input: {
  storedStreak: number;
  lastActivityDate: string | null;
  freezesAvailable: number;
  freezeAuto: boolean;
}): number {
  const { storedStreak, lastActivityDate, freezesAvailable, freezeAuto } =
    input;
  if (storedStreak <= 0 || !lastActivityDate) return 0;

  const today = todayDateOnly();
  const last = parseDateOnly(lastActivityDate);
  if (!last) return 0;

  const diffDays = Math.floor(
    (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Today or yesterday — streak is still alive without needing a freeze.
  if (diffDays <= 1) return storedStreak;

  const daysMissed = diffDays - 1;
  if (freezeAuto && freezesAvailable >= daysMissed) return storedStreak;
  return 0;
}

/** Whole days elapsed since `lastActivityDate`. Null when never recorded. */
function computeDaysSinceLastActivity(
  lastActivityDate: string | null
): number | null {
  if (!lastActivityDate) return null;
  const last = parseDateOnly(lastActivityDate);
  if (!last) return null;
  const today = todayDateOnly();
  return Math.max(
    0,
    Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
  );
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
