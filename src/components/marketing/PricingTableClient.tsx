"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Billing = "monthly" | "annual" | "lifetime";

export interface PriceDisplay {
  amount: string;
  suffix: string;
  sub?: string;
}

export interface PricingTier {
  name: string;
  blurb: string;
  /** Free tier ignores the billing toggle and uses a single price. */
  price: PriceDisplay | Record<Billing, PriceDisplay>;
  features: string[];
  cta: string;
  featured?: boolean;
}

const BILLING_OPTIONS: { key: Billing; label: string; note?: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "annual", label: "Annual", note: "Save ~33%" },
  { key: "lifetime", label: "Lifetime" },
];

function isSinglePrice(
  price: PricingTier["price"]
): price is PriceDisplay {
  return "amount" in price;
}

export function PricingTableClient({ tiers }: { tiers: PricingTier[] }) {
  const [billing, setBilling] = useState<Billing>("annual");

  return (
    <div>
      {/* Billing toggle */}
      <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-black/10 bg-white p-1">
        {BILLING_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setBilling(opt.key)}
            className={cn(
              "relative rounded-full px-4 py-2 text-small-semibold transition-colors",
              billing === opt.key
                ? "bg-primary text-white"
                : "text-foreground/60 hover:text-foreground"
            )}
          >
            {opt.label}
            {opt.note && billing !== opt.key && (
              <span className="ml-1.5 hidden text-xs-medium text-success sm:inline">
                {opt.note}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tiers */}
      <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
        {tiers.map((tier) => {
          const price = isSinglePrice(tier.price) ? tier.price : tier.price[billing];
          return (
            <div
              key={tier.name}
              className={cn(
                "flex flex-col rounded-3xl border bg-white p-7",
                tier.featured ? "border-2 border-primary shadow-card" : "border-black/10"
              )}
            >
              {tier.featured ? (
                <span className="mb-3 w-fit rounded-full bg-primary px-3 py-1 text-xs-medium text-white">
                  Most popular
                </span>
              ) : (
                <span className="mb-3 h-[26px]" aria-hidden />
              )}
              <h3 className="text-large-semibold">{tier.name}</h3>
              <p className="mt-1 text-small-regular text-foreground/60">{tier.blurb}</p>

              <div className="mt-5 flex items-end gap-1.5">
                <span className="text-4xl font-semibold tracking-tight">{price.amount}</span>
                {price.suffix && (
                  <span className="pb-1 text-regular-medium text-foreground/50">
                    {price.suffix}
                  </span>
                )}
              </div>
              <p className="mt-1 h-5 text-small-regular text-foreground/50">{price.sub ?? ""}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-regular-medium">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                      <Check className="h-3 w-3" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                variant={tier.featured ? "default" : "outline"}
                className={cn("mt-7", !tier.featured && "text-primary")}
              >
                <Link href="/signup">{tier.cta}</Link>
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-small-regular text-foreground/50">
        Prices in USD. Cancel anytime. Referral credits apply automatically at checkout.
      </p>
    </div>
  );
}
