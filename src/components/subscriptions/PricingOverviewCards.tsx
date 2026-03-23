"use client";

import type { PricingPlan } from "@/types/database";

interface PricingOverviewCardsProps {
  plans: PricingPlan[];
  enabledTiers: string[];
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getPlanByTierAndModel(
  plans: PricingPlan[],
  tier: string,
  model: string
): PricingPlan | undefined {
  return plans.find((p) => p.tier === tier && p.billing_model === model);
}

export function PricingOverviewCards({
  plans,
  enabledTiers,
}: PricingOverviewCardsProps) {
  const showLanguage = enabledTiers.includes("language");
  const showAllLanguages = enabledTiers.includes("all-languages");

  if (!showLanguage && !showAllLanguages) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {showLanguage && (
        <PricingCard
          title="Language"
          description="Access all lessons for one language"
          plans={plans}
          tier="language"
        />
      )}
      {showAllLanguages && (
        <PricingCard
          title="All Languages"
          description="Unlimited access to every language"
          plans={plans}
          tier="all-languages"
          highlight
        />
      )}
    </div>
  );
}

function PricingCard({
  title,
  description,
  plans,
  tier,
  highlight = false,
}: {
  title: string;
  description: string;
  plans: PricingPlan[];
  tier: string;
  highlight?: boolean;
}) {
  const monthly = getPlanByTierAndModel(plans, tier, "monthly");
  const annual = getPlanByTierAndModel(plans, tier, "annual");
  const lifetime = getPlanByTierAndModel(plans, tier, "lifetime");

  return (
    <div
      className={`relative rounded-2xl border p-6 ${
        highlight
          ? "border-amber-300 bg-amber-50/50"
          : "border-gray-200 bg-white"
      }`}
    >
      {highlight && (
        <span className="absolute -top-3 right-4 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-semibold text-white">
          Best value
        </span>
      )}
      <h3 className="text-large-semibold mb-1">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>

      {monthly && (
        <div className="mb-1">
          <span className="text-xl-semibold">{formatPrice(monthly.amount_cents)}</span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>
      )}

      <div className="space-y-1 text-xs text-muted-foreground">
        {annual && (
          <div>
            or {formatPrice(annual.amount_cents)}/year{" "}
            {monthly && (
              <span className="text-green-600">
                (save{" "}
                {Math.round(
                  (1 - annual.amount_cents / (monthly.amount_cents * 12)) * 100
                )}
                %)
              </span>
            )}
          </div>
        )}
        {lifetime && <div>or {formatPrice(lifetime.amount_cents)} one-time</div>}
      </div>
    </div>
  );
}
