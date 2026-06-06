"use client";

import Link from "next/link";
import { ArrowRight, Calendar, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubBadge } from "@/components/ui/sub-badge";
import { useText } from "@/context/TextContext";
import type { StreakSummary } from "@/lib/queries/streaks";
import { FreezeToggleCard } from "./FreezeToggleCard";

interface StreakHeaderProps {
  summary: StreakSummary;
}

type StreakState = "lapsed" | "alive_no_today" | "alive_today";

/**
 * Top-of-page card for `/streak`. Mirrors `TrophiesHeader`: h1 + subtitle +
 * a responsive grid of stat cards with the value rendered in
 * `text-xl-semibold text-foreground`.
 *
 * Beneath the "N days" number on the current-streak card the user sees one
 * of three admin-editable messages (see `streak_msg_*` / `streak_cta_*` in
 * `src/lib/text.ts`):
 *   • lapsed         — streak is dead, push them to the next scheduled item.
 *   • alive_no_today — streak alive but they haven't studied today yet.
 *   • alive_today    — streak alive and already studied today.
 */
export function StreakHeader({ summary }: StreakHeaderProps) {
  const {
    currentStreak,
    longestStreak,
    freezesAvailable,
    freezeAuto,
    daysSinceLastActivity,
    nextActivityKind,
    leaderboard,
  } = summary;
  const { tt } = useText();

  const isPersonalBest = currentStreak > 0 && currentStreak >= longestStreak;

  // Determine which messaging state applies.
  let state: StreakState | null = null;
  if (currentStreak === 0 && daysSinceLastActivity !== null && daysSinceLastActivity >= 1) {
    state = "lapsed";
  } else if (currentStreak > 0 && daysSinceLastActivity !== null) {
    state = daysSinceLastActivity === 0 ? "alive_today" : "alive_no_today";
  }

  const lapseDays = daysSinceLastActivity ?? 0;
  const dayWord = lapseDays === 1 ? "day" : "days";
  const streakWord = currentStreak === 1 ? "day" : "days";

  let messageText: string | null = null;
  let ctaText: string | null = null;
  if (state === "lapsed") {
    messageText = tt("streak_msg_lapsed", {
      days: lapseDays,
      dayWord,
      kind: nextActivityKind,
    });
    ctaText = tt("streak_cta_lapsed", { kind: nextActivityKind });
  } else if (state === "alive_no_today") {
    messageText = tt("streak_msg_alive_no_today", {
      streak: currentStreak,
      streakWord,
      kind: nextActivityKind,
    });
    ctaText = tt("streak_cta_alive_no_today", { kind: nextActivityKind });
  } else if (state === "alive_today") {
    messageText = tt("streak_msg_alive_today", {
      streak: currentStreak,
      streakWord,
    });
    ctaText = tt("streak_cta_alive_today", { kind: nextActivityKind });
  }

  // Longest-streak card: leaderboard rank + tier badge + gap to next tier.
  let lbPositionText: string | null = null;
  let lbGapText: string | null = null;
  if (leaderboard) {
    if (leaderboard.currentTier !== null) {
      lbPositionText = tt("streak_lb_position_in_tier", {
        rank: leaderboard.rank,
        total: leaderboard.totalUsers,
        currentTier: leaderboard.currentTier,
      });
    } else {
      lbPositionText = tt("streak_lb_position_untier", {
        rank: leaderboard.rank,
        total: leaderboard.totalUsers,
      });
    }
    if (leaderboard.nextTier !== null && leaderboard.daysToNextTier !== null) {
      const gapDayWord = leaderboard.daysToNextTier === 1 ? "day" : "days";
      lbGapText = tt("streak_lb_gap", {
        daysToNext: leaderboard.daysToNextTier,
        dayWord: gapDayWord,
        nextTier: leaderboard.nextTier,
      });
    }
  }

  return (
    <div className="mb-8">
      <h1 className="text-page-header text-foreground">Streaks</h1>
      <p className="mt-1 text-[15px] leading-[1.4] text-muted-foreground">
        Daily activity earns a streak. Miss a day and your freezes step in.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Current streak */}
        <div className="flex flex-col rounded-2xl bg-white p-5">
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
          {messageText && (
            <p className="mt-3 text-small-regular text-muted-foreground">
              {messageText}
            </p>
          )}
          {ctaText && (
            <div className="mt-auto pt-3">
              <Button asChild size="sm">
                <Link href="/schedule">
                  {ctaText}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Longest streak */}
        <div className="flex flex-col rounded-2xl bg-white p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" strokeWidth={1.67} />
            <span className="text-xs-medium uppercase tracking-wide">
              Longest streak
            </span>
          </div>
          <p className="mt-2 text-xl-semibold text-foreground">
            {longestStreak} {longestStreak === 1 ? "day" : "days"}
          </p>
          {lbPositionText && (
            <p className="mt-3 text-small-regular text-muted-foreground">
              {lbPositionText}
              {lbGapText && <> {lbGapText}</>}
            </p>
          )}
          {lbPositionText && (
            <div className="mt-auto pt-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/community">
                  {tt("streak_lb_button", {})}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
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
