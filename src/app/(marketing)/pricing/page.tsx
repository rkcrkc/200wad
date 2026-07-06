import type { Metadata } from "next";
import { Section } from "@/components/marketing/Section";
import { PricingTable } from "@/components/marketing/PricingTable";
import { FAQ } from "@/components/marketing/FAQ";
import { MARKETING_FAQS, MARKETING_STATS } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Pricing — 200 Words a Day",
  description:
    "Start free with the first 10 lessons of any course. Then pick a single language or all four — monthly, annual or one-time lifetime. No card required to begin.",
  alternates: { canonical: "/pricing" },
};

const pricingFaqs = MARKETING_FAQS.filter((f) =>
  ["Is it really free to start?", "Do I have to stop using Duolingo or my class?"].includes(f.q)
);

export default function Pricing() {
  return (
    <>
      <Section width="md" className="pt-16 text-center sm:pt-24">
        <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Simple pricing. Start free.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-large-medium text-foreground/70">
          The first {MARKETING_STATS.freeLessons} lessons of any course are free — no card. Only
          pay when you&rsquo;re ready to keep going.
        </p>
        <div className="mt-10">
          <PricingTable />
        </div>
      </Section>

      {/* Pricing FAQ */}
      <Section width="sm" className="pt-0">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          Pricing questions
        </h2>
        <div className="mt-8">
          <FAQ items={pricingFaqs} />
        </div>
      </Section>
    </>
  );
}
