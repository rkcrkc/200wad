"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { SubscriptionHeader } from "./SubscriptionHeader";
import { LanguageSubscriptionsList } from "./LanguageSubscriptionsList";
import { AllLanguagesCallout } from "./AllLanguagesCallout";
import { CheckoutFooterBar } from "./CheckoutFooterBar";
import { SwitchLanguageModal } from "./SwitchLanguageModal";
import { createCustomerPortalSession } from "@/lib/mutations/subscriptions";
import { getFlagFromCode } from "@/lib/utils/flags";
import type {
  SubscriptionPageData,
  SubscriptionLanguage,
  UserSubscription,
} from "@/lib/queries/subscriptions";
import type { UpgradeTarget } from "./planCopy";

// ============================================================================
// Current-plan model (derived from the user's effective subscriptions)
// ============================================================================

export type PlanKind = "free" | "language" | "all-languages";

export interface CurrentPlan {
  kind: PlanKind;
  /** The effective subscription backing a paid plan (null on free). */
  sub: UserSubscription | null;
  /** The unlocked language id for an individual plan. */
  unlockedLanguageId: string | null;
  unlockedLanguageName: string | null;
}

interface SubscriptionsPageClientProps {
  data: SubscriptionPageData;
}

export function SubscriptionsPageClient({ data }: SubscriptionsPageClientProps) {
  const [upgradeTarget, setUpgradeTarget] = useState<UpgradeTarget | null>(null);
  const [switchOpen, setSwitchOpen] = useState(false);

  const showAllLanguagesTier = data.enabledTiers.includes("all-languages");
  const showLanguageTier = data.enabledTiers.includes("language");

  const currentPlan = useMemo<CurrentPlan>(() => {
    const allLangsSub =
      data.subscriptions.find((s) => s.type === "all-languages" && s.isEffective) ?? null;
    if (allLangsSub) {
      return {
        kind: "all-languages",
        sub: allLangsSub,
        unlockedLanguageId: null,
        unlockedLanguageName: null,
      };
    }
    const languageSub =
      data.subscriptions.find((s) => s.type === "language" && s.isEffective) ?? null;
    if (languageSub) {
      const lang = data.languages.find((l) => l.id === languageSub.target_id);
      return {
        kind: "language",
        sub: languageSub,
        unlockedLanguageId: languageSub.target_id,
        unlockedLanguageName: lang?.name ?? null,
      };
    }
    return { kind: "free", sub: null, unlockedLanguageId: null, unlockedLanguageName: null };
  }, [data.subscriptions, data.languages]);

  const unlockedLanguageIds = useMemo<string[]>(() => {
    if (currentPlan.kind === "all-languages") return data.languages.map((l) => l.id);
    if (currentPlan.unlockedLanguageId) return [currentPlan.unlockedLanguageId];
    return [];
  }, [currentPlan, data.languages]);

  const canUnlockIndividually = currentPlan.kind === "free" && showLanguageTier;
  const showUpgradeCta = currentPlan.kind !== "all-languages" && showAllLanguagesTier;
  // Temporarily hidden. Flip to `showUpgradeCta` to restore the callout above the card.
  const showCallout = false && showUpgradeCta;

  // Which target (if any) is currently in the checkout cart, so its CTA can flip
  // to the "Selected" state.
  const selectedAllLanguages = upgradeTarget?.tier === "all-languages";
  const selectedLanguageId =
    upgradeTarget?.tier === "language" ? upgradeTarget.targetId : null;

  // CTAs toggle: selecting adds the plan to the cart, clicking again removes it.
  const toggleAllLanguagesUpgrade = useCallback(() => {
    setUpgradeTarget((prev) =>
      prev?.tier === "all-languages"
        ? null
        : {
            tier: "all-languages",
            targetId: null,
            targetName: "All Languages",
            flag: "🌍",
          }
    );
  }, []);

  const toggleLanguageUpgrade = useCallback((lang: SubscriptionLanguage) => {
    setUpgradeTarget((prev) =>
      prev?.tier === "language" && prev.targetId === lang.id
        ? null
        : {
            tier: "language",
            targetId: lang.id,
            targetName: lang.name,
            flag: getFlagFromCode(lang.code),
          }
    );
  }, []);

  const handleManageBilling = useCallback(async () => {
    try {
      const result = await createCustomerPortalSession();
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.error || "Couldn't open the billing portal.");
      }
    } catch {
      toast.error("Couldn't open the billing portal. Please try again.");
    }
  }, []);

  return (
    <div className="space-y-6">
      {showCallout && (
        <AllLanguagesCallout
          plans={data.plans}
          languageNames={data.languages.map((l) => l.name)}
          onUpgrade={toggleAllLanguagesUpgrade}
        />
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <SubscriptionHeader
          plan={currentPlan}
          languages={data.languages}
          defaultFreeLessons={data.defaultFreeLessons}
          accessCopy={data.accessCopy}
          showUpgradeCta={showUpgradeCta}
          isSelected={selectedAllLanguages}
          onUpgrade={toggleAllLanguagesUpgrade}
          onSwitchLanguage={() => setSwitchOpen(true)}
          onManageBilling={handleManageBilling}
        />
        <LanguageSubscriptionsList
          languages={data.languages}
          unlockedLanguageIds={unlockedLanguageIds}
          canUnlockIndividually={canUnlockIndividually}
          selectedLanguageId={selectedLanguageId}
          onUnlockLanguage={toggleLanguageUpgrade}
        />
      </div>

      {upgradeTarget && (
        <CheckoutFooterBar
          target={upgradeTarget}
          plans={data.plans}
          languages={data.languages}
          creditBalanceCents={data.creditBalanceCents}
          onChangeTarget={setUpgradeTarget}
          onClose={() => setUpgradeTarget(null)}
        />
      )}

      {switchOpen && currentPlan.sub && (
        <SwitchLanguageModal
          subscriptionId={currentPlan.sub.id}
          currentLanguageId={currentPlan.unlockedLanguageId}
          languages={data.languages}
          onClose={() => setSwitchOpen(false)}
        />
      )}
    </div>
  );
}
