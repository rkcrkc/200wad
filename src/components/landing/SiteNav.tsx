"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { appUrl, marketingUrl } from "@/lib/host";

/**
 * Shared marketing navbar — logo left; section links + CTA right. Used by the
 * homepage (`LandingG`) and the blog layout so both stay in sync.
 *
 * - `courseHref` — when a logged-in visitor has a shared cross-subdomain session,
 *   the CTA offers the app ("Go to your course") and the Login link is dropped.
 * - `samePageAnchors` — on the homepage the section links are same-page hash
 *   anchors (`#how`); elsewhere (e.g. the blog) they cross back to the apex
 *   homepage via `marketingUrl("/#how")`.
 * - `crossHost` — set when this nav renders OFF the marketing host (e.g. the auth
 *   pages on the app subdomain). Marketing page links + the logo are then emitted
 *   as absolute apex URLs via `marketingUrl()`, so they go straight to the
 *   marketing site instead of resolving on the current host and 307-redirecting.
 */
export function SiteNav({
  courseHref,
  samePageAnchors = false,
  crossHost = false,
}: {
  courseHref?: string | null;
  samePageAnchors?: boolean;
  crossHost?: boolean;
}) {
  const pathname = usePathname();
  // Same-page hash anchors only make sense on the marketing homepage itself; off
  // that host they must resolve to the apex home (`marketingUrl("/#how")`).
  const sectionHref = (hash: string) =>
    samePageAnchors && !crossHost ? hash : marketingUrl(`/${hash}`);
  // Marketing page links: relative on the apex host (client-side nav), absolute
  // apex URLs when rendered cross-host.
  const pageHref = (path: string) => (crossHost ? marketingUrl(path) : path);

  // Active = a real page route (not a hash anchor or cross-host URL) matching the
  // current path. `/blog` stays active on its nested post pages.
  const isActive = (href: string) => {
    if (!href.startsWith("/") || href.includes("#")) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="bg-[var(--paper)]">
      <div className="container flex items-center justify-between gap-4 py-4">
        <Link
          href={pageHref("/")}
          aria-label="200 Words a Day — home"
          className="shrink-0 !no-underline"
        >
          <Image
            src="/marketing/g/logo.svg"
            alt="200 Words a Day"
            width={88}
            height={49}
            className="h-11 w-auto"
            priority
          />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-1.5">
          {[
            { href: sectionHref("#how"), label: "How it works" },
            { href: pageHref("/about"), label: "About" },
            { href: pageHref("/pricing"), label: "Pricing" },
            { href: pageHref("/blog"), label: "Blog" },
            // Logged-in visitors don't need a Login link.
            ...(courseHref ? [] : [{ href: appUrl("/login"), label: "Login" }]),
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`label-heavy hidden items-center rounded-full px-3 py-2 !no-underline transition-colors sm:inline-flex ${
                isActive(l.href)
                  ? "bg-[var(--tan)] text-black"
                  : "text-black/[0.67] hover:bg-[var(--tan)] hover:text-black"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {/* Shared cross-subdomain session → offer the app, not signup, when logged in
              (no auto-forward: the visitor stays on the marketing page by choice). */}
          {courseHref ? (
            <Link href={courseHref} className="btn ghost ml-2">
              Go to your course
            </Link>
          ) : (
            <Link href={appUrl("/signup")} className="btn ghost ml-2">
              Start free
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
