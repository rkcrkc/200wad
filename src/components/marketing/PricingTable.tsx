import { getActivePricingPlans } from "@/lib/queries/subscriptions";
import { formatPrice } from "@/components/subscriptions/planCopy";
import type { PricingPlan } from "@/types/database";
import {
  PricingTableClient,
  type Billing,
  type PriceDisplay,
  type PricingTier,
} from "./PricingTableClient";

/** Curated marketing copy per paid tier, merged with live CMS prices below. */
const TIER_META: Record<
  "language" | "all-languages",
  { name: string; blurb: string; cta: string; features: string[]; featured?: boolean }
> = {
  language: {
    name: "Single Language",
    blurb: "Go deep on one language.",
    cta: "Choose plan",
    features: [
      "Every course in one language",
      "Memory triggers, audio & testing",
      "Streaks, leagues & achievements",
      "Progress tracking & mastery",
    ],
  },
  "all-languages": {
    name: "All Languages",
    blurb: "French, Spanish, German & Italian.",
    featured: true,
    cta: "Choose plan",
    features: [
      "Everything in Single Language",
      "All four languages unlocked",
      "Switch languages anytime",
      "Best value for polyglots",
    ],
  },
};

const FREE_TIER: PricingTier = {
  name: "Free",
  blurb: "Get started, no card.",
  price: { amount: "$0", suffix: "", sub: "Free forever" },
  cta: "Start free",
  features: [
    "First 10 lessons of any course",
    "No credit card required",
    "Guest mode — start without an account",
    "Works alongside your other apps",
  ],
};

/** Build the three billing prices for a tier from its live CMS plans. */
function buildPrices(plans: PricingPlan[]): Record<Billing, PriceDisplay> | null {
  const byModel = new Map(plans.map((p) => [p.billing_model, p]));
  const monthly = byModel.get("monthly");
  const annual = byModel.get("annual");
  const lifetime = byModel.get("lifetime");
  if (!monthly || !annual || !lifetime) return null;

  return {
    monthly: { amount: formatPrice(monthly.amount_cents), suffix: "/mo" },
    // Annual headlines the monthly-equivalent, with the billed total beneath.
    annual: {
      amount: formatPrice(Math.round(annual.amount_cents / 12)),
      suffix: "/mo",
      sub: `billed ${formatPrice(annual.amount_cents)}/year`,
    },
    lifetime: {
      amount: formatPrice(lifetime.amount_cents),
      suffix: "once",
      sub: "pay once, keep forever",
    },
  };
}

export async function PricingTable() {
  const { plans } = await getActivePricingPlans();

  const tiers: PricingTier[] = [FREE_TIER];
  for (const key of ["language", "all-languages"] as const) {
    const prices = buildPrices(plans.filter((p) => p.tier === key));
    if (!prices) continue;
    tiers.push({ ...TIER_META[key], price: prices });
  }

  return <PricingTableClient tiers={tiers} />;
}
