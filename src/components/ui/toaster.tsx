"use client";

import { usePathname } from "next/navigation";
import { Toaster as SonnerToaster } from "sonner";

// Study/test mode have a fixed action footer (~104px) at the bottom of the
// viewport, so lift toasts above it on those routes.
const FOOTER_CLEARANCE = 120;

export function Toaster() {
  const pathname = usePathname();
  const hasActionFooter = /\/lesson\/[^/]+\/(test|study)$/.test(pathname ?? "");

  return (
    <SonnerToaster
      position="bottom-right"
      offset={hasActionFooter ? { bottom: FOOTER_CLEARANCE } : undefined}
      toastOptions={{
        style: {
          background: "#ffffff",
          color: "#1a1a1a",
          border: "1px solid #e7e2d6",
        },
      }}
    />
  );
}
