"use client";

import { AllLanguagesUpsellCard } from "@/components/ui/AllLanguagesUpsellCard";
import type { PricingPlan } from "@/types/database";
import { formatPrice } from "./planCopy";

interface AllLanguagesCalloutProps {
  plans: PricingPlan[];
  languageNames: string[];
  onUpgrade: () => void;
}

/** "Italian, French, Spanish & German" */
function joinLanguageNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/**
 * "Unlock all languages" banner shown above the subscription card on the free
 * and individual-language plans. The button opens the frequency modal (the
 * caller decides the all-languages target).
 */
export function AllLanguagesCallout({
  plans,
  languageNames,
  onUpgrade,
}: AllLanguagesCalloutProps) {
  const allLangsPlans = plans.filter((p) => p.tier === "all-languages");
  if (allLangsPlans.length === 0) return null;

  // Headline the cheapest monthly-equivalent: monthly as-is, else annual/12.
  const monthly = allLangsPlans.find((p) => p.billing_model === "monthly");
  const annual = allLangsPlans.find((p) => p.billing_model === "annual");
  const monthlyCents = monthly
    ? monthly.amount_cents
    : annual
      ? Math.round(annual.amount_cents / 12)
      : null;

  return (
    <AllLanguagesUpsellCard
      description={
        <>
          Get access to every language ({joinLanguageNames(languageNames)})
          {monthlyCents !== null && (
            <>
              {" "}from{" "}
              <span className="font-semibold text-white">
                {formatPrice(monthlyCents)} per month
              </span>
            </>
          )}
        </>
      }
      buttonLabel="Upgrade plan"
      onButtonClick={onUpgrade}
    />
  );
}
