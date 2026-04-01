"use client";

import { ShoppingCart, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItem } from "./SubscriptionsPageClient";

interface StickyCartBarProps {
  cartItems: CartItem[];
  creditBalanceCents: number;
  onRemoveItem: (pricingPlanId: string) => void;
  onCheckout: () => void;
  isCheckingOut: boolean;
  checkoutError?: string | null;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function StickyCartBar({
  cartItems,
  creditBalanceCents,
  onRemoveItem,
  onCheckout,
  isCheckingOut,
  checkoutError,
}: StickyCartBarProps) {
  if (cartItems.length === 0) return null;

  const total = cartItems.reduce((sum, item) => sum + item.amountCents, 0);

  // Check for mixed billing modes (lifetime + recurring)
  const hasLifetime = cartItems.some((item) => item.billingModel === "lifetime");
  const hasRecurring = cartItems.some((item) => item.billingModel !== "lifetime");
  const hasMixedModes = hasLifetime && hasRecurring;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white shadow-lg lg:left-[240px]">
      <div className="mx-auto flex max-w-content-sm items-center justify-between px-6 py-4">
        {/* Left side: cart summary */}
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-wrap items-center gap-2">
            {cartItems.map((item) => (
              <span
                key={`${item.pricingPlanId}-${item.targetId}`}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium"
              >
                {item.targetName}
                <button
                  onClick={() => onRemoveItem(item.pricingPlanId)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-gray-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Right side: total and checkout */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            {creditBalanceCents > 0 && (
              <div className="text-xs text-green-600">
                {formatPrice(creditBalanceCents)} credit available
              </div>
            )}
            <div className="text-regular-semibold">{formatPrice(total)}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button
              onClick={onCheckout}
              disabled={isCheckingOut || hasMixedModes}
            >
              {isCheckingOut ? "Redirecting..." : "Proceed to Checkout"}
            </Button>
            {hasMixedModes && (
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <AlertTriangle className="h-3 w-3" />
                <span>Cannot mix lifetime &amp; recurring</span>
              </div>
            )}
            {checkoutError && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                <span>{checkoutError}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
