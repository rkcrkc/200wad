"use client";

import { Globe } from "lucide-react";
import type { PricingPlan } from "@/types/database";
import type { CartItem } from "./SubscriptionsPageClient";

interface AllLanguagesCalloutProps {
  plans: PricingPlan[];
  billingToggle: string;
  cartItems: CartItem[];
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

export function AllLanguagesCallout({
  plans,
  billingToggle,
  cartItems,
  onToggleItem,
  onRemoveItem,
}: AllLanguagesCalloutProps) {
  const allLangsPlan = plans.find(
    (p) => p.tier === "all-languages" && p.billing_model === billingToggle
  );

  if (!allLangsPlan) return null;

  const isInCart = cartItems.some((item) => item.tier === "all-languages");

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <Globe className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-regular-semibold">Unlock All Languages</h3>
            <p className="text-xs text-muted-foreground">
              Get access to every language for{" "}
              <span className="font-semibold text-foreground">
                {formatPrice(allLangsPlan.amount_cents)}
                {getBillingSuffix(billingToggle)}
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (isInCart) {
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
            isInCart
              ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              : "bg-primary text-white hover:bg-primary/90"
          }`}
        >
          {isInCart ? "Remove from Cart" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
