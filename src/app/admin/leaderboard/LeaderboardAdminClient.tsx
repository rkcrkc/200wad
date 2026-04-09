"use client";

import { useState } from "react";
import {
  Shield,
  AlertTriangle,
  Users,
  DollarSign,
  Flame,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { ActivityFlag, LeaderboardRewardRow } from "@/types/database";

interface LeaderboardAdminClientProps {
  flags: ActivityFlag[];
  leagueDistribution: {
    diamond: number;
    gold: number;
    silver: number;
    bronze: number;
  };
  totalActiveUsers: number;
  avgStreak: number;
  rewards: LeaderboardRewardRow[];
  monthlyRewardCost: number;
}

const LEAGUE_COLORS: Record<string, string> = {
  diamond: "bg-blue-100 text-blue-800",
  gold: "bg-yellow-100 text-yellow-800",
  silver: "bg-gray-100 text-gray-700",
  bronze: "bg-amber-100 text-amber-800",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-yellow-50 text-yellow-700 border-yellow-200",
  medium: "bg-orange-50 text-orange-700 border-orange-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

const FLAG_TYPE_LABELS: Record<string, string> = {
  impossible_speed: "Impossible Speed",
  score_mismatch: "Score Mismatch",
  rate_limit: "Rate Limited",
  word_id_mismatch: "Word ID Mismatch",
  word_count_exceeded: "Word Count Exceeded",
  question_count_exceeded: "Question Count Exceeded",
};

export function LeaderboardAdminClient({
  flags,
  leagueDistribution,
  totalActiveUsers,
  avgStreak,
  rewards,
  monthlyRewardCost,
}: LeaderboardAdminClientProps) {
  const [showResolved, setShowResolved] = useState(false);

  const displayedFlags = showResolved
    ? flags
    : flags.filter((f) => !f.resolved);

  const unresolvedCount = flags.filter((f) => !f.resolved).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* League Distribution */}
        <div className="rounded-xl bg-white p-4 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-gray-500">League Distribution</span>
          </div>
          <div className="space-y-1.5">
            {(["diamond", "gold", "silver", "bronze"] as const).map((league) => (
              <div key={league} className="flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEAGUE_COLORS[league]}`}>
                  {league.charAt(0).toUpperCase() + league.slice(1)}
                </span>
                <span className="text-sm font-semibold">{leagueDistribution[league]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Users */}
        <div className="rounded-xl bg-white p-4 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-gray-500">Active Users</span>
          </div>
          <p className="text-3xl font-bold">{totalActiveUsers}</p>
          <p className="text-sm text-gray-500">with active streaks</p>
        </div>

        {/* Avg Streak */}
        <div className="rounded-xl bg-white p-4 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-500">Avg Streak</span>
          </div>
          <p className="text-3xl font-bold">{avgStreak}</p>
          <p className="text-sm text-gray-500">days (active users)</p>
        </div>

        {/* Monthly Reward Cost */}
        <div className="rounded-xl bg-white p-4 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-500">Monthly Rewards</span>
          </div>
          <p className="text-3xl font-bold">${(monthlyRewardCost / 100).toFixed(2)}</p>
          <p className="text-sm text-gray-500">last 30 days</p>
        </div>
      </div>

      {/* Reward Tiers */}
      <div className="rounded-xl bg-white shadow-card">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="font-semibold">Reward Configuration</h2>
        </div>
        <div className="px-6 py-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="pb-2 pr-4">League</th>
                  <th className="pb-2 pr-4">Rank Range</th>
                  <th className="pb-2 pr-4">Reward</th>
                  <th className="pb-2">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bone-hover">
                {rewards.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEAGUE_COLORS[r.league] || ""}`}>
                        {r.league.charAt(0).toUpperCase() + r.league.slice(1)}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-700">
                      #{r.rank_min}{r.rank_min !== r.rank_max ? `-${r.rank_max}` : ""}
                    </td>
                    <td className="py-2 pr-4 font-medium text-green-700">
                      ${(r.reward_cents / 100).toFixed(0)}
                    </td>
                    <td className="py-2">
                      {r.is_active ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-300" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Activity Flags */}
      <div className="rounded-xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold">Activity Flags</h2>
            {unresolvedCount > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {unresolvedCount} unresolved
              </span>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-500">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show resolved
          </label>
        </div>
        <div className="divide-y divide-bone-hover">
          {displayedFlags.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No activity flags to review.
            </div>
          ) : (
            displayedFlags.map((flag) => (
              <div key={flag.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[flag.severity] || SEVERITY_COLORS.low}`}>
                        {flag.severity}
                      </span>
                      <span className="text-sm font-medium">
                        {FLAG_TYPE_LABELS[flag.flag_type] || flag.flag_type}
                      </span>
                      {flag.resolved && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      User: {flag.user_id.slice(0, 8)}...
                      {flag.session_id && <> &middot; Session: {flag.session_id.slice(0, 8)}...</>}
                      &middot; {new Date(flag.created_at!).toLocaleDateString()}
                    </p>
                    {flag.details && Object.keys(flag.details).length > 0 && (
                      <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-600">
                        {JSON.stringify(flag.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
