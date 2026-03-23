"use client";

import { ChevronDown } from "lucide-react";
import { getFlagFromCode } from "@/lib/utils/flags";
import type { PricingPlan } from "@/types/database";
import type { UserSubscription, SubscriptionLanguage } from "@/lib/queries/subscriptions";
import type { CartItem } from "./SubscriptionsPageClient";
import { ExpandableCourseList } from "./ExpandableCourseList";

interface LanguageSubscriptionRowProps {
  lang: SubscriptionLanguage;
  subscriptions: UserSubscription[];
  hasAllLangsSub: boolean;
  allLangsInCart: boolean;
  cartItems: CartItem[];
  languagePlan: PricingPlan | undefined;
  billingToggle: string;
  showSwitch: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleItem: (item: CartItem) => void;
  onRemoveItem: (pricingPlanId: string) => void;
  onManage: () => void;
  portalLoading: boolean;
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

export function LanguageSubscriptionRow({
  lang,
  subscriptions,
  hasAllLangsSub,
  allLangsInCart,
  cartItems,
  languagePlan,
  billingToggle,
  showSwitch,
  isExpanded,
  onToggleExpand,
  onToggleItem,
  onRemoveItem,
  onManage,
  portalLoading,
}: LanguageSubscriptionRowProps) {
  const langSub = subscriptions.find(
    (sub) =>
      sub.type === "language" &&
      sub.target_id === lang.id &&
      sub.isEffective
  );
  const hasLangSub = !!langSub;

  const isInCart = cartItems.some(
    (item) => item.tier === "language" && item.targetId === lang.id
  );

  const isDisabled = hasLangSub || hasAllLangsSub || allLangsInCart;

  return (
    <div>
      <div
        className={`px-6 py-4 transition-colors ${
          isInCart
            ? "bg-blue-50/50"
            : isDisabled || !showSwitch
              ? ""
              : "hover:bg-[#FAF8F3]"
        }`}
      >
        <div className="grid items-center grid-cols-[1fr_160px_1fr_40px]">
          {/* Language */}
          <div className="flex items-center gap-3">
            <span className="text-xl">{getFlagFromCode(lang.code)}</span>
            <div>
              <span className="text-large-semibold">{lang.name}</span>
              <p className="text-xs text-muted-foreground">
                {lang.courseCount} {lang.courseCount === 1 ? "course" : "courses"}, {lang.totalWords} {lang.totalWords === 1 ? "word" : "words"}
              </p>
            </div>
          </div>

          {/* Current Plan */}
          <div className="flex items-center gap-1.5">
            {hasLangSub ? (
              <>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {getPlanLabel(langSub.plan)}
                </span>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
                  Active
                </span>
              </>
            ) : hasAllLangsSub ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
                Included
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                Free plan
              </span>
            )}
          </div>

          {/* Action */}
          <div className="flex items-center justify-end gap-3">
            {hasLangSub && langSub.stripe_subscription_id ? (
              <button
                onClick={onManage}
                disabled={portalLoading}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {portalLoading ? "Loading..." : "Manage plan"}
              </button>
            ) : showSwitch && languagePlan ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {formatPrice(languagePlan.amount_cents)}{getBillingSuffix(billingToggle)}
                </span>
                <button
                  onClick={() => {
                    if (isInCart) {
                      const cartItem = cartItems.find(
                        (item) => item.tier === "language" && item.targetId === lang.id
                      );
                      if (cartItem) onRemoveItem(cartItem.pricingPlanId);
                    } else {
                      onToggleItem({
                        pricingPlanId: languagePlan.id,
                        tier: "language",
                        targetId: lang.id,
                        targetName: lang.name,
                        billingModel: billingToggle as "monthly" | "annual" | "lifetime",
                        amountCents: languagePlan.amount_cents,
                      });
                    }
                  }}
                  disabled={isDisabled && !isInCart}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                    isInCart
                      ? "border border-gray-200 text-gray-700 hover:bg-gray-50"
                      : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  {isInCart ? "Remove" : "Upgrade plan"}
                </button>
              </>
            ) : null}
          </div>

          {/* Chevron */}
          <div className="flex items-center justify-end">
            <button
              onClick={onToggleExpand}
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded course list */}
      {isExpanded && <ExpandableCourseList languageId={lang.id} />}
    </div>
  );
}
