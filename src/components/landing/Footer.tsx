import Link from "next/link";
import Image from "next/image";
import { appUrl } from "@/lib/host";
import { EmailCaptureCard } from "./EmailCaptureCard";

/** The four link columns. Headings render as the Figma "200W/Caption/Small" eyebrow;
 *  each link is the "200W/Label Heavy/Regular" face (.label-heavy). Hrefs mirror the
 *  navbar: the homepage section anchor (#how) plus the standalone /pricing, /about and
 *  /blog pages; coming-soon languages point at the hero waitlist anchor, and pages that
 *  don't exist yet stay at "#". */
const MENUS = [
  {
    heading: "Languages",
    links: [
      { label: "French", href: appUrl("/signup") },
      { label: "Spanish", href: "#waitlist" },
      { label: "German", href: "#waitlist" },
      { label: "Italian", href: "#waitlist" },
    ],
  },
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "#how" },
      { label: "Pricing", href: "/pricing" },
      { label: "Refunds", href: "/refunds" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Login", href: appUrl("/login") },
      { label: "Create account", href: appUrl("/signup") },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact us", href: "/contact" },
    ],
  },
] as const;

/** 200W/Label/Micro — Inter Medium 12 / 1.5 / -1%, half-opacity ink. Shared by the
 *  copyright line and the legal links; small enough that it isn't worth a named class. */
const MICRO = "text-[12px] font-medium leading-[1.5] tracking-[-0.01em] text-[var(--ink)]/50";

/**
 * Section 14 · Footer — the yellow sign-off band, in three stacked rows:
 * a top row pairing the brand block (logo + "*Vocab that sticks*" caption) with
 * the word-of-the-day capture spanning the remaining width; a middle row pairing
 * the social badges with the four link columns; and a legals row carrying the
 * copyright and legal links. The link columns right-align on the desktop grid
 * (matching Figma) and reflow to a left-aligned 2-up grid on mobile.
 */
export function Footer() {
  return (
    <footer className="bg-[var(--marker)]">
      <div className="container flex flex-col gap-12 pb-5 pt-12 lg:gap-16">
        {/* Top — brand (leading) + mailing list spanning the rest (trailing). */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="flex flex-col items-center gap-2.5 self-start">
            <Link href="/" aria-label="200 Words a Day — home" className="!no-underline">
              <Image
                src="/marketing/g/logo.svg"
                alt="200 Words a Day"
                width={125}
                height={69}
                className="h-[69px] w-auto"
              />
            </Link>
            <p className="eyebrow sm !text-[var(--ink)]">*Vocab that sticks*</p>
          </div>

          <section aria-label="Get word of the day" className="w-full lg:flex-1">
            <EmailCaptureCard variant="footer" />
          </section>
        </div>

        {/* Middle — social badges (leading) + link columns (trailing). */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <Image
            src="/marketing/g/footer-social.png"
            alt="Find us on X, Instagram, TikTok and LinkedIn"
            width={312}
            height={192}
            className="h-auto w-[156px] self-start"
          />

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4 lg:flex lg:gap-[60px]"
          >
            {MENUS.map((menu) => (
              <div
                key={menu.heading}
                className="flex flex-col items-start gap-4 lg:items-end"
              >
                <p className="eyebrow sm !text-[var(--ink)]/50">{menu.heading}</p>
                {menu.links.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="label-heavy text-[var(--ink)] !no-underline hover:opacity-70 lg:text-right"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>

        {/* Legals — copyright + legal links. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className={MICRO}>© 200 Words a Day. All rights reserved 2026</p>
          <div className="flex items-center gap-5">
            <Link href="/terms" className={`${MICRO} !no-underline hover:opacity-100`}>
              Terms
            </Link>
            <Link href="/privacy" className={`${MICRO} !no-underline hover:opacity-100`}>
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
