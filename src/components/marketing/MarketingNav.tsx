"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MARKETING_LANGUAGES } from "@/lib/marketing/content";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-bone/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-content-lg items-center justify-between px-5 sm:px-8">
        {/* Wordmark */}
        <Link href="/home" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-semibold text-white">
            200
          </span>
          <span className="text-medium-semibold">Words a Day</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          <div
            className="relative"
            onMouseEnter={() => setLangOpen(true)}
            onMouseLeave={() => setLangOpen(false)}
          >
            <button
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-regular-medium text-foreground/80 transition-colors hover:bg-beige hover:text-foreground"
              onClick={() => setLangOpen((o) => !o)}
              aria-expanded={langOpen}
            >
              Languages
              <ChevronDown className="h-4 w-4" />
            </button>
            {langOpen && (
              <div className="absolute left-0 top-full w-56 pt-2">
                <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-card">
                  {MARKETING_LANGUAGES.map((lang) => (
                    <Link
                      key={lang.slug}
                      href={`/learn/${lang.slug}`}
                      className="flex items-center gap-3 px-4 py-2.5 text-regular-medium text-foreground/80 transition-colors hover:bg-bone hover:text-foreground"
                    >
                      <span className="text-lg">{lang.flag}</span>
                      {lang.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-regular-medium text-foreground/80 transition-colors hover:bg-beige hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Start free</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="grid h-10 w-10 place-items-center rounded-lg md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-black/5 bg-bone px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            <p className="px-3 pb-1 pt-2 text-xs-medium uppercase tracking-wide text-foreground/50">
              Languages
            </p>
            {MARKETING_LANGUAGES.map((lang) => (
              <Link
                key={lang.slug}
                href={`/learn/${lang.slug}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-regular-medium"
                onClick={() => setMobileOpen(false)}
              >
                <span className="text-lg">{lang.flag}</span>
                {lang.name}
              </Link>
            ))}
            <div className="my-2 h-px bg-black/5" />
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-regular-medium"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <Button asChild variant="outline" className="text-primary">
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  Log in
                </Link>
              </Button>
              <Button asChild>
                <Link href="/signup" onClick={() => setMobileOpen(false)}>
                  Start free
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
