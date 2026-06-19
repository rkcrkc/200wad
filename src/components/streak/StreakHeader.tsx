"use client";

import { Calendar } from "lucide-react";
import type { StreakRecoverState, StreakSummary } from "@/lib/queries/streaks";
import { StreakStatusBanner } from "./StreakStatusBanner";

interface StreakHeaderProps {
  summary: StreakSummary;
  recover: StreakRecoverState;
}

/**
 * Top-of-page header for `/streak`: the page title + subtitle on the left and
 * the "Longest streak" header stat on the right (matching the inline header-
 * stats pattern used on the Lessons/Tests pages). Beneath it sits the unified
 * {@link StreakStatusBanner}, which houses all motivational streak messaging
 * (recover prompt or encouraging copy depending on the live streak state).
 */
export function StreakHeader({ summary, recover }: StreakHeaderProps) {
  const { longestStreak } = summary;

  return (
    <div className="mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-page-header text-foreground">Streaks</h1>
          <p className="mt-1 text-[15px] leading-[1.4] text-muted-foreground">
            Daily activity earns a streak. Miss a day and your freezes step in.
          </p>
        </div>

        <div className="flex cursor-default flex-wrap items-center gap-x-8 gap-y-2">
          <div className="flex flex-col items-start gap-1.5">
            <span className="text-xs text-muted-foreground">Longest streak</span>
            <div className="flex items-center gap-1.5">
              <Calendar
                className="h-4 w-4 text-muted-foreground"
                strokeWidth={1.67}
              />
              <span className="text-regular-semibold">
                {longestStreak} {longestStreak === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <StreakStatusBanner summary={summary} recover={recover} />
    </div>
  );
}
