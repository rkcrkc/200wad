import type { StreakStats } from "@/lib/queries/stats";
import { SubBadge } from "@/components/ui/sub-badge";

interface StreaksCardProps {
  streaks: StreakStats;
}

function dayLabel(n: number) {
  return n === 1 ? "day" : "days";
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
        <div>
          <p className="text-xs font-medium text-muted-foreground">Current streak</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-2xl font-semibold">
              {streaks.currentStreak} {dayLabel(streaks.currentStreak)}
            </p>
            {isPersonalBest && (
              <SubBadge className="bg-orange-100 text-orange-600">
                Personal best!
              </SubBadge>
            )}
          </div>
          <p className="mt-1 text-xs text-black/50">
            Consecutive days studied/tested
          </p>
        </div>

        {/* Longest Streak */}
        <div>
          <p className="text-xs font-medium text-muted-foreground">Longest streak</p>
          <p className="mt-1 text-2xl font-semibold">
            {streaks.longestStreak} {dayLabel(streaks.longestStreak)}
          </p>
        </div>
      </div>
    </div>
  );
}
