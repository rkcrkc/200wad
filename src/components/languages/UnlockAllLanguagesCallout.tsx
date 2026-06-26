"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguagesUpgrade } from "@/components/languages/LanguagesUpgradeProvider";

/**
 * Promo banner above the current course inviting the user to unlock every
 * language at once. Opens the shared upgrade modal on the all-languages tier.
 * Rendered only for signed-in users without all-access (gated by the page).
 */
export function UnlockAllLanguagesCallout() {
  const { openUpgradeAllLanguages } = useLanguagesUpgrade();

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-5 text-white shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-large-semibold">Unlock all languages</h3>
          <p className="text-sm text-white/80">
            Get every lesson in every language, current and future, with one
            subscription.
          </p>
        </div>
      </div>
      <Button
        variant="secondary"
        className="shrink-0 bg-white text-primary hover:bg-white/90"
        onClick={openUpgradeAllLanguages}
      >
        Upgrade plan
      </Button>
    </div>
  );
}
