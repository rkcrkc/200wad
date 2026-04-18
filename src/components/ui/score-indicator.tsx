"use client";

import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { useText } from "@/context/TextContext";

interface TestAttempt {
  pointsEarned: number;
  maxPoints: number;
  answeredAt?: string;
}

interface WordScoreStats {
  totalPointsEarned: number;
  totalMaxPoints: number;
  scorePercent: number;
  timesTested: number;
}

interface ScoreIndicatorProps {
  /** Last 3 test attempts for traffic lights (most recent first) */
  testHistory: TestAttempt[];
  /** Historical score stats */
  scoreStats: WordScoreStats;
  /** Word learning status */
  wordStatus?: "not-started" | "learning" | "learned" | "mastered";
  /** Size variant */
  size?: "sm" | "md";
  /** Show popover on hover */
  showPopover?: boolean;
}

export function ScoreIndicator({
  testHistory,
  scoreStats,
  wordStatus,
  size = "md",
  showPopover = true,
}: ScoreIndicatorProps) {
  const { t, tt } = useText();
  const wordScorePercent = scoreStats.scorePercent;

  // If never tested, show dash
  if (scoreStats.timesTested === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  // Show stars when all 3 traffic lights are green (last 3 attempts all full marks)
  const showStars =
    testHistory.length >= 3 &&
    testHistory.slice(0, 3).every((a) => a.pointsEarned >= a.maxPoints);

  const content = (
    <div className="flex items-center gap-2">
      {/* Traffic lights (last 3 test attempts) */}
      <div className="flex items-center gap-1">
        {[2, 1, 0].map((i) => {
          const attempt = testHistory[i];
          // Green = full points, Orange = partial, Red = 0 points, Gray = no attempt
          let bgColor = "bg-gray-300"; // No attempt
          if (attempt) {
            if (attempt.pointsEarned >= attempt.maxPoints) {
              bgColor = "bg-success";
            } else if (attempt.pointsEarned > 0) {
              bgColor = "bg-warning";
            } else {
              bgColor = "bg-destructive";
            }
          }
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center rounded-full",
                size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3",
                bgColor
              )}
            >
              {showStars && (
                <Star className={cn(
                  "fill-white text-white",
                  size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Score percentage */}
      <span className={cn(
        "text-foreground",
        size === "sm" ? "text-small-medium" : "text-regular-semibold"
      )}>
        {wordScorePercent}%
      </span>
    </div>
  );

  if (!showPopover) {
    return content;
  }

  return (
    <Popover
      position="above"
      align="left"
      className="flex items-center cursor-default"
      content={
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">{t("pop_score_history")}</span>
          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            <span>
              {tt("pop_score_breakdown", {
                pts: scoreStats.totalPointsEarned,
                total: scoreStats.totalMaxPoints,
                pct: scoreStats.totalMaxPoints > 0
                  ? ((scoreStats.totalPointsEarned / scoreStats.totalMaxPoints) * 100).toFixed(1)
                  : "0.0",
              })}
            </span>
            <span>{tt("pop_times_tested", { count: scoreStats.timesTested })}</span>
          </div>
        </div>
      }
    >
      {content}
    </Popover>
  );
}
