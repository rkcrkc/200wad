"use server";

import { getLeaderboard, getLeagueRoom } from "@/lib/queries/leaderboard";
import type {
  LeaderboardData,
  LeaderboardMetric,
  LeaderboardPeriod,
  LeagueRoom,
} from "@/lib/queries/leaderboard";

/**
 * Server Action to fetch leaderboard data for client-side metric/period switching
 */
export async function fetchLeaderboardData(
  languageId: string | null,
  metric: LeaderboardMetric,
  period: LeaderboardPeriod
): Promise<LeaderboardData> {
  return getLeaderboard(languageId, metric, period);
}

/**
 * Server Action to (re)fetch the signed-in user's weekly league room when the
 * client switches back to the Weekly tab.
 */
export async function fetchLeagueRoom(): Promise<LeagueRoom | null> {
  return getLeagueRoom();
}
