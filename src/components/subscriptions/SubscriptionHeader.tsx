"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import type { SubscriptionLanguage } from "@/lib/queries/subscriptions";
import { ActionMenu, type ActionMenuItem } from "./ActionMenu";
import { formatPrice, getBillingSuffix, getPlanLabel, interpolate } from "./planCopy";
import type { CurrentPlan } from "./SubscriptionsPageClient";

/** Fallback "Access" templates when no admin copy is set for a plan kind. */
const DEFAULT_ACCESS_COPY = {
  "all-languages": "All languages unlocked",
  language: "{language} unlocked · {freeLessons} lessons free for {otherLanguages}",
  free: "{freeLessons} lessons free per language",
} as const;

interface SubscriptionHeaderProps {
  plan: CurrentPlan;
  languages: SubscriptionLanguage[];
  defaultFreeLessons: number;
  /** Admin-editable "Access" copy per plan kind: main line + optional sub-text. */
  accessCopy: Partial<
    Record<"free" | "language" | "all-languages", { template: string | null; subtext: string | null }>
  >;
  /** Whether the "Upgrade plan" (→ All Languages) CTA is available. */
  showUpgradeCta: boolean;
  /** Whether All Languages is the plan currently in the checkout cart. */
  isSelected: boolean;
  onUpgrade: () => void;
  onSwitchLanguage: () => void;
  onManageBilling: () => void;
}

/** "Italian, French & German" */
function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

export function SubscriptionHeader({
  plan,
  languages,
  defaultFreeLessons,
  accessCopy,
  showUpgradeCta,
  isSelected,
  onUpgrade,
  onSwitchLanguage,
  onManageBilling,
}: SubscriptionHeaderProps) {
  const { kind, sub, unlockedLanguageName } = plan;

  const planName =
    kind === "all-languages"
      ? "All Languages"
      : kind === "language"
        ? (unlockedLanguageName ?? "Language plan")
        : "Free Plan";

  // "Access" line: admin-editable template per plan kind, interpolated with the
  // live plan context. Falls back to the built-in copy when unset.
  const others = languages
    .filter((l) => l.id !== plan.unlockedLanguageId)
    .map((l) => l.name);
  const accessEntry = accessCopy[kind];
  const accessTokens = {
    freeLessons: defaultFreeLessons,
    language: unlockedLanguageName ?? "",
    otherLanguages: joinNames(others),
    languages: languages.length,
  };
  const accessTemplate = accessEntry?.template ?? DEFAULT_ACCESS_COPY[kind];
  const accessText = interpolate(accessTemplate, accessTokens);
  // Optional second line under the access value; hidden when the admin leaves
  // the sub-text blank.
  const rawSubtext = accessEntry?.subtext?.trim();
  const accessSubtext = rawSubtext ? interpolate(rawSubtext, accessTokens) : null;

  // Billing management (change frequency / downgrade / cancel) is only possible
  // for recurring Stripe subscriptions — lifetime one-off payments have none.
  const canManageBilling = !!sub?.stripe_subscription_id;

  const menuItems: ActionMenuItem[] = [];
  if (kind === "language") {
    menuItems.push({ label: "Switch unlocked language", onClick: onSwitchLanguage });
    if (canManageBilling) {
      menuItems.push({ label: "Change payment frequency", onClick: onManageBilling });
      menuItems.push({ label: "Cancel plan", onClick: onManageBilling, destructive: true });
    }
  } else if (kind === "all-languages" && canManageBilling) {
    menuItems.push({ label: "Change payment frequency", onClick: onManageBilling });
    menuItems.push({ label: "Downgrade plan", onClick: onManageBilling });
    menuItems.push({ label: "Cancel plan", onClick: onManageBilling, destructive: true });
  }

  return (
    <div className="px-8 py-6">
      <div className="flex flex-col items-start gap-4 sm:grid sm:grid-cols-[minmax(0,240px)_minmax(0,180px)_1fr_220px_40px] sm:items-start sm:gap-0">
        {/* Current plan — aligns with the Language column below */}
        <div className="min-w-0">
          <p className="text-xs-medium text-muted-foreground">Current Plan</p>
          <p className="mt-1.5 text-large-semibold">{planName}</p>
          {sub && (
            <p className="text-small-regular text-muted-foreground">
              {formatPrice(sub.amount_cents)}
              {getBillingSuffix(sub.plan)} · {getPlanLabel(sub.plan)}
            </p>
          )}
        </div>

        {/* Access — aligns with the # Courses column below */}
        <div className="min-w-0 sm:col-start-2 sm:col-span-2">
          <p className="text-xs-medium text-muted-foreground">Access</p>
          <p className="mt-1.5 text-large-semibold">{accessText}</p>
          {accessSubtext && (
            <p className="mt-1.5 text-small-regular text-muted-foreground">
              {accessSubtext}
            </p>
          )}
        </div>

        {/* Upgrade CTA — aligns with the row CTA column below */}
        <div className="flex items-center pr-4 sm:col-start-4 sm:self-center">
          {showUpgradeCta &&
            (isSelected ? (
              <Button type="button" variant="outline" onClick={onUpgrade} className="w-full text-primary">
                Selected
              </Button>
            ) : (
              <Button type="button" onClick={onUpgrade} className="group w-full">
                Unlock all languages
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            ))}
        </div>

        {/* Menu — aligns with the row chevron column below */}
        <div className="flex items-center justify-end sm:col-start-5 sm:self-center">
          <ActionMenu items={menuItems} />
        </div>
      </div>
    </div>
  );
}
