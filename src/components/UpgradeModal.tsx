"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, X, ArrowRight, ChevronRight, Sparkles, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SubBadge } from "@/components/ui/sub-badge";
import { createDirectCheckout } from "@/lib/mutations/checkout";
import type { PricingPlan } from "@/types/database";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonTitle?: string;
  languageName?: string;
  languageFlag?: string;
  languageId?: string;
  plans: PricingPlan[];
  enabledTiers: string[];
  originLessonId?: string;
  freeLessons?: number;
}

type BillingModel = "monthly" | "annual" | "lifetime";

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

function calculateSavings(monthly: PricingPlan, annual: PricingPlan): number {
  const yearlyAtMonthly = monthly.amount_cents * 12;
  return Math.round(
    ((yearlyAtMonthly - annual.amount_cents) / yearlyAtMonthly) * 100
  );
}

function getFreeFeatures(freeLessons: number) {
  return [
    `First ${freeLessons} lessons per language`,
    "Limited study & test sessions",
    "Basic progress tracking",
  ];
}

const LANGUAGE_FEATURES = [
  "All lessons for this language",
  "Unlimited study & test sessions",
  "Progress tracking & statistics",
];

const ALL_LANGUAGES_FEATURES = [
  "Every language, current & future",
  "Unlimited study & test sessions",
  "Progress tracking & statistics",
  "Best value for multi-language learners",
];

interface PricingCardProps {
  title: string;
  icon: React.ReactNode;
  tier: string;
  plans: PricingPlan[];
  billingModel: BillingModel;
  features: string[];
  badge?: string;
}

