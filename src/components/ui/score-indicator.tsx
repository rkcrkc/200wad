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
  testHistory: testHistoryProp,
  scoreStats: scoreStatsProp,
  wordStatus,
  size = "md",
  showPopover = true,
}: ScoreIndicatorProps) {
  const { t, tt } = useText();

  let testHistory = testHistoryProp;
  let scoreStats = scoreStatsProp;

  // DEV-only preview: ?previewStreak=N forces a fake N-long correct streak
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    const previewStreak = Number(
      new URLSearchParams(window.location.search).get("previewStreak"),
    );
    if (Number.isFinite(previewStreak) && previewStreak > 0) {
      testHistory = Array.from({ length: previewStreak }, () => ({
        pointsEarned: 3,
        maxPoints: 3,
      }));
      scoreStats = {
        ...scoreStats,
        totalPointsEarned: previewStreak * 3,
        totalMaxPoints: previewStreak * 3,
        scorePercent: 100,
        timesTested: previewStreak,
      };
    }
  }

  const wordScorePercent = scoreStats.scorePercent;

  // If never tested, show 3 grey traffic lights
  if (scoreStats.timesTested === 0) {
    return (
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-full bg-gray-300",
              size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"
            )}
          />
        ))}
      </div>
    );
  }

  // Compute leading correct streak: consecutive full-mark attempts from most recent
  let leadingStreak = 0;
  for (const a of testHistory) {
    if (a.pointsEarned >= a.maxPoints) leadingStreak++;
    else break;
  }

  // Stack dots when streak exceeds 3, capped at 6 visible dots
  const STACK_CAP = 6;
  const isStacked = leadingStreak > 3;
  const visibleDots = isStacked ? Math.min(leadingStreak, STACK_CAP) : 3;

  // Show stars when leading streak is at least 3 (covers existing 3-green case + stacked)
  const showStars = leadingStreak >= 3;

  // Geometry: keep total wrap width fixed at the original 3-dot width
  const dotPx = size === "sm" ? 10 : 12;
  const baseGapPx = 4; // matches gap-1
  const wrapWidthPx = 3 * dotPx + 2 * baseGapPx;
  const stackGapPx = isStacked
    ? (wrapWidthPx - visibleDots * dotPx) / (visibleDots - 1)
    : baseGapPx;

  const content = (
    <div className="flex items-center gap-2">
      {/* Traffic lights — last 3 attempts, or stacked streak when streak > 3 */}
      <div
        className="flex items-center"
        style={{ width: `${wrapWidthPx}px` }}
      >
        {Array.from({ length: visibleDots }).map((_, i) => {
          // Stacked dots are all part of the leading streak → all full marks
          let bgColor: string;
          if (isStacked) {
            bgColor = "bg-success";
          } else {
            const attempt = testHistory[i];
            // Green = full points, Orange = partial, Red = 0 points, Gray = no attempt
            bgColor = "bg-gray-300";
            if (attempt) {
              if (attempt.pointsEarned >= attempt.maxPoints) {
                bgColor = "bg-success";
              } else if (attempt.pointsEarned > 0) {
                bgColor = "bg-warning";
              } else {
                bgColor = "bg-destructive";
              }
            }
          }
          return (
            <div
              key={i}
              className={cn(
                "relative flex items-center justify-center rounded-full",
                size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3",
                bgColor
              )}
              style={{
                marginLeft: i === 0 ? 0 : `${stackGapPx}px`,
                zIndex: isStacked ? visibleDots - i : undefined,
                boxShadow: isStacked ? "0 0 0 1px white" : undefined,
              }}
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
            {leadingStreak >= 3 && (
              <span>{tt("pop_streak", { count: leadingStreak })}</span>
            )}
          </div>
        </div>
      }
    >
      {content}
    </Popover>
  );
}
