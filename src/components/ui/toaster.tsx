"use client";

import { usePathname } from "next/navigation";
import { Toaster as SonnerToaster } from "sonner";

// Study/test mode have a fixed action footer (~104px) at the bottom of the
// viewport, and the subscriptions page has a sticky checkout bar, so lift
// toasts above them on those routes.
const FOOTER_CLEARANCE = 120;

export function Toaster() {
  const pathname = usePathname();
  const path = pathname ?? "";
  const hasActionFooter =
    /\/lesson\/[^/]+\/(test|study)$/.test(path) ||
    path === "/account/subscriptions";

  return (
    <SonnerToaster
      position="bottom-right"
      offset={hasActionFooter ? { bottom: FOOTER_CLEARANCE } : undefined}
      toastOptions={{
        // Transparent, borderless wrapper by default so each toast's own card
        // (e.g. <AchievementToast>) is the only visible surface.
        unstyled: true,
        style: {
          background: "transparent",
          border: "none",
          boxShadow: "none",
        },
      }}
    />
  );
}
