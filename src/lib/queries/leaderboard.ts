"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { League } from "@/types/aliases";

// ============================================================================
// TYPES
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  location: string | null;
  league: string;
  current_streak: number;
  metric_value: number;
  /** Cached rank ladder position. 1 is the entry rank (Novice) every user holds. */
  level_number: number;
  /** Rank badge label, null if the cached level isn't in the enabled ladder. */
  level_name: string | null;
  /** Rank badge hex colour, null when level_name is null. */
  level_color: string | null;
}

/**
 * The user-facing board is XP-only (`xp`). The other metrics remain valid RPC
 * arguments because the `/streak` page still calls the leaderboard RPCs with
 * `streak` for its "top N streaks" badge (src/lib/queries/streaks.ts).
 */
export type LeaderboardMetric =
  | "xp"
  | "avg_words_per_day"
  | "words_mastered"
  | "streak";
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

/** A coin payout band for a league tier (from the `league_rewards` table). */
export interface LeagueReward {
  league_slug: string;
  rank_min: number;
  rank_max: number;
  coin_reward: number;
}

/** One competitor in the signed-in user's weekly league room. */
export interface LeagueRoomMember {
  rank: number;
  user_id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  location: string | null;
  current_streak: number;
  xp_earned: number;
  is_current_user: boolean;
  /** Rank badge (belt) for this member, resolved via get_users_levels. */
  level_number: number;
  level_name: string | null;
  level_color: string | null;
}

/**
 * The signed-in user's weekly league room: the tier/division they're in plus the
 * ~30 competitors sharing it, ranked by live weekly XP. `null` for guests or when
 * no tiers are configured.
 */
export interface LeagueRoom {
  league: {
    slug: string;
    name: string;
    color: string;
    /** Tier emoji (admin-editable), shown beside the league name. */
    icon: string;
    tier_order: number;
    division: number;
    /** Top N of the room promoted up a tier each week (0 at the top tier). */
    promote_count: number;
    /** Bottom N of the room relegated down a tier each week (0 at the bottom tier). */
    relegate_count: number;
    /** This tier is the top of the ladder (nobody promotes out). */
    is_top: boolean;
    /** This tier is the bottom of the ladder (nobody relegates out). */
    is_bottom: boolean;
  };
  members: LeagueRoomMember[];
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch the leaderboard data for a metric and period. Pass `languageId = null`
 * for the global (cross-language) board — used by the XP leagues board. The
 * `/streak` page still passes a concrete `languageId` for its streak metric.
 */
export async function getLeaderboard(
  languageId: string | null,
  metric: LeaderboardMetric = "xp",
  period: LeaderboardPeriod = "week",
  limit: number = 20
): Promise<LeaderboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch leaderboard entries via RPC. `p_language_id` is generated as a
  // required string (Postgres params don't expose nullability), but the RPC
  // treats NULL as "global / all languages" — so we cast through.
  const { data: entries, error } = await supabase.rpc("get_leaderboard", {
    p_language_id: languageId as string,
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
        p_language_id: languageId as string,
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

  // Resolve each entry's rank badge in one batched lookup. The levels join runs
  // SECURITY DEFINER (users RLS only exposes the caller's own row), so we can't
  // read other learners' current_level via a plain select.
  const userIds = (entries || []).map((e: Record<string, unknown>) =>
    String(e.user_id)
  );
  const levelByUser = new Map<
    string,
    { level_number: number; level_name: string | null; level_color: string | null }
  >();

  if (userIds.length > 0) {
    const { data: levels, error: levelsError } = await supabase.rpc(
      "get_users_levels",
      { p_user_ids: userIds }
    );

    if (levelsError) {
      console.error("Error fetching leaderboard levels:", levelsError);
    } else {
      for (const row of levels || []) {
        levelByUser.set(row.user_id, {
          level_number: row.level_number,
          level_name: row.level_name,
          level_color: row.level_color,
        });
      }
    }
  }

  return {
    entries: (entries || []).map((e: Record<string, unknown>) => {
      const userId = String(e.user_id);
      const level = levelByUser.get(userId);
      return {
        rank: Number(e.rank),
        user_id: userId,
        username: e.username as string | null,
        name: e.name as string | null,
        avatar_url: e.avatar_url as string | null,
        location: (e.location as string | null) || null,
        league: String(e.league || "bronze"),
        current_streak: Number(e.current_streak || 0),
        metric_value: Number(e.metric_value || 0),
        level_number: level?.level_number ?? 1,
        level_name: level?.level_name ?? null,
        level_color: level?.level_color ?? null,
      };
    }),
    userPosition,
  };
}

/**
 * Lightweight variant that returns only the signed-in user's leaderboard
 * position — no top-N entries fetch. Use this when the caller only needs the
 * rank badge (e.g. the dashboard header). Skips the `get_leaderboard` RPC
 * entirely, cutting the layout's leaderboard cost in half.
 */
export async function getUserLeaderboardPosition(
  languageId: string | null,
  metric: LeaderboardMetric = "xp",
  period: LeaderboardPeriod = "week"
): Promise<LeaderboardData["userPosition"]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase.rpc("get_user_leaderboard_position", {
    p_user_id: user.id,
    p_language_id: languageId as string,
    p_metric: metric,
    p_period: period,
  });

  if (error || !data || data.length === 0) return null;

  return {
    rank: data[0].rank,
    metric_value: data[0].metric_value,
    total_users: data[0].total_users,
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
 * Fetch the coin payout bands for every league tier (the `league_rewards` table,
 * enabled rows only). Returned flat with the tier's `slug` so the UI can pick the
 * bands for whichever room a user is in. Podium-only by design (top 3 per room).
 */
export async function getLeagueRewards(): Promise<LeagueReward[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("league_rewards")
    .select("rank_min, rank_max, coin_reward, leagues(slug)")
    .eq("enabled", true)
    .order("rank_min");

  if (error) {
    console.error("Error fetching league rewards:", error);
    return [];
  }

  return (data || []).map((r) => ({
    league_slug: (r.leagues as { slug: string } | null)?.slug ?? "",
    rank_min: r.rank_min,
    rank_max: r.rank_max,
    coin_reward: r.coin_reward,
  }));
}

/**
 * Fetch the signed-in user's weekly league room. Lazily enrols them into the
 * bottom tier on first view (handled in the RPC) and returns the room's members
 * ranked by live weekly XP. Rank badges are resolved in a second batched lookup
 * (same pattern as `getLeaderboard`, since users RLS only exposes the caller's
 * own level). Returns `null` for guests or when no tiers are configured.
 */
export async function getLeagueRoom(): Promise<LeagueRoom | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: rows, error } = await supabase.rpc("get_or_create_league_room", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error fetching league room:", error);
    return null;
  }
  if (!rows || rows.length === 0) return null;

  // Resolve rank badges for every room member in one batched lookup.
  const userIds = rows.map((r) => r.user_id);
  const levelByUser = new Map<
    string,
    { level_number: number; level_name: string | null; level_color: string | null }
  >();

  const { data: levels, error: levelsError } = await supabase.rpc(
    "get_users_levels",
    { p_user_ids: userIds }
  );
  if (levelsError) {
    console.error("Error fetching league room levels:", levelsError);
  } else {
    for (const row of levels || []) {
      levelByUser.set(row.user_id, {
        level_number: row.level_number,
        level_name: row.level_name,
        level_color: row.level_color,
      });
    }
  }

  const first = rows[0];
  return {
    league: {
      slug: first.league_slug,
      name: first.league_name,
      color: first.league_color,
      icon: first.league_icon,
      tier_order: first.tier_order,
      division: first.division,
      promote_count: Number(first.promote_count ?? 0),
      relegate_count: Number(first.relegate_count ?? 0),
      is_top: Boolean(first.is_top),
      is_bottom: Boolean(first.is_bottom),
    },
    members: rows.map((r) => {
      const level = levelByUser.get(r.user_id);
      return {
        rank: Number(r.rank),
        user_id: r.user_id,
        username: r.username,
        name: r.name,
        avatar_url: r.avatar_url,
        location: r.location || null,
        current_streak: Number(r.current_streak || 0),
        xp_earned: Number(r.xp_earned || 0),
        is_current_user: Boolean(r.is_current_user),
        level_number: level?.level_number ?? 1,
        level_name: level?.level_name ?? null,
        level_color: level?.level_color ?? null,
      };
    }),
  };
}

/**
 * Count of distinct real lessons the signed-in user has tested. Backs the
 * weekly-leagues unlock gate on the community page. Returns `null` for guests
 * (the gate sentinel: guests see All-time only, no toggle), else the count.
 */
export async function getDistinctLessonsTested(): Promise<number | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // guest sentinel