function PricingCard({ title, icon, tier, plans, billingModel, features, badge }: PricingCardProps) {
  const plan = getPlanByTierAndModel(plans, tier, billingModel);
  const monthly = getPlanByTierAndModel(plans, tier, "monthly");

  if (!plan) return null;

  const isAnnual = billingModel === "annual" && monthly;
  const displayPrice = isAnnual
    ? formatPrice(Math.round(plan.amount_cents / 12))
    : formatPrice(plan.amount_cents);
  const displaySuffix = billingModel === "lifetime" ? " one-time" : "/mo";

  return (
    <div className="rounded-t-xl border-x border-t border-amber-300 bg-amber-50/50 overflow-hidden">
      {/* Header section with title + price */}
      <div className="border-b border-amber-200 bg-amber-100/60 px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <span className="text-xl-semibold">{title}</span>
          </div>
          {badge && (
            <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-large-semibold font-bold">{displayPrice}</span>
          <span className="text-sm text-muted-foreground">{displaySuffix}</span>
          {isAnnual && (
            <span className="ml-2 text-sm font-medium text-green-600">
              Save {calculateSavings(monthly, plan)}%
            </span>
          )}
        </div>
        {isAnnual && (
          <p className="mt-1 text-xs text-muted-foreground">
            {formatPrice(plan.amount_cents)} billed annually
          </p>
        )}
      </div>

      {/* Features */}
      <div className="px-5 py-4">
        <ul className="space-y-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FreePlanCard({ freeLessons = 10 }: { freeLessons?: number }) {
  const features = getFreeFeatures(freeLessons);
  return (
    <div className="rounded-t-xl border-x border-t border-border bg-white overflow-hidden">
      {/* Header section */}
      <div className="border-b border-border bg-bone px-5 py-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <span className="text-xl-semibold">Free</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-large-semibold font-bold">$0</span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>
      </div>

      {/* Features */}
      <div className="px-5 py-4">
        <ul className="space-y-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const BILLING_OPTIONS: { value: BillingModel; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
  { value: "lifetime", label: "Lifetime" },
];

/**
 * Compute the max savings % across all tiers for the annual billing model.
 */
function getAnnualSavings(plans: PricingPlan[]): number | null {
  let maxSavings = 0;
  const tiers = [...new Set(plans.map((p) => p.tier))];
  for (const tier of tiers) {
    const monthly = plans.find((p) => p.tier === tier && p.billing_model === "monthly");
    const annual = plans.find((p) => p.tier === tier && p.billing_model === "annual");
    if (monthly && annual) {
      const savings = calculateSavings(monthly, annual);
      if (savings > maxSavings) maxSavings = savings;
    }
  }
  return maxSavings > 0 ? maxSavings : null;
}

export function UpgradeModal({
  isOpen,
  onClose,
  lessonTitle,
  languageName,
  languageFlag,
  languageId,
  plans,
  enabledTiers,
  originLessonId,
  freeLessons,
}: UpgradeModalProps) {
  const [billingModel, setBillingModel] = useState<BillingModel>("annual");
  const [checkoutTier, setCheckoutTier] = useState<"language" | "all-languages" | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async (tier: "language" | "all-languages") => {
    setCheckoutTier(tier);
    setCheckoutError(null);

    const result = await createDirectCheckout({
      tier,
      billingModel,
      languageId: tier === "language" ? (languageId ?? null) : null,
      languageName: tier === "language" ? (languageName ?? null) : null,
      originLessonId,
      cancelUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/account/subscriptions`,
    });

    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      setCheckoutError(result.error || "Something went wrong. Please try again.");
      setCheckoutTier(null);
    }
  };

  const showLanguageTier =
    enabledTiers.includes("language") && languageId;
  const showAllLanguagesTier = enabledTiers.includes("all-languages");

  // Only show billing options that have at least one plan
  const availableOptions = BILLING_OPTIONS.filter((opt) =>
    plans.some((p) => p.billing_model === opt.value)
  );

  const annualSavings = getAnnualSavings(plans);

  // Grid columns: always free + however many paid tiers
  const paidCardCount = (showLanguageTier ? 1 : 0) + (showAllLanguagesTier ? 1 : 0);
  const totalCards = 1 + paidCardCount;
  const gridCols =
    totalCards === 3
      ? "sm:grid-cols-3"
      : totalCards === 2
        ? "sm:grid-cols-2"
        : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-6xl h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl flex flex-col">
        {/* Fixed top bar */}
        <div className="shrink-0 flex items-center justify-between bg-bone px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/account/subscriptions" onClick={onClose}>
              Manage Subscriptions
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* Header section with beige background */}
          <div className="shrink-0 bg-bone px-6 pb-6">
            {/* Lock icon */}
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>

            {/* Heading */}
            <div className="text-center">
              <h2 className="text-xl-semibold mb-2">
                {lessonTitle ? "Upgrade to Unlock" : "Choose a Plan"}
              </h2>
              <p className="text-regular text-muted-foreground">
                {lessonTitle
                  ? `"${lessonTitle}" requires a subscription to access.`
                  : "Subscribe to unlock all lessons and features."}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1 flex-col px-6 pt-6">
            {/* Billing toggle */}
            {availableOptions.length > 1 && (
              <div className="mb-5 flex justify-center">
                <div className="inline-flex items-center rounded-lg bg-bone p-1">
                  {availableOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setBillingModel(opt.value)}
                      className={cn(
                        "relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                        billingModel === opt.value
                          ? "bg-white text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt.label}
                      {opt.value === "annual" && (
                        <SubBadge className="ml-1.5 bg-green-100 px-1.5 text-green-700">
                          Best value
                        </SubBadge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing cards */}
            <div className={cn("grid flex-1 grid-cols-1 gap-4", gridCols)}>
              <FreePlanCard freeLessons={freeLessons} />
              {showLanguageTier && (
                <PricingCard
                  title={languageName || "Language"}
                  icon={languageFlag || "🌐"}
                  tier="language"
                  plans={plans}
                  billingModel={billingModel}
                  features={LANGUAGE_FEATURES}
                />
              )}
              {showAllLanguagesTier && (
                <PricingCard
                  title="All Languages"
                  icon={<Sparkles className="h-5 w-5 text-amber-500" />}
                  tier="all-languages"
                  plans={plans}
                  billingModel={billingModel}
                  features={ALL_LANGUAGES_FEATURES}
                  badge="Best value"
                />
              )}
            </div>
          </div>
        </div>

        {/* Fixed footer with CTAs styled as card bottoms */}
        <div className="shrink-0 px-6 pb-6">
          {checkoutError && (
            <p className="mb-3 text-center text-sm text-destructive">{checkoutError}</p>
          )}
          <div className={cn("grid grid-cols-1 gap-4", gridCols)}>
            <div className="rounded-b-xl border-x border-b border-border border-t border-t-border bg-white px-5 py-4">
              <Button variant="outline" className="w-full" size="xl" disabled>
                Current Plan
              </Button>
            </div>
            {showLanguageTier && (
              <div className="rounded-b-xl border-x border-b border-amber-300 border-t border-t-amber-200 bg-amber-50/50 px-5 py-4">
                <Button
                  className="w-full"
                  size="xl"
                  disabled={checkoutTier !== null}
                  onClick={() => handleCheckout("language")}
                >
                  {checkoutTier === "language" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Subscribe
                  {checkoutTier !== "language" && (
                    <ChevronRight className="ml-1 h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
            {showAllLanguagesTier && (
              <div className="rounded-b-xl border-x border-b border-amber-300 border-t border-t-amber-200 bg-amber-50/50 px-5 py-4">
                <Button
                  className="w-full"
                  size="xl"
                  disabled={checkoutTier !== null}
                  onClick={() => handleCheckout("all-languages")}
                >
                  {checkoutTier === "all-languages" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Subscribe
                  {checkoutTier !== "all-languages" && (
                    <ChevronRight className="ml-1 h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
