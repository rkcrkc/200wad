import Link from "next/link";
import Image from "next/image";
import { appUrl } from "@/lib/host";

/** The four link columns. Headings render as the Figma "200W/Caption/Small" eyebrow;
 *  each link is the "200W/Label Heavy/Regular" face (.label-heavy). Hrefs mirror the
 *  navbar + section ids (#how / #pricing / #about / #blog); coming-soon languages point
 *  at the hero waitlist anchor, and pages that don't exist in this concept stay at "#". */
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
      { label: "Pricing", href: "#pricing" },
      { label: "Blog", href: "#blog" },
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
      { label: "About", href: "#about" },
      { label: "Contact us", href: "#" },
    ],
  },
] as const;

/** 200W/Label/Micro — Inter Medium 12 / 1.5 / -1%, half-opacity ink. Shared by the
 *  copyright line and the legal links; small enough that it isn't worth a named class. */
const MICRO = "text-[12px] font-medium leading-[1.5] tracking-[-0.01em] text-[var(--ink)]/50";

/**
 * Section 14 · Footer — the yellow sign-off band. A top row pairs the brand block
 * (logo + "*Vocab that sticks*" caption + social badges) with four link columns, and
 * a bottom row carries the copyright and legal links. The columns right-align on the
 * desktop grid (matching Figma) and reflow to a left-aligned 2-up grid on mobile.
 */
export function Footer() {
  return (
    <footer className="bg-[var(--marker)]">
      <div className="container flex flex-col gap-12 pb-5 pt-12 lg:gap-20">
        {/* Top — brand + link columns. */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          {/* Leading — logo, tagline, social badges. */}
          <div className="flex flex-1 flex-col gap-[30px]">
            <div className="flex flex-col items-center gap-2.5 self-start">
              <Image
                src="/marketing/g/logo.svg"
                alt="200 Words a Day"
                width={125}
                height={69}
                className="h-[69px] w-auto"
              />
              <p className="eyebrow sm !text-[var(--ink)]">*Vocab that sticks*</p>
            </div>
            <Image
              src="/marketing/g/footer-social.png"
              alt="Find us on X, Instagram, TikTok and LinkedIn"
              width={312}
              height={192}
              className="h-auto w-[156px] self-start"
            />
          </div>

          {/* Trailing — the four navigation columns. */}
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

        {/* Bottom — copyright + legal links. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className={MICRO}>© 200 Words a Day. All rights reserved 2026</p>
          <div className="flex items-center gap-5">
            <Link href="#" className={`${MICRO} !no-underline hover:opacity-100`}>
              Terms
            </Link>
            <Link href="#" className={`${MICRO} !no-underline hover:opacity-100`}>
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
