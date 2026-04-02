"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { createCustomerPortalSession } from "@/lib/mutations/subscriptions";
import type { PricingPlan } from "@/types/database";
import type { UserSubscription, SubscriptionLanguage } from "@/lib/queries/subscriptions";
import type { CartItem } from "./SubscriptionsPageClient";
import { LanguageSubscriptionRow } from "./LanguageSubscriptionRow";

interface LanguageSubscriptionsListProps {
  languages: SubscriptionLanguage[];
  userLanguageIds: string[];
  subscriptions: UserSubscription[];
  plans: PricingPlan[];
  enabledTiers: string[];
  cartItems: CartItem[];
  billingToggle: string;
  showAllLanguagesRow: boolean;
  onBillingToggleChange: (value: string) => void;
  onToggleItem: (item: CartItem) => void;
  onRemoveItem: (pricingPlanId: string) => void;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getBillingSuffix(model: string): string {
  if (model === "monthly") return "/mo";
  if (model === "annual") return "/yr";
  return "";
}

function getPlanLabel(plan: string): string {
  if (plan === "monthly") return "Monthly";
  if (plan === "annual") return "Annual";
  if (plan === "lifetime") return "Lifetime";
  return plan;
}

export function LanguageSubscriptionsList({
  languages,
  userLanguageIds,
  subscriptions,
  plans,
  enabledTiers,
  cartItems,
  billingToggle,
  showAllLanguagesRow,
  onBillingToggleChange,
  onToggleItem,
  onRemoveItem,
}: LanguageSubscriptionsListProps) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [expandedLanguageIds, setExpandedLanguageIds] = useState<Set<string>>(new Set());

  const showLanguage = enabledTiers.includes("language");
  const showAllLanguages = enabledTiers.includes("all-languages");

  const billingTabs = [
    { id: "monthly", label: "Monthly" },
    { id: "annual", label: "Annual" },
    { id: "lifetime", label: "Lifetime" },
  ];

  // Split languages into enrolled and other
  const enrolledLanguages = languages.filter((lang) =>
    userLanguageIds.includes(lang.id)
  );
  const otherLanguages = languages.filter(
    (lang) => !userLanguageIds.includes(lang.id)
  );

  // Check all-languages state
  const allLangsInCart = cartItems.some((item) => item.tier === "all-languages");
  const hasAllLangsSub = subscriptions.some(
    (sub) => sub.type === "all-languages" && sub.isEffective
  );
  const allLangsPlan = plans.find(
    (p) => p.tier === "all-languages" && p.billing_model === billingToggle
  );

  // Individual language plan for current billing model
  const languagePlans = plans.filter(
    (p) => p.tier === "language" && p.billing_model === billingToggle
  );
  const languagePlan = languagePlans[0];

  // Upsell calculation
  const individualLangsInCart = cartItems.filter(
    (item) => item.tier === "language"
  );
  const showUpsell =
    individualLangsInCart.length >= 2 &&
    allLangsPlan &&
    !allLangsInCart &&
    !hasAllLangsSub;
  const individualTotal = individualLangsInCart.reduce(
    (sum, item) => sum + item.amountCents,
    0
  );

  // Find the all-languages subscription for the "Manage" link
  const allLangsSub = subscriptions.find(
    (sub) => sub.type === "all-languages" && sub.isEffective
  );

  async function handleManage() {
    setPortalLoading(true);
    try {
      const result = await createCustomerPortalSession();
      if (result.success && result.url) {
        window.location.href = result.url;
      }
    } finally {
      setPortalLoading(false);
    }
  }

  function toggleExpand(languageId: string) {
    setExpandedLanguageIds((prev) => {
      const next = new Set(prev);
      if (next.has(languageId)) {
        next.delete(languageId);
      } else {
        next.add(languageId);
      }
      return next;
    });
  }

  function renderLanguageRow(lang: SubscriptionLanguage, opts: { showSwitch: boolean }) {
    return (
      <LanguageSubscriptionRow
        key={lang.id}
        lang={lang}
        subscriptions={subscriptions}
        hasAllLangsSub={hasAllLangsSub}
        allLangsInCart={allLangsInCart}
        cartItems={cartItems}
        languagePlan={languagePlan}
        billingToggle={billingToggle}
        showSwitch={opts.showSwitch}
        isExpanded={expandedLanguageIds.has(lang.id)}
        onToggleExpand={() => toggleExpand(lang.id)}
        onToggleItem={onToggleItem}
        onRemoveItem={onRemoveItem}
        onManage={handleManage}
        portalLoading={portalLoading}
      />
    );
  }

