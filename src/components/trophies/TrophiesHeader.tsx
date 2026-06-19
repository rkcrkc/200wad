import { Coins, Trophy } from "lucide-react";
import type { UserAchievementAggregates } from "@/lib/queries/achievements";

interface TrophiesHeaderProps {
  aggregates: UserAchievementAggregates;
}

export function TrophiesHeader({ aggregates }: TrophiesHeaderProps) {
  const { unlockedCount, totalCount, totalCoinsEarned } = aggregates;

  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-page-header text-foreground">Trophies</h1>
        <p className="mt-1 text-[15px] leading-[1.4] text-muted-foreground">
          Milestones you&apos;ve earned and the ones still ahead.
        </p>
      </div>

      {/* Stats — mirrors the lessons/tests page header-stat format:
          small label above, icon + value below. */}
      <div className="flex cursor-default flex-wrap items-center gap-x-8 gap-y-2">
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-xs text-muted-foreground">Unlocked</span>
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-muted-foreground" strokeWidth={1.67} />
            <span className="text-regular-semibold">
              {unlockedCount} / {totalCount}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1.5">
          <span className="text-xs text-muted-foreground">Coins earned</span>
          <div className="flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-amber-500" strokeWidth={1.67} />
            <span className="text-regular-semibold">{totalCoinsEarned}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
