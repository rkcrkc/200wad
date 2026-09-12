import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { HeroDemo } from "./HeroDemo";
import { Testimonials } from "./Testimonials";
import { TheProblem } from "./TheProblem";
import { TheSolution } from "./TheSolution";
import { Features } from "./Features";
import { SocialProof } from "./SocialProof";
import { Pricing } from "./Pricing";
import { FAQ } from "./FAQ";
import { About } from "./About";
import { ClosingCTA } from "./ClosingCTA";
import { EmailCapture } from "./EmailCapture";
import { Blog } from "./Blog";
import { Footer } from "./Footer";
import { HERO_LANGUAGES_G } from "./heroDemoData";
import { appUrl } from "@/lib/host";
import "@/styles/site.css";

/**
 * SEO metadata for the marketing homepage. Exported so the route that renders
 * `<LandingG />` (the apex root page) can spread it into its own `metadata`.
 * Indexed and canonicalised to `/` — this is the live homepage.
 */
export const landingMetadata: Metadata = {
  title: "200 Words a Day — The stupidly easy way to learn vocab that sticks",
  description:
    "The stupidly easy way to learn vocab that sticks — every word hooked onto an absurd cartoon you can't forget.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "200 Words a Day",
    title: "200 Words a Day — The stupidly easy way to learn vocab that sticks",
    description:
      "The stupidly easy way to learn vocab that sticks — every word hooked onto an absurd cartoon you can't forget.",
    url: "/",
    // TODO: add a 1200×630 OG banner under public/marketing/ and reference it here.
  },
  twitter: {
    card: "summary_large_image",
    title: "200 Words a Day — The stupidly easy way to learn vocab that sticks",
    description:
      "The stupidly easy way to learn vocab that sticks — every word hooked onto an absurd cartoon you can't forget.",
  },
};

// Regular-case source strings; the .eyebrow type style applies UPPERCASE.
const BANNER_MESSAGES = [
  "🇫🇷 French available now",
  "🇪🇸🇩🇪🇮🇹 Spanish, German & Italian coming soon",
  "🤩 10 lessons free per language",
];

/** Key-benefit check — the Figma badge icon: a solid green circle + white tick. */
function BadgeCheck() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" aria-hidden>
      <rect width="16" height="16" rx="8" fill="var(--success)" />
      <path
        d="M11.6377 5.16667L6.63767 10.1667L4.36494 7.89394"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The 200 Words a Day marketing homepage ("Landing G").
 *
 * Brand styling lives in the scoped `site.css` (the `.site` wrapper below is the
 * namespace for every brand token/utility). The Spline Sans Mono eyebrow face
 * (`--font-mono`) is loaded globally in the root layout alongside Bricolage/Inter.
 */
