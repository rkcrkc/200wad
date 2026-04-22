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
    <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 shadow-lg">
      {/* Background decoration */}
      <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-white/10" />
      <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-8 translate-y-8 rounded-full bg-white/10" />

      <div className="relative flex items-center justify-between gap-6">
        <div className="flex-1">
          {/* Bundle Label */}
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-300" />
            <span className="text-sm font-medium text-amber-300">
              Complete Bundle
            </span>
          </div>

          {/* Heading */}
          <h2 className="mb-2 text-2xl text-white">
            Unlock all {languageName} courses
          </h2>

          {/* Description */}
          <p className="mb-4 text-blue-100">
            Get access to all {formatNumber(courseCount)} courses with {formatNumber(totalWords)} words
            total.{savingsPercent ? ` Save up to ${savingsPercent}% with annual billing.` : ""}
          </p>

          {/* Pricing Toggle */}
          <div className="mb-4 flex items-center gap-4">
            <div className="flex gap-1 rounded-lg bg-white/20 p-1 backdrop-blur-sm">
              <button
                onClick={() => setPricingMode("subscription")}
                className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  pricingMode === "subscription"
                    ? "bg-white text-blue-600 shadow-md"
                    : "text-white hover:bg-white/10"
                }`}
              >
                Subscription
              </button>
              <button
                onClick={() => setPricingMode("lifetime")}
                className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  pricingMode === "lifetime"
                    ? "bg-white text-blue-600 shadow-md"
                    : "text-white hover:bg-white/10"
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
              <div className="mb-1 text-sm text-blue-100">from</div>
              <div className="mb-1 text-5xl font-bold text-white">
                {lowestMonthly ? formatPrice(lowestMonthly) : "$10.75"}
              </div>
              <div className="mb-4 text-sm text-blue-100">/month</div>
            </>
          ) : (
            <>
              <div className="mb-1 text-5xl font-bold text-white">
                {lifetimePlan ? formatPrice(lifetimePlan.amount_cents) : "$120"}
              </div>
              <div className="mb-4 text-sm text-blue-100">one-time payment</div>
            </>
          )}
          <Link
            href="/account/subscriptions"
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-blue-600 shadow-lg transition-all hover:bg-blue-50"
          >
            View Bundle Plans
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
