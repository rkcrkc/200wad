"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubBadge } from "@/components/ui/sub-badge";
import { useText } from "@/context/TextContext";
import { recoverStreakAction } from "@/lib/mutations/streak";
import type { StreakRecoverState, StreakSummary } from "@/lib/queries/streaks";
import { cn } from "@/lib/utils";

interface StreakStatusBannerProps {
  summary: StreakSummary;
  recover: StreakRecoverState;
}

type MotivateState = "lapsed" | "alive_no_today" | "alive_today";

/** Session key for the last-dismissed callout status signature. */
const DISMISS_STORAGE_KEY = "streakCalloutDismissed";

function dayLabel(n: number) {
  return n === 1 ? "day" : "days";
}

/**
 * Single streak status callout that houses all motivational messaging for
 * the /streak page. Priority:
 *
 *  1. Recover (broken streak, 1-3 days missed) — orange warning with a
 *     coin-cost CTA + confirm dialog. Copy from the `streak_recover_*` keys.
 *  2. Otherwise an encouraging message keyed off the live streak state
 *     (lapsed / alive-no-activity-today / alive-studied-today) with a CTA
 *     into /schedule. Copy from the `streak_msg_*` / `streak_cta_*` keys.
 *
 * Each render has a "status signature" (e.g. `recover-2`, `alive_today-5`).
 * Dismissing the card stores that signature in sessionStorage, so the card
 * stays hidden only while the status is unchanged — it reappears as soon as
 * the streak status changes. Renders null for guests / users with no streak
 * history. All copy is admin-editable.
 */
export function StreakStatusBanner({
  summary,
  recover,
}: StreakStatusBannerProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const { tt } = useText();

  // Read the previously-dismissed signature after mount to avoid a hydration
  // mismatch (server always renders the card visible).
  useEffect(() => {
    setDismissedKey(sessionStorage.getItem(DISMISS_STORAGE_KEY));
  }, []);

  const handleDismiss = (statusKey: string) => {
    sessionStorage.setItem(DISMISS_STORAGE_KEY, statusKey);
    setDismissedKey(statusKey);
  };

  const { daysMissed, coinCost, canAfford, streakAtRisk } = recover;
  const recoverStreakWord = dayLabel(streakAtRisk);

  const handleConfirm = () => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await recoverStreakAction(daysMissed);
      if (!result.success) {
        setSubmitError(result.error ?? "Could not recover streak. Try again.");
        return;
      }
      setShowConfirm(false);
    });
  };

  // ----- Recover (broken streak) variant — takes priority -----------------
  if (recover.eligible) {
    const statusKey = `recover-${daysMissed}`;
    if (dismissedKey === statusKey) return null;

    return (
      <>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle
                className="h-5 w-5 text-amber-600"
                strokeWidth={1.67}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-medium-semibold text-foreground">
                {tt("streak_recover_heading", {
                  streak: streakAtRisk,
                  streakWord: recoverStreakWord,
                })}
              </p>
              <p className="mt-1 text-[14px] font-medium leading-[1.4] text-muted-foreground">
                {tt(
                  canAfford
                    ? "streak_recover_body_affordable"
                    : "streak_recover_body_unaffordable",
                  {
                    days: daysMissed,
                    dayWord: dayLabel(daysMissed),
                    coins: coinCost,
                  }
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={!canAfford}
              >
                {tt("streak_recover_button", {})}
              </Button>
              <button
                onClick={() => handleDismiss(statusKey)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => !isPending && setShowConfirm(false)}
              aria-hidden="true"
            />

            <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-border bg-bone px-5 py-4">
                <div className="flex items-center gap-2">
                  <Flame
                    className="h-5 w-5 text-orange-500"
                    strokeWidth={1.67}
                  />
                  <span className="text-medium-semibold">
                    {tt("streak_recover_dialog_title", {})}
                  </span>
                </div>
                <button
                  onClick={() => !isPending && setShowConfirm(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground"
                  aria-label="Close"
                  disabled={isPending}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5 py-5">
                <p className="text-[15px] leading-[1.45] text-foreground">
                  {tt("streak_recover_dialog_body", {
                    coins: coinCost,
                    days: daysMissed,
                    dayWord: dayLabel(daysMissed),
                    streak: streakAtRisk,
                    streakWord: recoverStreakWord,
                  })}
                </p>
                <p className="mt-3 text-[13px] leading-[1.45] text-muted-foreground">
                  {tt("streak_recover_dialog_note", {})}
                </p>

                {submitError && (
                  <p className="mt-4 text-sm text-destructive">{submitError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowConfirm(false)}
                  disabled={isPending}
                >
                  {tt("streak_recover_dialog_cancel", {})}
                </Button>
                <Button onClick={handleConfirm} disabled={isPending}>
                  {isPending
                    ? "Recovering…"
                    : tt("streak_recover_dialog_confirm", { coins: coinCost })}
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ----- Encouraging messaging variant ------------------------------------
  const {
    currentStreak,
    longestStreak,
    daysSinceLastActivity,
    nextActivityKind,
  } = summary;

  let state: MotivateState | null = null;
  if (
    currentStreak === 0 &&
    daysSinceLastActivity !== null &&
    daysSinceLastActivity >= 1
  ) {
    state = "lapsed";
  } else if (currentStreak > 0 && daysSinceLastActivity !== null) {
    state = daysSinceLastActivity === 0 ? "alive_today" : "alive_no_today";
  }

  if (!state) return null;

  const statusKey = `${state}-${currentStreak}-${daysSinceLastActivity}`;
  if (dismissedKey === statusKey) return null;

  const lapseDays = daysSinceLastActivity ?? 0;
  const streakWord = dayLabel(currentStreak);

  let messageText: string;
  let ctaText: string;
  if (state === "lapsed") {
    messageText = tt("streak_msg_lapsed", {
      days: lapseDays,
      dayWord: dayLabel(lapseDays),
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
  } else {
    messageText = tt("streak_msg_alive_today", {
      streak: currentStreak,
      streakWord,
    });
    ctaText = tt("streak_cta_alive_today", { kind: nextActivityKind });
  }

  const isPersonalBest = currentStreak > 0 && currentStreak >= longestStreak;

  return (
    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
        <Flame className="h-5 w-5 text-amber-600" strokeWidth={1.67} />
      </div>
      <div className="min-w-0 flex-1">
        {isPersonalBest && (
          <SubBadge className="mb-1 bg-amber-100 text-amber-600">
            {tt("streak_personal_best_badge", {})}
          </SubBadge>
        )}
        <p className="text-[15px] font-medium leading-[1.45] text-foreground">
          {messageText}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button asChild size="sm">
          <Link href="/schedule">
            {ctaText}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <button
          onClick={() => handleDismiss(statusKey)}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
