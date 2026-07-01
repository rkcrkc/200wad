"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { ShoppingCart, X, AlertTriangle, ChevronUp, ChevronDown, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebarCollapsed } from "@/context/SidebarCollapseContext";
import { createCheckoutSession } from "@/lib/mutations/subscriptions";
import { getFlagFromCode } from "@/lib/utils/flags";
import type { PricingPlan } from "@/types/database";
import type { SubscriptionLanguage } from "@/lib/queries/subscriptions";
import { formatPrice, type UpgradeTarget } from "./planCopy";

interface CheckoutFooterBarProps {
  target: UpgradeTarget;
  plans: PricingPlan[];
  languages: SubscriptionLanguage[];
  creditBalanceCents: number;
  onChangeTarget: (target: UpgradeTarget) => void;
  onClose: () => void;
}

interface TargetOption {
  /** Stable key: "all-languages" or the language id. */
  key: string;
  label: string;
  target: UpgradeTarget;
}

const PLAN_TYPE_OPTIONS = [
  { value: "monthly", label: "Monthly", badge: null },
  { value: "annual", label: "Annual", badge: "save $$" },
  { value: "lifetime", label: "Lifetime", badge: "best value" },
];

function getPlanTypeLabel(value: string): string {
  return PLAN_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Plan-type selector that opens upward (dropup) from the checkout footer. */
function PlanTypeDropup({
  value,
  options,
  onChange,
}: {
  value: string;
  options: typeof PLAN_TYPE_OPTIONS;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-small-medium text-foreground transition-colors hover:bg-bone-hover"
      >
        {getPlanTypeLabel(value)}
        <ChevronUp
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "" : "rotate-180"}`}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-small-medium transition-colors hover:bg-bone-hover ${
                opt.value === value ? "text-primary" : "text-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {opt.label}
                {opt.badge && (
                  <span className="rounded-full bg-green-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-600">
                    {opt.badge}
                  </span>
                )}
              </span>
              {opt.value === value && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Selected-target pill with a leading caret. Clicking opens a dropup listing
 * every purchasable target (All languages + each language) so the user can
 * switch what they're unlocking without dismissing the footer.
 */
function TargetDropup({
  activeKey,
  flag,
  label,
  options,
  onChange,
  onClose,
}: {
  activeKey: string;
  flag: string;
  label: string;
  options: TargetOption[];
  onChange: (option: TargetOption) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <span className="inline-flex items-center rounded-full bg-bone-hover text-small-medium text-foreground">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-2"
        >
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
          <span className="text-base leading-none">{flag}</span>
          {label}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Remove"
          className="mr-1 rounded-full p-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-small-medium transition-colors hover:bg-bone-hover ${
                opt.key === activeKey ? "text-primary" : "text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-base leading-none">{opt.target.flag}</span>
                {opt.label}
              </span>
              {opt.key === activeKey && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Sticky footer checkout bar shown when the user clicks an "Upgrade plan" or
 * "Unlock all lessons" CTA. Shows the selected target as a chip, a plan-type
 * dropup for billing frequency, and a checkout button for the single target.
 */
export function CheckoutFooterBar({
  target,
  plans,
  languages,
  creditBalanceCents,
  onChangeTarget,
  onClose,
}: CheckoutFooterBarProps) {
  const sidebarCollapsed = useSidebarCollapsed();

  // Every purchasable target: the all-languages bundle (when offered) followed
  // by each individual language. Drives the selected-target pill's dropup.
  const targetOptions = useMemo<TargetOption[]>(() => {
    const opts: TargetOption[] = [];
    if (plans.some((p) => p.tier === "all-languages")) {
      opts.push({
        key: "all-languages",
        label: "All languages",
        target: {
          tier: "all-languages",
          targetId: null,
          targetName: "All Languages",
          flag: "🌍",
        },
      });
    }
    if (plans.some((p) => p.tier === "language")) {
      for (const lang of languages) {
        opts.push({
          key: lang.id,
          label: `${lang.name} only`,
          target: {
            tier: "language",
            targetId: lang.id,
            targetName: lang.name,
            flag: getFlagFromCode(lang.code),
          },
        });
      }
    }
    return opts;
  }, [plans, languages]);

  const activeTargetKey =
    target.tier === "all-languages" ? "all-languages" : target.targetId ?? "";

  // Plans available for this tier, keyed by billing model.
  const tierPlans = useMemo(
    () => plans.filter((p) => p.tier === target.tier),
    [plans, target.tier]
  );

  // Only offer billing models that actually have a plan, in canonical order.
  const options = useMemo(
    () =>
      PLAN_TYPE_OPTIONS.filter((o) =>
        tierPlans.some((p) => p.billing_model === o.value)
      ),
    [tierPlans]
  );

  // Prefer Annual as the default billing model when it's offered.
  const defaultBilling = useMemo(
    () =>
      options.find((o) => o.value === "annual")?.value ??
      options[0]?.value ??
      "monthly",
    [options]
  );

  const [billingToggle, setBillingToggle] = useState<string>(defaultBilling);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Switching target can change which billing models exist. Rather than syncing
  // state in an effect, derive the effective selection during render: honour the
  // user's pick when still available, otherwise fall back to the default.
  const effectiveBilling = options.some((o) => o.value === billingToggle)
    ? billingToggle
    : defaultBilling;

  const selectedPlan =
    tierPlans.find((p) => p.billing_model === effectiveBilling) ?? tierPlans[0];

  const monthlyPlan = tierPlans.find((p) => p.billing_model === "monthly");
  const annualPlan = tierPlans.find((p) => p.billing_model === "annual");
  const annualSavingsCents =
    monthlyPlan && annualPlan
      ? Math.max(0, monthlyPlan.amount_cents * 12 - annualPlan.amount_cents)
      : 0;

  const total = selectedPlan?.amount_cents ?? 0;
  const isAnnual = effectiveBilling === "annual";
  const isLifetime = effectiveBilling === "lifetime";
  const displayCents = isAnnual ? Math.round(total / 12) : total;

  async function handleCheckout() {
    if (!selectedPlan) return;
    setIsCheckingOut(true);
    setCheckoutError(null);
    try {
      const result = await createCheckoutSession({
        items: [
          {
            pricingPlanId: selectedPlan.id,
            targetId: target.targetId,
            tier: target.tier,
          },
        ],
      });
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        setIsCheckingOut(false);
        setCheckoutError(result.error || "Checkout failed. Please try again.");
      }
    } catch (err) {
      setIsCheckingOut(false);
      setCheckoutError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    }
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white shadow-lg ${sidebarCollapsed ? "lg:left-[72px]" : "lg:left-[240px]"}`}>
      <div className="mx-auto max-w-content-md px-6 py-4">
        {/* Main row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left side: cart summary */}
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="text-xs-medium text-muted-foreground">Upgrade plan</span>
            <div className="flex flex-wrap items-center gap-2">
              <TargetDropup
                activeKey={activeTargetKey}
                flag={target.flag}
                label={
                  target.tier === "language"
                    ? `${target.targetName} only`
                    : target.targetName
                }
                options={targetOptions}
                onChange={(opt) => onChangeTarget(opt.target)}
                onClose={onClose}
              />
            </div>

            {/* Plan type selector */}
            {options.length > 0 && (
              <>
                <div className="ml-1 h-8 w-px shrink-0 bg-gray-200" />
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs-medium text-muted-foreground">Plan type</span>
                  <PlanTypeDropup
                    value={effectiveBilling}
                    options={options}
                    onChange={setBillingToggle}
                  />
                </div>
              </>
            )}
          </div>

          {/* Right side: total and checkout */}
          <div className="flex shrink-0 items-center gap-4">
            <div className="text-right">
              {creditBalanceCents > 0 && (
                <div className="text-xs text-green-600">
                  {formatPrice(creditBalanceCents)} credit available
                </div>
              )}
              <div className="flex items-baseline justify-end">
                <span className="text-regular-semibold">{formatPrice(displayCents)}</span>
                {!isLifetime && (
                  <span className="text-small-regular text-muted-foreground">/month</span>
                )}
              </div>
              {isAnnual && (
                <p className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                  {annualSavingsCents > 0 && (
                    <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white">
                      Save {formatPrice(annualSavingsCents)}/year
                    </span>
                  )}
                  {formatPrice(total)} billed annually
                </p>
              )}
              {isLifetime && (
                <p className="text-xs text-muted-foreground">Pay once, access forever</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Button
                onClick={handleCheckout}
                disabled={isCheckingOut || !selectedPlan}
                className="group hover:bg-primary"
              >
                {isCheckingOut ? "Redirecting..." : "Proceed to Checkout"}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
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
    </div>
  );
}
