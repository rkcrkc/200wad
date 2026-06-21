"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { formatNumber } from "@/lib/utils/helpers";

import type { PricingPlan } from "@/types/database";

interface UnlockBundlePromoProps {
  languageName: string;
  courseCount: number;
  totalWords: number;
  plans?: PricingPlan[];
}

function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function UnlockBundlePromo({
  languageName,
  courseCount,
  totalWords,
  plans = [],
}: UnlockBundlePromoProps) {
  const [pricingMode, setPricingMode] = useState<"subscription" | "lifetime">(
    "subscription"
  );

  // Calculate lowest monthly equivalent (from annual or monthly plans)
  const languagePlans = plans.filter((p) => p.tier === "language");
  const monthlyPlan = languagePlans.find((p) => p.billing_model === "monthly");
  const annualPlan = languagePlans.find((p) => p.billing_model === "annual");
  const lifetimePlan = languagePlans.find((p) => p.billing_model === "lifetime");

  const lowestMonthly = annualPlan
    ? Math.round(annualPlan.amount_cents / 12)
    : monthlyPlan?.amount_cents ?? null;

  const savingsPercent = monthlyPlan && annualPlan
    ? Math.round(((monthlyPlan.amount_cents * 12 - annualPlan.amount_cents) / (monthlyPlan.amount_cents * 12)) * 100)
    : null;

  return (
    <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-center justify-between gap-6">
        <div className="flex-1">
          {/* Bundle Label */}
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <span className="text-sm font-medium text-amber-700">
              Complete Bundle
            </span>
          </div>

          {/* Heading */}
          <h2 className="mb-2 text-2xl text-foreground">
            Unlock all {languageName} courses
          </h2>

          {/* Description */}
          <p className="mb-4 text-muted-foreground">
            Get access to all {formatNumber(courseCount)} courses with {formatNumber(totalWords)} words
            total.{savingsPercent ? ` Save up to ${savingsPercent}% with annual billing.` : ""}
          </p>

          {/* Pricing Toggle */}
          <div className="mb-4 flex items-center gap-4">
            <div className="flex gap-1 rounded-lg border border-amber-200 bg-white p-1">
              <button
                onClick={() => setPricingMode("subscription")}
                className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  pricingMode === "subscription"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-amber-50"
                }`}
              >
                Subscription
              </button>
              <button
                onClick={() => setPricingMode("lifetime")}
                className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  pricingMode === "lifetime"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-amber-50"
                }`}
              >
                Lifetime
              </button>
            </div>
          </div>
        </div>

        {/* Pricing and CTA */}
        <div className="flex-shrink-0 text-center">
          {pricingMode === "subscription" ? (
            <>
              <div className="mb-1 text-sm text-muted-foreground">from</div>
              <div className="mb-1 text-5xl font-bold text-foreground">
                {lowestMonthly ? formatPrice(lowestMonthly) : "$10.75"}
              </div>
              <div className="mb-4 text-sm text-muted-foreground">/month</div>
            </>
          ) : (
            <>
              <div className="mb-1 text-5xl font-bold text-foreground">
                {lifetimePlan ? formatPrice(lifetimePlan.amount_cents) : "$120"}
              </div>
              <div className="mb-4 text-sm text-muted-foreground">one-time payment</div>
            </>
          )}
          <Link
            href="/account/subscriptions"
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-white shadow-sm transition-all hover:bg-primary/90"
          >
            View Bundle Plans
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