export function LandingG({ courseHref }: { courseHref?: string | null }) {
  return (
    <div className="site flex min-h-screen flex-col">
      {/* 0 · ANNOUNCEMENT BANNER — yellow marquee, black uppercase captions,
          messages separated by fixed 250px gaps (no dividers). */}
      <div className="marquee bg-[var(--marker)] py-2.5">
        <div className="marquee__track" style={{ ["--marquee-dur" as string]: "26s" }}>
          {[0, 1].map((dup) => (
            <div key={dup} className="marquee__group gap-[250px] pr-[250px]" aria-hidden={dup === 1}>
              {BANNER_MESSAGES.map((m) => (
                <span key={m} className="eyebrow whitespace-nowrap !text-[var(--ink)]">
                  {m}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 1 · NAVBAR — logo left; links + "Start free" right. No border (matches
          Figma); collapses to logo + CTA on mobile. */}
      <header className="bg-[var(--paper)]">
        <div className="container flex items-center justify-between gap-4 py-4">
          <Link href="/" aria-label="200 Words a Day — home" className="shrink-0 !no-underline">
            <Image
              src="/marketing/g/logo.svg"
              alt="200 Words a Day"
              width={88}
              height={49}
              className="h-11 w-auto"
              priority
            />
          </Link>
          <nav className="flex items-center gap-5 sm:gap-[30px]">
            {[
              { href: "#how", label: "How it works" },
              { href: "#about", label: "About" },
              { href: "#pricing", label: "Pricing" },
              // Logged-in visitors don't need a Login link.
              ...(courseHref ? [] : [{ href: appUrl("/login"), label: "Login" }]),
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hidden text-[14px] font-semibold tracking-[-0.015em] text-[var(--ink)] !no-underline hover:opacity-70 sm:block"
              >
                {l.label}
              </Link>
            ))}
            {/* Shared cross-subdomain session → offer the app, not signup, when logged in
                (no auto-forward: the visitor stays on the marketing page by choice). */}
            {courseHref ? (
              <Link href={courseHref} className="btn ghost">
                Go to your course
              </Link>
            ) : (
              <Link href={appUrl("/signup")} className="btn ghost">
                Start free
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* 2 · HERO — copy column + auto-playing Word Demo Card. */}
        <section className="container grid grid-cols-1 items-center gap-12 py-14 lg:grid-cols-[638fr_586fr] lg:gap-[56px] lg:py-20">
          {/* Left — headline, sub, CTAs, caption, key benefits. Capped at 580px so
              the whole column (and the key-benefit row) stays on a tight measure. */}
          <div className="max-w-[580px]">
            {/* Rating eyebrow — yellow stars + Caption/Regular label. The 20px
                gap to the heading lives here as mb, because `.site h1`
                sets margin:0 at a higher specificity than a `mt-*` utility. */}
            <p className="mb-5 flex items-center gap-2">
              <span className="flex" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-[var(--marker-2)] text-[var(--marker-2)]"
                  />
                ))}
              </span>
              <span className="eyebrow">Join 1,000+ learners</span>
            </p>

            {/* Width matches the Figma heading (504px) so it breaks after "easy". */}
            <h1 className="h-hero max-w-[504px] text-[var(--ink)]">
              The stupidly easy way to learn French that{" "}
              <span className="mark">sticks</span>
            </h1>

            <p className="body mt-6 text-[var(--ink-soft)]">
              200 Words a Day lets you learn foreign languages in a way you can actually
              enjoy. Each word comes with a wacky memory hook your brain can&rsquo;t forget,
              making it easier than ever to learn lots of foreign words without getting bored.
            </p>

            <div className="mt-[30px] flex flex-wrap gap-3">
              <Link href={appUrl("/signup")} className="btn big">
                🇫🇷&nbsp;&nbsp;Start learning &ndash; it&rsquo;s free
              </Link>
              <Link href="#waitlist" className="btn big ghost">
                🇪🇸🇩🇪🇮🇹&nbsp;&nbsp;Join waitlist
              </Link>
            </div>

            <p className="eyebrow sm mt-5">10 lessons free per language · No credit card needed</p>

            <ul className="mt-[30px] flex flex-wrap gap-2.5">
              {["Learn 1000s of words", "Fun & easy", "Start with just 10 mins a day"].map(
                (benefit) => (
                  <li key={benefit} className="pill text-[14px]">
                    <BadgeCheck />
                    {benefit}
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Right — functional, auto-playing language demo. */}
          <div className="w-full">
            <HeroDemo languages={HERO_LANGUAGES_G} />
          </div>
        </section>

        {/* 3 · TESTIMONIALS — full-bleed scrolling marquee of learner quotes. */}
        <Testimonials />

        {/* 4 · THE PROBLEM — centred headline over a scribble, ringed by emoji. */}
        <TheProblem />

        {/* 5 · THE SOLUTION — header + 1-2-3 steps + a swipeable deck of typable
            word cards, closing on a CTA. */}
        <TheSolution />

        {/* 6 · FEATURES — three alternating copy/visual blocks (curriculum,
            testing, complementary tools) under a shared eyebrow. */}
        <Features />

        {/* 7 · SOCIAL PROOF — a second, reverse-scrolling testimonial marquee on
            the tan fill, just above pricing. */}
        <SocialProof />

        {/* 8 · PRICING — "Start free" plan wall with a Monthly/Annual toggle and
            three plan cards over cross-plan feature badges. */}
        <Pricing />

        {/* 9 · FAQs — single-open accordion of seven questions. */}
        <FAQ />

        {/* 10 · ABOUT — "Our story" card: tan visual + copy with founder avatar
            and a secondary "Read our story" CTA. */}
        <About />

        {/* 11 · CLOSING CTA — centred sign-off headline over a fanned row of
            decorative word cards, closing on the primary "Start now" button. */}
        <ClosingCTA />

        {/* 12 · EMAIL CAPTURE — light-blue "word of the day" newsletter card with
            an inline email form (idle / invalid / success states). */}
        <EmailCapture />

        {/* 13 · BLOG — soft-pink band teasing three articles as linked cards. */}
        <Blog />
      </main>

      {/* 14 · FOOTER — yellow sign-off band: brand + social, four link columns,
          and a copyright / legal row. */}
      <Footer />
    </div>
  );
}
