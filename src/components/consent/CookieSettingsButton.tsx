"use client";

import { useConsent } from "@/context/ConsentContext";

/**
 * Footer control to re-open the cookie consent card. Lets users review or
 * withdraw consent at any time (GDPR: withdrawal must be as easy as giving it).
 */
export function CookieSettingsButton({ className }: { className?: string }) {
  const { openSettings } = useConsent();
  return (
    <button type="button" onClick={openSettings} className={className}>
      Cookie settings
    </button>
  );
}
