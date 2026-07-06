import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brain, Keyboard, Trophy, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/Section";
import { FAQ } from "@/components/marketing/FAQ";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import {
  MARKETING_LANGUAGES,
  getLanguage,
  MARKETING_FAQS,
  MARKETING_STATS,
} from "@/lib/marketing/content";

interface Params {
  params: Promise<{ language: string }>;
}

export function generateStaticParams() {
  return MARKETING_LANGUAGES.map((l) => ({ language: l.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { language } = await params;
  const lang = getLanguage(language);
  if (!lang) return {};
  return {
    title: `Learn ${lang.name} and actually remember it — 200 Words a Day`,
    description: `Build a ${lang.name} vocabulary that sticks. Memory triggers, native audio and spaced testing — the companion to whatever ${lang.name} app or class you already use. Start free.`,
    alternates: { canonical: `/learn/${lang.slug}` },
  };
}

const method = [
  { icon: Brain, title: "Memory triggers", body: "Every word paired with a vivid image and native audio." },
  { icon: Keyboard, title: "Smart testing", body: "Type-the-answer recall with honest, character-level feedback." },
  { icon: Trophy, title: "Earned mastery", body: "Three perfect answers in a row before a word counts as mastered." },
];

export default async function LanguageHub({ params }: Params) {
  const { language } = await params;
  const lang = getLanguage(language);
  if (!lang) notFound();

  return (
    <>
      {/* Hero */}
      <Section width="md" className="pt-16 sm:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="text-6xl">{lang.flag}</span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Finally remember your {lang.name} vocab
            </h1>
            <p className="mt-6 max-w-xl text-large-medium text-foreground/70">{lang.blurb}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link href="/signup">Start {lang.name} free</Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="text-primary">
                <Link href="/how-it-works">See how it works</Link>
              </Button>
            </div>
            <p className="mt-4 text-small-regular text-foreground/50">
              {lang.courseCount} courses · First {MARKETING_STATS.freeLessons} lessons free
            </p>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-card">
            <p className="text-small-medium text-foreground/50">A word from {lang.name}</p>
            <div className="mt-3 grid aspect-[4/3] place-items-center rounded-2xl bg-gradient-to-br from-primary/15 via-beige to-warning/15">
              <span className="text-5xl">{lang.flag}</span>
            </div>
            <div className="mt-4 flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 flex-1 rounded-full bg-success" />
              ))}
            </div>
            <p className="mt-2 text-xs-medium text-foreground/50">Mastered in 3 perfect answers</p>
          </div>
        </div>
      </Section>

      {/* Method */}
      <Section width="md" className="bg-white">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          Why {lang.name} words stick here
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {method.map((m) => (
            <div key={m.title} className="rounded-2xl border border-black/10 bg-bone p-6">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-white">
                <m.icon className="h-6 w-6 text-primary" />
              </span>
              <h3 className="mt-5 text-large-semibold">{m.title}</h3>
              <p className="mt-2 text-regular-medium text-foreground/70">{m.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Companion framing */}
      <Section width="sm" className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          The companion to your {lang.name} routine
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-large-medium text-foreground/70">
          Keep your {lang.name} app, your class, your tutor. 200 Words a Day is the memory layer
          that makes the vocabulary they teach you actually stay.
        </p>
        <ul className="mx-auto mt-8 flex max-w-md flex-col gap-2.5 text-left">
          {[
            `Bank the ${lang.name} words you meet elsewhere`,
            "A few honest minutes a day",
            "Progress you can actually trust",
          ].map((f) => (
            <li key={f} className="flex items-center gap-3 text-regular-medium">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                <Check className="h-3 w-3" />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </Section>

      {/* Cross-links to other languages */}
      <Section width="md" className="bg-white pt-0">
        <p className="text-center text-small-semibold uppercase tracking-wide text-foreground/50">
          Also available
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {MARKETING_LANGUAGES.filter((l) => l.slug !== lang.slug).map((l) => (
            <Link
              key={l.slug}
              href={`/learn/${l.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-bone px-4 py-2 text-regular-medium transition-colors hover:border-primary/40"
            >
              <span>{l.flag}</span> {l.name}
              <ArrowRight className="h-3.5 w-3.5 text-foreground/40" />
            </Link>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section width="sm">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          {lang.name} questions
        </h2>
        <div className="mt-8">
          <FAQ items={MARKETING_FAQS} />
        </div>
      </Section>

      <div className="pb-20">
        <FinalCTA heading={`Start remembering ${lang.name} today.`} />
      </div>
    </>
  );
}
