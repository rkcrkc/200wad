"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/context/ConsentContext";
import { marketingUrl } from "@/lib/host";

/**
 * Bottom-corner cookie consent card. Prior opt-in: analytics stay off until the
 * user accepts. Shown on first visit (any route) and re-openable via the footer
 * "Cookie settings" control so consent can be withdrawn as easily as it's given.
 */
export function ConsentBanner() {
  const { showBanner, acceptAll, rejectAll, close, hasDecided } = useConsent();
  const pathname = usePathname();

  // Admin CMS is internal-only; the consent card doesn't belong there.
  if (pathname?.startsWith("/admin")) return null;

  if (!showBanner) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-[60] w-[calc(100%-2rem)] max-w-sm sm:bottom-6 sm:left-6"
    >
      <div className="relative rounded-2xl border border-black/10 bg-white p-5 shadow-xl">
        {hasDecided ? (
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-foreground/40 transition-colors hover:bg-black/5 hover:text-foreground/70"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <h2 className="text-medium-semibold text-foreground">Cookies</h2>
        <p className="mt-2 text-small-regular leading-relaxed text-foreground/70">
          We use essential cookies to make the site work. With your OK we also use analytics cookies
          to understand how it&rsquo;s used and improve it. See our{" "}
          <Link href={marketingUrl("/privacy")} className="font-medium text-primary underline">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={acceptAll} className="flex-1">
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={rejectAll} className="flex-1">
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
