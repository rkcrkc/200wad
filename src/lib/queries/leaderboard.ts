"use server";

import { createClient } from "@/lib/supabase/server";

// ============================================================================
// TYPES
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  nationalities: string[];
  league: string;
  current_streak: number;
  metric_value: number;
}

export type LeaderboardMetric = "avg_words_per_day" | "words_mastered" | "streak";
export type LeaderboardPeriod = "week" | "month" | "all-time";

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  userPosition: {
    rank: number;
    metric_value: number;
    total_users: number;
  } | null;
}

export interface LeaderboardReward {
  league: string;
  rank_min: number;
  rank_max: number;
  reward_cents: number;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch the leaderboard data for a specific language, metric, and period
 */
export async function getLeaderboard(
  languageId: string,
  metric: LeaderboardMetric = "avg_words_per_day",
  period: LeaderboardPeriod = "week",
  limit: number = 20
): Promise<LeaderboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch leaderboard entries via RPC
  const { data: entries, error } = await supabase.rpc("get_leaderboard", {
    p_language_id: languageId,
    p_metric: metric,
    p_period: period,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return { entries: [], userPosition: null };
  }

  // Fetch current user's position if authenticated
  let userPosition: LeaderboardData["userPosition"] = null;
  if (user) {
    const { data: position, error: posError } = await supabase.rpc(
      "get_user_leaderboard_position",
      {
        p_user_id: user.id,
        p_language_id: languageId,
        p_metric: metric,
        p_period: period,
      }
    );

    if (!posError && position && position.length > 0) {
      userPosition = {
        rank: position[0].rank,
        metric_value: position[0].metric_value,
        total_users: position[0].total_users,
      };
    }
  }

  return {
    entries: (entries || []).map((e: Record<string, unknown>) => ({
      rank: Number(e.rank),
      user_id: String(e.user_id),
      username: e.username as string | null,
      name: e.name as string | null,
      avatar_url: e.avatar_url as string | null,
      nationalities: (e.nationalities as string[]) || [],
      league: String(e.league || "bronze"),
      current_streak: Number(e.current_streak || 0),
      metric_value: Number(e.metric_value || 0),
    })),
    userPosition,
  };
}

/**
 * Get the leaderboard reward tiers
 */
export async function getLeaderboardRewards(): Promise<LeaderboardReward[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leaderboard_rewards")
    .select("league, rank_min, rank_max, reward_cents")
    .eq("is_active", true)
    .order("league")
    .order("rank_min");

  if (error) {
    console.error("Error fetching leaderboard rewards:", error);
    return [];
  }

  return data || [];
}

/**
 * Get league configuration from platform_config
 */
export async function getLeagueConfig(): Promise<{
  leagues: string[];
  promote_top_n: number;
  relegate_bottom_n: number;
  point_formula: {
    words_mastered_weight: number;
    streak_days_weight: number;
    accuracy_weight: number;
  };
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", "leaderboard_leagues")
    .single();

  if (error || !data) {
    return null;
  }

  return data.value as {
    leagues: string[];
    promote_top_n: number;
    relegate_bottom_n: number;
    point_formula: {
      words_mastered_weight: number;
      streak_days_weight: number;
      accuracy_weight: number;
    };
  };
}

/**
 * Get user's personal bests from user_daily_activity
 */
export async function getPersonalBests(languageId: string): Promise<{
  bestDayWords: number;
  bestWeekWords: number;
  highestStreak: number;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Best single day
  const { data: bestDay } = await supabase
    .from("user_daily_activity")
    .select("words_studied")
    .eq("user_id", user.id)
    .eq("language_id", languageId)
    .order("words_studied", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Best week (sum of words_studied grouped by week)
  const { data: weeklyData } = await supabase
    .from("user_daily_activity")
    .select("activity_date, words_studied")
    .eq("user_id", user.id)
    .eq("language_id", languageId)
    .order("activity_date");

  let bestWeekWords = 0;
  if (weeklyData && weeklyData.length > 0) {
    // Group by ISO week and find the best
    const weekMap = new Map<string, number>();
    for (const row of weeklyData) {
      const date = new Date(row.activity_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];
      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + row.words_studied);
    }
    bestWeekWords = Math.max(...weekMap.values(), 0);
  }

  // Highest streak
  const { data: userData } = await supabase
    .from("users")
    .select("longest_streak")
    .eq("id", user.id)
    .single();

  return {
    bestDayWords: bestDay?.words_studied || 0,
    bestWeekWords,
    highestStreak: userData?.longest_streak || 0,
  };
}
