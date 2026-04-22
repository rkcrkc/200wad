import { createClient } from "@/lib/supabase/server";
import { getDefaultFreeLessons } from "@/lib/utils/accessControl";

export interface SubscriptionDisplayInfo {
  freeLessons: number;
  lowestMonthlyPriceCents: number | null;
  lowestLifetimePriceCents: number | null;
  maxAnnualSavingsPercent: number | null;
}

/**
 * Fetch display-ready subscription info for sidebar/promo components.
 */
export async function getSubscriptionDisplayInfo(): Promise<SubscriptionDisplayInfo> {
  const supabase = await createClient();

  const [freeLessons, plansResult] = await Promise.all([
    getDefaultFreeLessons(),
    supabase
      .from("pricing_plans")
      .select("tier, billing_model, amount_cents")
      .eq("is_active", true)
      .order("amount_cents"),
  ]);

  const plans = plansResult.data || [];

  // Lowest monthly equivalent price (annual price / 12 is counted as monthly)
  let lowestMonthly: number | null = null;
  for (const plan of plans) {
    let monthlyEquiv: number;
    if (plan.billing_model === "monthly") {
      monthlyEquiv = plan.amount_cents;
    } else if (plan.billing_model === "annual") {
      monthlyEquiv = Math.round(plan.amount_cents / 12);
    } else {
      continue; // skip lifetime for monthly comparison
    }
    if (lowestMonthly === null || monthlyEquiv < lowestMonthly) {
      lowestMonthly = monthlyEquiv;
    }
  }

  // Lowest lifetime price
  const lifetimePlans = plans.filter((p) => p.billing_model === "lifetime");
  const lowestLifetime = lifetimePlans.length > 0
    ? Math.min(...lifetimePlans.map((p) => p.amount_cents))
    : null;

  // Max annual savings %
  let maxSavings: number | null = null;
  const tiers = [...new Set(plans.map((p) => p.tier))];
  for (const tier of tiers) {
    const monthly = plans.find((p) => p.tier === tier && p.billing_model === "monthly");
    const annual = plans.find((p) => p.tier === tier && p.billing_model === "annual");
    if (monthly && annual) {
      const yearlyAtMonthly = monthly.amount_cents * 12;
      const savings = Math.round(
        ((yearlyAtMonthly - annual.amount_cents) / yearlyAtMonthly) * 100
      );
      if (maxSavings === null || savings > maxSavings) {
        maxSavings = savings;
      }
    }
  }

  return {
    freeLessons,
    lowestMonthlyPriceCents: lowestMonthly,
    lowestLifetimePriceCents: lowestLifetime,
    maxAnnualSavingsPercent: maxSavings,
  };
}
