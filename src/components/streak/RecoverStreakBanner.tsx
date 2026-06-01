"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Coins, Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recoverStreakAction } from "@/lib/mutations/streak";
import type { StreakRecoverState } from "@/lib/queries/streaks";

interface RecoverStreakBannerProps {
  recover: StreakRecoverState;
}

function dayLabel(n: number) {
  return n === 1 ? "day" : "days";
}

/**
 * Renders the "Your streak is at risk" banner above the heatmap when the
 * user has a 1-3 day gap and their current_streak is still > 0. Two visual
 * variants:
 *
 *  - Affordable: full-colour CTA, click → confirm dialog → server action.
 *  - Unaffordable: muted/disabled CTA with a "earn N more" hint.
 *
 * Returns null when the recover state is not eligible — the server already
 * decides eligibility in `getStreakPageData`.
 */
export function RecoverStreakBanner({ recover }: RecoverStreakBannerProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!recover.eligible) return null;

  const { daysMissed, coinCost, canAfford, streakAtRisk } = recover;

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

  return (
    <>
      <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
            <AlertTriangle
              className="h-5 w-5 text-orange-500"
              strokeWidth={1.67}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-medium-semibold text-foreground">
              Your {streakAtRisk}-day streak is at risk
            </p>
            <p className="mt-1 text-[14px] leading-[1.4] text-muted-foreground">
              You&apos;ve missed {daysMissed} {dayLabel(daysMissed)}.{" "}
              {canAfford ? (
                <>
                  Spend{" "}
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <Coins
                      className="h-3.5 w-3.5 text-amber-500"
                      strokeWidth={1.67}
                    />
                    {coinCost}
                  </span>{" "}
                  to restore it.
                </>
              ) : (
                <>
                  Recovery costs{" "}
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <Coins
                      className="h-3.5 w-3.5 text-amber-500"
                      strokeWidth={1.67}
                    />
                    {coinCost}
                  </span>{" "}
                  — earn more coins to restore.
                </>
              )}
            </p>
          </div>
          <div className="shrink-0">
            <Button
              size="sm"
              onClick={() => setShowConfirm(true)}
              disabled={!canAfford}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              Recover streak
            </Button>
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
                <span className="text-medium-semibold">Recover streak</span>
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
                Spend{" "}
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Coins
                    className="h-4 w-4 text-amber-500"
                    strokeWidth={1.67}
                  />
                  {coinCost} coins
                </span>{" "}
                to bridge the {daysMissed} missed{" "}
                {dayLabel(daysMissed)} and keep your{" "}
                <span className="font-semibold">
                  {streakAtRisk}-day streak
                </span>{" "}
                alive.
              </p>
              <p className="mt-3 text-[13px] leading-[1.45] text-muted-foreground">
                Your streak will continue from today as if you hadn&apos;t
                missed a day.
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
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isPending}
                className="bg-orange-500 text-white hover:bg-orange-600"
              >
                {isPending ? "Recovering…" : `Spend ${coinCost} coins`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