  const { data } = await supabase.rpc("get_distinct_lessons_tested", {
    p_user_id: user.id,
  });
  return (data as number | null) ?? 0;
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
 * Get the user's leaderboard header stats:
 * - `bestRank` — best-ever (lowest) position held on the all-time, all-language
 *   board, maintained by the `track_alltime_rank_pb` trigger. `null` = never ranked.
 * - `bestWeekXp` / `bestWeekAt` — the cross-language weekly XP PB and the date its
 *   week began (`update_daily_activity` keeps both; matches the Progress page).
 * - `lifetimeXp` — total XP, the score the all-time rank is based on.
 */
export async function getPersonalBests(): Promise<{
  bestRank: number | null;
  bestWeekXp: number;
  bestWeekAt: string | null;
  lifetimeXp: number;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("pb_alltime_rank, pb_week_test_points, pb_week_test_points_at, lifetime_xp")
    .eq("id", user.id)
    .single();

  return {
    bestRank: userData?.pb_alltime_rank ?? null,
    bestWeekXp: userData?.pb_week_test_points ?? 0,
    bestWeekAt: userData?.pb_week_test_points_at ?? null,
    lifetimeXp: userData?.lifetime_xp ?? 0,
  };
}

// ============================================================================
// ADMIN
// ============================================================================

/**
 * Fetch the full league ladder — including disabled tiers — for the admin CMS.
 * Uses the service-role client to bypass the public "enabled rows only" RLS
 * policy (mirrors getAllLevelsAdmin). Server-only; never import client-side.
 */
export async function getAllLeaguesAdmin(): Promise<League[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("leagues")
    .select("*")
    .order("tier_order", { ascending: true });

  if (error) {
    console.error("Error fetching leagues (admin):", error);
    return [];
  }

  return data ?? [];
}
