"use client";

import { Share2, X, Check } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UpgradePlan {
  tier: "free" | "language" | "all-languages";
  name: string;
  price: string;
  cadence: string;
  bullets: string[];
  ctaLabel: string;
  highlighted?: boolean;
  current?: boolean;
}

interface FreeTierUpgradeCelebrationProps {
  courseTitle: string;
  /** Number of paid lessons that will unlock with subscription */
  unlockCount: number;
  stats: { label: string; value: string | number }[];
  plans: UpgradePlan[];
  onSubscribe: (tier: UpgradePlan["tier"]) => void;
  onContinueFree: () => void;
  onDismiss: () => void;
}

export function FreeTierUpgradeCelebration({
  courseTitle,
  unlockCount,
  stats,
  plans,
  onSubscribe,
  onContinueFree,
  onDismiss,
}: FreeTierUpgradeCelebrationProps) {
  return (
    <ModalShell maxWidth="content-lg">
      <div className="relative">
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 z-10 rounded-lg p-2 text-foreground/40 transition-colors hover:bg-black/5 hover:text-foreground/70"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Hero */}
        <div className="bg-primary/5 px-8 pb-8 pt-12 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl ring-8 ring-primary/20">
            🎉
          </div>
          <p className="mb-2 text-xs-medium uppercase tracking-wide text-foreground/60">
            {courseTitle}
          </p>
          <h2 className="text-xxl-bold text-primary">
            You&apos;ve finished your free lessons
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-regular-semibold text-foreground/70">
            Ready to keep going? Unlock the next {unlockCount} lessons.
          </p>
        </div>

        {/* Stats */}
        <div className="border-t border-border bg-white px-8 py-6">
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-bone px-4 py-3 text-center"
              >
                <p className="text-xl-semibold text-foreground">{stat.value}</p>
                <p className="mt-0.5 text-xs-medium text-foreground/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="border-t border-border bg-white px-8 py-6">
          <div className="grid gap-3 md:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.tier} plan={plan} onSubscribe={onSubscribe} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 bg-bone px-8 py-6">
          <Button
            variant="ghost"
            onClick={onContinueFree}
            className="text-foreground/60"
          >
            Continue with free plan
          </Button>
          <Button variant="ghost" className="ml-auto gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function PlanCard({
  plan,
  onSubscribe,
}: {
  plan: UpgradePlan;
  onSubscribe: (tier: UpgradePlan["tier"]) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border p-5",
        plan.highlighted
          ? "border-primary bg-primary/[0.03] ring-2 ring-primary/30"
          : "border-border bg-white",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-regular-semibold text-foreground">{plan.name}</p>
        {plan.highlighted && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
            Recommended
          </span>
        )}
      </div>
      <div className="mb-4">
        <p className="text-xxl-bold text-foreground">{plan.price}</p>
        <p className="text-xs-medium text-foreground/60">{plan.cadence}</p>
      </div>
      <ul className="mb-5 flex-1 space-y-2">
        {plan.bullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-2 text-small-regular">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      {plan.current ? (
        <Button variant="outline" disabled className="w-full">
          Current plan
        </Button>
      ) : (
        <PrimaryButton
          fullWidth
          variant={plan.highlighted ? "primary" : "outline"}
          onClick={() => onSubscribe(plan.tier)}
        >
          {plan.ctaLabel}
        </PrimaryButton>
      )}
    </div>
  );
}
