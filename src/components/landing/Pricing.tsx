"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { appUrl } from "@/lib/host";

type Billing = "monthly" | "annual";

type Plan = {
  id: string;
  emoji: string;
  title: string;
  /** French plan carries a language-picker chevron (decorative here). */
  chevron?: boolean;
  badge?: { label: string; fill: string };
  tagline: string;
  /** Price + caption per billing period. Annual values are the Figma ones; the
   *  monthly figures are the pre-discount rates the "Save 25%" tab reduces. */
  price: Record<Billing, { amount: string; per?: string; caption: string }>;
  benefits: string[];
  cta: string;
};

const PLANS: Plan[] = [
  {
    id: "free",
    emoji: "🤩",
    title: "Free",
    tagline: "For curious beginners",
    price: {
      monthly: { amount: "$0", caption: "Free forever" },
      annual: { amount: "$0", caption: "Free forever" },
    },
    benefits: [
      "First 10 lessons of every language",
      "Study & test sessions to try it out",
      "No credit card required",
    ],
    cta: "Start free",
  },
  {
    id: "french",
    emoji: "🇫🇷",
    title: "French only",
    chevron: true,
    badge: { label: "Most popular", fill: "bg-[var(--marker)]" },
    tagline: "For focused learners",
    price: {
      monthly: { amount: "$13", per: "/ month", caption: "Billed monthly" },
      annual: { amount: "$10", per: "/ month", caption: "$120 billed annually" },
    },
    benefits: [
      "First 10 lessons of every language",
      "Study & test sessions to try it out",
      "Every course in one language",
    ],
    cta: "Choose plan",
  },
  {
    id: "all",
    emoji: "🌐",
    title: "All Languages",
    badge: { label: "Best value", fill: "bg-[#8ee593]" },
    tagline: "For aspiring polyglots",
    price: {
      monthly: { amount: "$20", per: "/ month", caption: "Billed monthly" },
      annual: { amount: "$15", per: "/ month", caption: "$180 billed annually" },
    },
    benefits: [
      "First 10 lessons of every language",
      "Study & test sessions to try it out",
      "Every course in one language",
    ],
    cta: "Choose plan",
  },
];

const TABS: { value: Billing; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual - Save 25%" },
];

/** One pricing card: dashed-divider header (emoji, badge, title, price) over a
 *  benefits list and a full-width CTA. Prices/caption follow the active billing. */
function PlanCard({ plan, billing }: { plan: Plan; billing: Billing }) {
  const p = plan.price[billing];
  return (
    <div className="mx-auto flex w-full max-w-[400px] flex-col overflow-hidden rounded-[14px] border-[2.5px] border-[var(--ink)] bg-white shadow-[6px_6px_0_var(--ink)] lg:max-w-none">
      <div className="flex flex-col gap-1 border-b-2 border-dashed border-[var(--ink)] p-5">
        <div className="flex min-h-7 items-center justify-between">
          <span
            className="font-[family-name:var(--font-bricolage)] text-[28px] font-extrabold leading-none"
            aria-hidden
          >
            {plan.emoji}
          </span>
          {plan.badge && (
            <span
              className={`inline-flex items-center rounded-[22px] px-3.5 py-1.5 text-[14px] font-semibold text-[var(--ink)] ${plan.badge.fill}`}
            >
              {plan.badge.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <h3 className="font-[family-name:var(--font-bricolage)] text-[28px] font-extrabold leading-[1.25] tracking-[-0.02em] text-[var(--ink)]">
            {plan.title}
          </h3>
          {plan.chevron && (
            <ChevronDown className="h-6 w-6 shrink-0 text-[var(--ink)]" aria-hidden />
          )}
        </div>
        <p className="text-[14px] leading-[1.4] tracking-[-0.01em] text-[var(--ink-soft)]">
          {plan.tagline}
        </p>
        <div className="flex items-end gap-1">
          <span className="font-[family-name:var(--font-bricolage)] text-[36px] font-extrabold leading-[1.2] tracking-[-0.02em] text-[var(--ink)]">
            {p.amount}
          </span>
          {p.per && (
            <span className="pb-1 text-[14px] font-medium leading-[1.4] tracking-[-0.015em] text-[var(--mono-soft)]">
              {p.per}
            </span>
          )}
        </div>
        <p className="eyebrow sm">{p.caption}</p>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        {plan.benefits.map((b) => (
          <div key={b} className="flex items-start gap-2">
            <span
              className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[12px] border-2 border-[var(--ink)] bg-[var(--marker)] text-[11px] font-bold leading-none text-[var(--ink)]"
              aria-hidden
            >
              ✓
            </span>
            <span className="flex-1 text-[14px] leading-[1.4] tracking-[-0.01em] text-[var(--ink)]">
              {b}
            </span>
          </div>
        ))}
      </div>

      <div className="px-[18px] py-6">
        <Link href={appUrl("/signup")} className="btn big w-full justify-center">
          {plan.cta}
        </Link>
      </div>
    </div>
  );
}

/**
 * Section 8 · Pricing — the "Start free" plan wall. A Monthly/Annual billing
 * toggle (annual selected by default, "Save 25%") swaps every card's price and
 * billing caption; three plan cards (Free, French only, All Languages) sit above
 * a row of cross-plan feature badges.
 */
export function Pricing() {
  const [billing, setBilling] = useState<Billing>("annual");

  return (
    <section id="pricing" aria-label="Pricing" className="bg-[#fffdf7] px-6 py-20 sm:py-24">
      <div className="mx-auto flex max-w-[1120px] flex-col items-center">
        <p className="eyebrow">Pricing</p>
        <h2 className="heading-xl mt-3 text-center text-[var(--ink)]">Start free</h2>

        {/* Billing toggle — the selected pill takes the tan fill (Figma Tab Pill). */}
        <div role="tablist" aria-label="Billing period" className="mt-7 flex items-center gap-3">
          {TABS.map((t) => {
            const selected = billing === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setBilling(t.value)}
                className={`label-heavy rounded-full px-3 py-2 text-black transition-colors ${
                  selected ? "bg-[var(--tan)]" : "hover:bg-[var(--paper-2)]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="mt-10 grid w-full grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} billing={billing} />
          ))}
        </div>

        {/* Cross-plan feature badges — soft tan-paper pills on the off-white band. */}
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {["🌐 Use any web browser", "💾 Progress saved to your account", "📱 Study on mobile too"].map(
            (f) => (
              <span
                key={f}
                className="inline-flex items-center whitespace-nowrap rounded-full bg-[var(--paper)] px-3.5 py-1.5 text-[14px] font-semibold tracking-[-0.21px] text-[var(--ink)]"
              >
                {f}
              </span>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
