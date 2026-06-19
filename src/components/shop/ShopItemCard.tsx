"use client";

import { useState, useTransition } from "react";
import {
  Coins,
  ShoppingBag,
  Snowflake,
  Zap,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { purchaseItemAction } from "@/lib/mutations/shop";
import type { ShopItemForList } from "@/lib/queries/shop";

interface ShopItemCardProps {
  item: ShopItemForList;
}

// Lucide icon names stored on shop_items.icon, resolved client-side. Falls
// back to a generic bag for any name we don't explicitly map.
const ICON_MAP: Record<string, LucideIcon> = {
  Snowflake,
  Zap,
};

export function ShopItemCard({ item }: ShopItemCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const Icon = (item.icon && ICON_MAP[item.icon]) || ShoppingBag;

  const handleConfirm = () => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await purchaseItemAction(item.id, 1);
      if (!result.success) {
        setSubmitError(result.error ?? "Could not complete purchase. Try again.");
        return;
      }
      setShowConfirm(false);
    });
  };

  return (
    <>
      <div className="flex h-full flex-col rounded-2xl border-[1.5px] border-gray-100 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Icon
              className="h-7 w-7 text-primary"
              strokeWidth={1.67}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-regular-semibold text-foreground">
              {item.title}
            </h3>
            <p className="mt-1 text-[13px] leading-[1.4] text-muted-foreground">
              {item.description}
            </p>
          </div>
        </div>

        {/* Footer: price + buy CTA */}
        <div className="mt-4 flex items-center justify-between gap-3 pt-1">
          <span className="inline-flex items-center gap-1.5 text-regular-semibold text-foreground">
            <Coins className="h-4 w-4 text-amber-500" strokeWidth={1.67} />
            {item.costCoins}
          </span>
          {item.atMaxOwned ? (
            <span className="text-xs-medium text-muted-foreground">Owned</span>
          ) : item.canAfford ? (
            <Button size="sm" onClick={() => setShowConfirm(true)}>
              Buy
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="text-muted-foreground"
            >
              +{item.coinsShort} coins to unlock
            </Button>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isPending && setShowConfirm(false)}
            aria-hidden="true"
          />

          <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border bg-bone px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" strokeWidth={1.67} />
                <span className="text-medium-semibold">Confirm purchase</span>
              </div>
              <button
                onClick={() => !isPending && setShowConfirm(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground"
                aria-label="Close"
                disabled={isPending}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-5">
              <p className="text-[15px] leading-[1.45] text-foreground">
                Buy{" "}
                <span className="font-semibold">{item.title}</span> for{" "}
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Coins className="h-4 w-4 text-amber-500" strokeWidth={1.67} />
                  {item.costCoins} coins
                </span>
                ?
              </p>
              <p className="mt-3 text-[13px] leading-[1.45] text-muted-foreground">
                {item.description}
              </p>

              {submitError && (
                <p className="mt-4 text-sm text-destructive">{submitError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <Button
                variant="ghost"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={isPending}>
                {isPending ? "Buying…" : `Spend ${item.costCoins} coins`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
