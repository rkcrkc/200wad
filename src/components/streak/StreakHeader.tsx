import { Calendar, Flame } from "lucide-react";
import { SubBadge } from "@/components/ui/sub-badge";
import type { StreakSummary } from "@/lib/queries/streaks";
import { FreezeToggleCard } from "./FreezeToggleCard";

interface StreakHeaderProps {
  summary: StreakSummary;
}

/**
 * Top-of-page card for `/streak`. Mirrors `TrophiesHeader`: h1 + subtitle +
 * a responsive grid of stat cards with the value rendered in
 * `text-xl-semibold text-foreground`.
 */
export function StreakHeader({ summary }: StreakHeaderProps) {
  const { currentStreak, longestStreak, freezesAvailable, freezeAuto } =
    summary;

  const isPersonalBest = currentStreak > 0 && currentStreak >= longestStreak;

  return (
    <div className="mb-8">
      <h1 className="text-page-header text-foreground">Streaks</h1>
      <p className="mt-1 text-[15px] leading-[1.4] text-muted-foreground">
        Daily activity earns a streak. Miss a day and your freezes step in.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <p className="text-xl-semibold text-foreground">
              {currentStreak} {currentStreak === 1 ? "day" : "days"}
            </p>
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
            {longestStreak} {longestStreak === 1 ? "day" : "days"}
          </p>
        </div>

        {/* Freezes available + auto-apply toggle */}
        <FreezeToggleCard
          freezesAvailable={freezesAvailable}
          initialAuto={freezeAuto}
        />
      </div>
    </div>
  );
}
