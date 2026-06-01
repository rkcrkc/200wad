import { Coins, Trophy } from "lucide-react";
import type { UserAchievementAggregates } from "@/lib/queries/achievements";

interface TrophiesHeaderProps {
  aggregates: UserAchievementAggregates;
}

export function TrophiesHeader({ aggregates }: TrophiesHeaderProps) {
  const { unlockedCount, totalCount, totalCoinRewardsEarned } = aggregates;

  return (
    <div className="mb-8">
      <h1 className="text-page-header text-foreground">Trophies</h1>
      <p className="mt-1 text-[15px] leading-[1.4] text-muted-foreground">
        Milestones you&apos;ve earned and the ones still ahead.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4" strokeWidth={1.67} />
            <span className="text-xs-medium uppercase tracking-wide">
              Unlocked
            </span>
          </div>
          <p className="mt-2 text-xl-semibold text-foreground">
            {unlockedCount}
            <span> / {totalCount}</span>
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Coins className="h-4 w-4" strokeWidth={1.67} />
            <span className="text-xs-medium uppercase tracking-wide">
              Coins earned
            </span>
          </div>
          <p className="mt-2 text-xl-semibold text-foreground">
            {totalCoinRewardsEarned}
          </p>
        </div>
      </div>
    </div>
  );
}