  return (
    <section className="space-y-8">
      {/* My Languages */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-large-semibold">My Languages</h2>
          <div className="rounded-full border border-gray-200 p-1">
            <Tabs
              tabs={billingTabs}
              activeTab={billingToggle}
              onChange={onBillingToggleChange}
            />
          </div>
        </div>

        {/* Column headers */}
        <div className="grid items-center grid-cols-[1fr_160px_1fr_40px] px-6 py-3">
          <span className="text-xs-medium text-muted-foreground">Language</span>
          <span className="text-xs-medium text-muted-foreground">Current Plan</span>
          <span />
          <span />
        </div>

        <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white">
          {/* All Languages row — only when sub is active */}
          {showAllLanguagesRow && showAllLanguages && allLangsPlan && (
            <div
              className={`px-6 py-4 transition-colors ${
                allLangsInCart
                  ? "bg-amber-50/50"
                  : hasAllLangsSub
                    ? ""
                    : "hover:bg-[#FAF8F3]"
              }`}
            >
              <div className="grid items-center grid-cols-[1fr_160px_1fr_40px]">
                {/* Language */}
                <div className="flex items-center gap-3">
                  <span className="text-xl">🌍</span>
                  <span className="text-regular-semibold">All Languages</span>
                </div>

                {/* Current Plan */}
                <div className="flex items-center gap-1.5">
                  {hasAllLangsSub ? (
                    <>
                      <Badge size="sm">
                        {getPlanLabel(allLangsSub?.plan || "")}
                      </Badge>
                      <Badge size="sm" variant="success">
                        Active
                      </Badge>
                    </>
                  ) : (
                    <Badge size="sm">
                      Free plan
                    </Badge>
                  )}
                </div>

                {/* Action */}
                <div className="flex items-center justify-end gap-3">
                  {hasAllLangsSub && allLangsSub?.stripe_subscription_id ? (
                    <button
                      onClick={handleManage}
                      disabled={portalLoading}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      {portalLoading ? "Loading..." : "Manage plan"}
                    </button>
                  ) : (
                    <>
                      <span className="text-sm text-muted-foreground">
                        {formatPrice(allLangsPlan.amount_cents)}{getBillingSuffix(billingToggle)}
                      </span>
                      <button
                        onClick={() => {
                          if (allLangsInCart) {
                            onRemoveItem(allLangsPlan.id);
                          } else {
                            onToggleItem({
                              pricingPlanId: allLangsPlan.id,
                              tier: "all-languages",
                              targetId: null,
                              targetName: "All Languages",
                              billingModel: billingToggle as "monthly" | "annual" | "lifetime",
                              amountCents: allLangsPlan.amount_cents,
                            });
                          }
                        }}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                          allLangsInCart
                            ? "border border-gray-200 text-gray-700 hover:bg-gray-50"
                            : "bg-primary text-white hover:bg-primary/90"
                        }`}
                      >
                        {allLangsInCart ? "Remove" : "Upgrade plan"}
                      </button>
                    </>
                  )}
                </div>

                {/* Chevron placeholder */}
                <span />
              </div>
            </div>
          )}

          {/* Enrolled language rows */}
          {showLanguage &&
            enrolledLanguages.map((lang) =>
              renderLanguageRow(lang, { showSwitch: true })
            )}

          {/* Empty state when no languages enrolled */}
          {enrolledLanguages.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                You haven&apos;t enrolled in any languages yet. Start a course to see it here.
              </p>
            </div>
          )}
        </div>

        {/* Upsell banner */}
        {showUpsell && allLangsPlan && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm">
              <strong>Save with All Languages!</strong> You&apos;re paying{" "}
              {formatPrice(individualTotal)}
              {getBillingSuffix(billingToggle)} for{" "}
              {individualLangsInCart.length} languages. Get{" "}
              <strong>all languages</strong> for just{" "}
              {formatPrice(allLangsPlan.amount_cents)}
              {getBillingSuffix(billingToggle)}.
            </p>
          </div>
        )}
      </div>

      {/* Other Languages */}
      {showLanguage && otherLanguages.length > 0 && (
        <div>
          <h2 className="mb-4 text-large-semibold">Other Languages</h2>
          <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white">
            {otherLanguages.map((lang) =>
              renderLanguageRow(lang, { showSwitch: true })
            )}
          </div>
        </div>
      )}
    </section>
  );
}
