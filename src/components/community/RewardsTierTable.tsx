import type { LeaderboardReward } from "@/lib/queries/leaderboard";
import { DollarSign } from "lucide-react";

function formatRankRange(min: number, max: number): string {
  if (min === max) return `#${min}`;
  return `#${min}-${max}`;
}

export function RewardsTierTable({
  rewards,
}: {
  rewards: LeaderboardReward[];
}) {
  // Show bronze tier rewards (the default for all users currently)
  const tiers = rewards
    .filter((r) => r.league === "bronze")
    .sort((a, b) => a.rank_min - b.rank_min);

  if (tiers.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5 text-green-600" />
        <h3 className="font-semibold">Weekly Rewards</h3>
      </div>

      <div className="space-y-1">
        {tiers.map((tier) => (
          <div
            key={`${tier.rank_min}-${tier.rank_max}`}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm odd:bg-gray-50"
          >
            <span className="text-muted-foreground">
              {formatRankRange(tier.rank_min, tier.rank_max)}
            </span>
            <span className="font-medium text-green-700">
              ${(tier.reward_cents / 100).toFixed(0)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Credits awarded weekly to top performers.
      </p>
    </div>
  );
}
