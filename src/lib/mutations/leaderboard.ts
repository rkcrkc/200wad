"use server";

import { getLeaderboard } from "@/lib/queries/leaderboard";
import type {
  LeaderboardData,
  LeaderboardMetric,
  LeaderboardPeriod,
} from "@/lib/queries/leaderboard";

/**
 * Server Action to fetch leaderboard data for client-side metric/period switching
 */
export async function fetchLeaderboardData(
  languageId: string,
  metric: LeaderboardMetric,
  period: LeaderboardPeriod
): Promise<LeaderboardData> {
  return getLeaderboard(languageId, metric, period);
}
