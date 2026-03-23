"use client";

import { useState, useCallback, useMemo } from "react";
import { LanguageSubscriptionsList } from "./LanguageSubscriptionsList";
import { AllLanguagesCallout } from "./AllLanguagesCallout";
import { StickyCartBar } from "./StickyCartBar";
import { createCheckoutSession } from "@/lib/mutations/subscriptions";
import type { SubscriptionPageData } from "@/lib/queries/subscriptions";

// ============================================================================
// Cart Types (exported for child components)
// ============================================================================

export interface CartItem {
  pricingPlanId: string;
  tier: "language" | "all-languages";
  targetId: string | null;
  targetName: string;
  billingModel: "monthly" | "annual" | "lifetime";
  amountCents: number;
}

// ============================================================================
// Component
// ============================================================================

interface SubscriptionsPageClientProps {
  data: SubscriptionPageData;
}

export function SubscriptionsPageClient({
  data,
}: SubscriptionsPageClientProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [billingToggle, setBillingToggle] = useState<string>("monthly");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const hasAllLangsSub = useMemo(
    () => data.subscriptions.some((sub) => sub.type === "all-languages" && sub.isEffective),
    [data.subscriptions]
  );
  const showAllLanguagesTier = data.enabledTiers.includes("all-languages");

  // ------------------------------------------------------------------
  // Cart management
  // ------------------------------------------------------------------

  const handleToggleItem = useCallback(
    (item: CartItem) => {
      if (item.tier === "all-languages") {
        // Remove individual language items when all-languages toggled ON
        setCartItems((prev) => [
          ...prev.filter((i) => i.tier !== "language"),
          item,
        ]);
      } else {
        // Add directly to cart — shows in sticky footer bar
        setCartItems((prev) => [...prev, item]);
      }
    },
    []
  );

  const handleRemoveItem = useCallback((pricingPlanId: string) => {
    setCartItems((prev) =>
      prev.filter((item) => item.pricingPlanId !== pricingPlanId)
    );
  }, []);

  // For removing by language targetId when the switch is toggled off
  const handleRemoveByPlanId = useCallback((pricingPlanId: string) => {
    setCartItems((prev) => {
      // Try exact pricingPlanId match first
      const exactMatch = prev.find((item) => item.pricingPlanId === pricingPlanId);
      if (exactMatch) {
        return prev.filter((item) => item !== exactMatch);
      }
      return prev;
    });
  }, []);

  // ------------------------------------------------------------------
  // Checkout
  // ------------------------------------------------------------------

  const handleCheckout = useCallback(async () => {
    if (cartItems.length === 0) return;
    setIsCheckingOut(true);

    try {
      const result = await createCheckoutSession({
        items: cartItems.map((item) => ({
          pricingPlanId: item.pricingPlanId,
          targetId: item.targetId,
          tier: item.tier,
        })),
      });

      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        // Reset checkout state on error
        setIsCheckingOut(false);
        console.error("Checkout error:", result.error);
      }
    } catch {
      setIsCheckingOut(false);
    }
  }, [cartItems]);

  return (
    <div className={`space-y-8 ${cartItems.length > 0 ? "pb-28" : ""}`}>
      {/* All Languages callout — shown when no active all-languages sub */}
      {showAllLanguagesTier && !hasAllLangsSub && (
        <AllLanguagesCallout
          plans={data.plans}
          billingToggle={billingToggle}
          cartItems={cartItems}
          onToggleItem={handleToggleItem}
          onRemoveItem={handleRemoveByPlanId}
        />
      )}

      <LanguageSubscriptionsList
        languages={data.languages}
        userLanguageIds={data.userLanguageIds}
        subscriptions={data.subscriptions}
        plans={data.plans}
        enabledTiers={data.enabledTiers}
        cartItems={cartItems}
        billingToggle={billingToggle}
        showAllLanguagesRow={hasAllLangsSub}
        onBillingToggleChange={setBillingToggle}
        onToggleItem={handleToggleItem}
        onRemoveItem={handleRemoveByPlanId}
      />

      <StickyCartBar
        cartItems={cartItems}
        creditBalanceCents={data.creditBalanceCents}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckingOut}
      />
    </div>
  );
}
