import { Flame, Trophy } from "lucide-react";
import type { StreakStats } from "@/lib/queries/stats";

interface StreaksCardProps {
  streaks: StreakStats;
}

export function StreaksCard({ streaks }: StreaksCardProps) {
  const isPersonalBest =
    streaks.currentStreak > 0 &&
    streaks.currentStreak >= streaks.longestStreak;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
        Streaks
      </h3>
      <div className="grid grid-cols-2 gap-6">
        {/* Current Streak */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
            <Flame className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold">{streaks.currentStreak}</p>
              {isPersonalBest && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
                  Personal best!
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Current streak</p>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Trophy className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{streaks.longestStreak}</p>
            <p className="text-xs text-muted-foreground">Longest streak</p>
          </div>
        </div>
      </div>
    </div>
  );
}
