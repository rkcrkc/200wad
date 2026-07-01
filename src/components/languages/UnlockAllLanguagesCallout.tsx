"use client";

import { AllLanguagesUpsellCard } from "@/components/ui/AllLanguagesUpsellCard";
import { useLanguagesUpgrade } from "@/components/languages/LanguagesUpgradeProvider";

/**
 * Promo banner above the current course inviting the user to unlock every
 * language at once. Opens the shared upgrade modal on the all-languages tier.
 * Rendered only for signed-in users without all-access (gated by the page).
 */
export function UnlockAllLanguagesCallout() {
  const { openUpgradeAllLanguages } = useLanguagesUpgrade();

  return (
    <AllLanguagesUpsellCard
      description="Get every lesson in every language, current and future, with one subscription."
      buttonLabel="Upgrade plan"
      onButtonClick={openUpgradeAllLanguages}
    />
  );
}
