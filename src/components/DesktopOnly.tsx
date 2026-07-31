import type { ReactNode } from "react";
import { Monitor } from "lucide-react";

/**
 * Gates a page behind the desktop breakpoint. Below md the children are hidden
 * and a short "not available on mobile" message is shown instead; at md and up
 * the wrapper collapses (`md:contents`) so children lay out exactly as if it
 * weren't here. CSS-only, so it works during SSR without a hydration flash.
 */
export function DesktopOnly({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Mobile: unavailable message */}
      <div className="flex min-h-full flex-col items-center justify-center gap-3 px-6 text-center md:hidden">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bone-hover text-muted-foreground">
          <Monitor className="h-6 w-6" />
        </div>
        <h1 className="text-large-semibold text-foreground">
          This page isn&rsquo;t available on mobile just yet
        </h1>
        <p className="max-w-xs text-regular-medium text-muted-foreground">
          Sign in on your desktop for all features.
        </p>
      </div>

      {/* Desktop: the real page */}
      <div className="hidden md:contents">{children}</div>
    </>
  );
}
