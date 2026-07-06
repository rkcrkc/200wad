import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/marketing/Section";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { MARKETING_LANGUAGES } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Learn a language and actually remember it — 200 Words a Day",
  description:
    "Build a vocabulary that sticks in French, Spanish, German or Italian. Memory triggers, native audio and spaced testing — the companion to whatever you already use.",
  alternates: { canonical: "/learn" },
};

export default function LearnIndex() {
  return (
    <>
      <Section width="md" className="pt-16 text-center sm:pt-24">
        <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Pick a language. Remember it for good.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-large-medium text-foreground/70">
          Four languages, each with courses for vocabulary, sentences and grammar — built to move
          words into long-term memory.
        </p>
      </Section>

      <Section width="md" className="pt-0">
        <div className="grid gap-5 sm:grid-cols-2">
          {MARKETING_LANGUAGES.map((lang) => (
            <Link
              key={lang.slug}
              href={`/learn/${lang.slug}`}
              className="group flex flex-col rounded-3xl border border-black/10 bg-white p-7 transition-all hover:border-primary/40 hover:shadow-card"
            >
              <span className="text-5xl">{lang.flag}</span>
              <h2 className="mt-4 text-xl-semibold">Learn {lang.name}</h2>
              <p className="mt-2 flex-1 text-regular-medium text-foreground/70">{lang.blurb}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-regular-semibold text-primary">
                Explore {lang.name}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <div className="pb-20">
        <FinalCTA />
      </div>
    </>
  );
}
