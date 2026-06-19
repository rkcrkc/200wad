import { createClient } from "@/lib/supabase/server";

// ============================================================================
// TYPES
// ============================================================================

/** Fallback used when the user row has no `daily_xp_goal` set. */
const DEFAULT_DAILY_XP_GOAL = 30;

export interface DailyGoalProgress {
  /** `users.daily_xp_goal` (defaults to 30 when unset). */
  goal: number;
  /** Sum of `test_points_earned` across today's `user_daily_activity` rows. */
  todayXp: number;
  /** Clamped 0–100 integer percentage of `todayXp / goal`. */
  percent: number;
  /** Mirrors `user_daily_activity.daily_goal_met` for today (any language row). */
  goalMet: boolean;
}

// ============================================================================
// QUERY
// ============================================================================

const GUEST_PROGRESS: DailyGoalProgress = {
  goal: DEFAULT_DAILY_XP_GOAL,
  todayXp: 0,
  percent: 0,
  goalMet: false,
};

/**
 * Server query for the header daily-goal ring. Returns the user's configured
 * goal, today's XP total, the derived percent, and whether the 100% threshold
 * already fired today.
 *
 * Guest path returns a zero state so the layout's streamed bundle can render
 * without branching on auth.
 */
export async function getDailyGoalProgress(): Promise<DailyGoalProgress> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return GUEST_PROGRESS;
  }

  // `update_daily_activity` buckets the row by the user's local calendar day
  // (users.timezone). Resolve "today" in that same zone so the read targets the
  // row the RPC wrote — otherwise a user east/west of UTC sees the ring reset
  // at UTC midnight rather than their own. Falls back to UTC.
  const userRowResult = await supabase
    .from("users")
    .select("daily_xp_goal, timezone")
    .eq("id", user.id)
    .maybeSingle();

  const timezone = userRowResult.data?.timezone || "UTC";
  let todayISO: string;
  try {
    // `en-CA` formats as YYYY-MM-DD, matching the DATE column's text form.
    todayISO = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
      new Date()
    );
  } catch {
    todayISO = new Date().toISOString().slice(0, 10);
  }

  const activityResult = await supabase
    .from("user_daily_activity")
    .select("test_points_earned, daily_goal_met")
    .eq("user_id", user.id)
    .eq("activity_date", todayISO);

  const goal = userRowResult.data?.daily_xp_goal ?? DEFAULT_DAILY_XP_GOAL;

  const activityRows = activityResult.data ?? [];
  const todayXp = activityRows.reduce(
    (sum, row) => sum + (row.test_points_earned ?? 0),
    0
  );
  const goalMet = activityRows.some((row) => row.daily_goal_met === true);

  const percent =
    goal > 0
      ? Math.max(0, Math.min(100, Math.round((todayXp * 100) / goal)))
      : 0;

  return { goal, todayXp, percent, goalMet };
}
