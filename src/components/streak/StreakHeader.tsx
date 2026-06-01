import { Calendar, Coins, Flame, Snowflake } from "lucide-react";
import { SubBadge } from "@/components/ui/sub-badge";
import type { StreakSummary } from "@/lib/queries/streaks";

interface StreakHeaderProps {
  summary: StreakSummary;
}

/**
 * Top-of-page card for `/streak`. Mirrors `TrophiesHeader`: h1 + subtitle +
 * a responsive grid of stat cards with the value rendered in
 * `text-xl-semibold text-foreground`.
 */
export function StreakHeader({ summary }: StreakHeaderProps) {
  const { currentStreak, longestStreak, freezesAvailable, coinBalance } =
    summary;

  const isPersonalBest = currentStreak > 0 && currentStreak >= longestStreak;

  return (
    <div className="mb-8">
      <h1 className="text-page-header text-foreground">Streaks</h1>
      <p className="mt-1 text-[15px] leading-[1.4] text-muted-foreground">
        Daily activity earns a streak. Miss a day and your freezes step in.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Current streak */}
        <div className="rounded-2xl bg-white p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Flame
              className="h-4 w-4 text-orange-500"
              strokeWidth={1.67}
            />
            <span className="text-xs-medium uppercase tracking-wide">
              Current streak
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-xl-semibold text-foreground">{currentStreak}</p>
            {isPersonalBest && (
              <SubBadge className="bg-orange-100 text-orange-600">
                Personal best!
              </SubBadge>
            )}
          </div>
        </div>

        {/* Longest streak */}
        <div className="rounded-2xl bg-white p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" strokeWidth={1.67} />
            <span className="text-xs-medium uppercase tracking-wide">
              Longest streak
            </span>
          </div>
          <p className="mt-2 text-xl-semibold text-foreground">
            {longestStreak}
          </p>
        </div>

        {/* Freezes available */}
        <div className="rounded-2xl bg-white p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Snowflake
              className="h-4 w-4 text-blue-500"
              strokeWidth={1.67}
            />
            <span className="text-xs-medium uppercase tracking-wide">
              Freezes
            </span>
          </div>
          <p className="mt-2 text-xl-semibold text-foreground">
            {freezesAvailable}
          </p>
        </div>

        {/* Coin balance (recover-cost context) */}
        <div className="rounded-2xl bg-white p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Coins
              className="h-4 w-4 text-amber-500"
              strokeWidth={1.67}
            />
            <span className="text-xs-medium uppercase tracking-wide">
              Coins
            </span>
          </div>
          <p className="mt-2 text-xl-semibold text-foreground">{coinBalance}</p>
        </div>
      </div>
    </div>
  );
}
