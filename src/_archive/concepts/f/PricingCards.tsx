"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

/**
 * Brand-skinned pricing for Concept F.
 * NOTE: figures below are illustrative placeholders so the concept reads as a
 * whole — real prices come from Supabase via the app's PricingTable. Swap in
 * live pricing before this ships.
 */
type Billing = "monthly" | "annual";

interface Tier {
  name: string;
  blurb: string;
  monthly: string;
  annual: string;
  annualNote?: string;
  features: string[];
  cta: string;
  featured?: boolean;
}

const TIERS: Tier[] = [
  {
    name: "Free",
    blurb: "Get started, no card.",
    monthly: "$0",
    annual: "$0",
    features: [
      "First 10 lessons of any course",
      "No credit card needed",
      "Works alongside your other apps",
    ],
    cta: "Start free",
  },
  {
    name: "Single Language",
    blurb: "Go all-in on one.",
    monthly: "$9.99",
    annual: "$6.99",
    annualNote: "billed $83.88/year",
    features: [
      "Every course in one language",
      "Triggers, native audio & testing",
      "Streaks, leagues & progress",
    ],
    cta: "Choose plan",
  },
  {
    name: "All Languages",
    blurb: "French, Spanish, German & Italian.",
    monthly: "$14.99",
    annual: "$9.99",
    annualNote: "billed $119.88/year",
    features: [
      "Everything in Single Language",
      "All four languages unlocked",
      "Switch whenever you fancy",
    ],
    cta: "Choose plan",
    featured: true,
  },
];

export function PricingCards() {
  const [billing, setBilling] = useState<Billing>("annual");

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border-2 border-[var(--ink)] bg-white p-1 shadow-[var(--shadow-sm)]">
          {(["monthly", "annual"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold capitalize ${
                billing === b ? "bg-[var(--marker)]" : ""
              }`}
            >
              {b}
              {b === "annual" && <span className="ml-1 font-normal">· save ~30%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`card flex flex-col p-6 ${t.featured ? "!bg-[var(--pink-soft)]" : ""}`}
          >
            {t.featured && (
              <span className="pill yellow mb-3 self-start !py-1 !text-[13px]">Most popular</span>
            )}
            <h3 className="text-xl font-bold">{t.name}</h3>
            <p className="text-[14px] ink-soft">{t.blurb}</p>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">
                {billing === "annual" ? t.annual : t.monthly}
              </span>
              {t.name !== "Free" && <span className="ink-soft">/mo</span>}
            </p>
            <p className="eyebrow mt-1 min-h-[1.2em]">
              {billing === "annual" ? t.annualNote ?? "" : t.name === "Free" ? "Free forever" : ""}
            </p>
            <ul className="mt-4 flex flex-1 flex-col gap-2.5">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[14px]">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--marker)]">
                    <Check className="h-3 w-3" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className={`btn mt-6 text-center ${t.featured ? "" : "ghost"}`}>
              {t.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
