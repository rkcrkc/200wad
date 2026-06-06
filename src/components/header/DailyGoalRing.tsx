"use client";

import Link from "next/link";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Tooltip } from "@/components/ui/tooltip";
import type { DailyGoalProgress } from "@/lib/queries/daily-goal";

interface DailyGoalRingProps {
  /** Stats bundle slice — `undefined` while the header Suspense bundle resolves. */
  progress: DailyGoalProgress | undefined;
}

/**
 * Header indicator showing today's XP progress against the user's daily goal.
 * Renders a compact ring + two stacked text rows (value over label) matching
 * the rhythm of the sibling words-per-day / total-time blocks.
 *
 * Hovering shows a tooltip explaining what XP is and pointing users at the
 * Settings page to adjust their target. The whole block links to /settings
 * so a click lands the user exactly where they can change the goal.
 */
export function DailyGoalRing({ progress }: DailyGoalRingProps) {
  // Stats bundle still streaming — render nothing to preserve the
  // no-layout-shift contract used by the sibling indicators.
  if (!progress) return null;

  const { goal, todayXp, percent, goalMet } = progress;
  const ringColor = goalMet ? "var(--color-success)" : "var(--color-primary)";

  return (
    <Tooltip
      align="right"
      position="below"
      label={
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Daily goal</span>
          <span>
            XP are points you earn from tests — full marks score 3 XP per
            word. You can raise or lower your daily target in{" "}
            <span className="font-semibold">Settings → Preferences</span> if
            you&rsquo;d like to be more or less ambitious.
          </span>
        </div>
      }
    >
      <Link
        href="/settings"
        prefetch
        aria-label="Edit daily XP goal in settings"
        className="flex items-center gap-2 rounded-[10px] border border-yellow-400 bg-yellow-50 py-1 pr-3 pl-1.5"
      >
        <ProgressRing
          value={percent}
          size={24}
          strokeWidth={3}
          color={ringColor}
        />
        <div className="flex flex-col items-start leading-tight">
          <span className="text-foreground text-[15px] font-semibold tracking-[-0.15px]">
            {todayXp}/{goal} XP
          </span>
          <span className="text-muted-foreground text-[11px] font-medium tracking-[-0.11px]">
            Daily goal
          </span>
        </div>
      </Link>
    </Tooltip>
  );
}
