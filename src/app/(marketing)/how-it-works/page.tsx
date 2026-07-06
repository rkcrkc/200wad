import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Keyboard, Trophy, Repeat, Volume2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/Section";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { MASTERY_STATES } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "How it works — 200 Words a Day",
  description:
    "Memory triggers, smart testing and earned mastery: how 200 Words a Day moves vocabulary into long-term memory, alongside whatever app or class you already use.",
  alternates: { canonical: "/how-it-works" },
};

const steps = [
  {
    icon: Brain,
    kicker: "Step 1 — Study",
    title: "Meet each word with a memory trigger",
    body: "Every word is paired with a vivid image or short clip and native audio. These associations are what your brain actually holds onto — far more than a plain list. Add your own notes to make them stick even harder.",
    points: ["Image or short video per word", "Native-speaker audio", "Your own personal notes"],
  },
  {
    icon: Keyboard,
    kicker: "Step 2 — Test",
    title: "Prove you can recall it",
    body: "You type the answer and get honest, character-level feedback — so you see exactly which letters you missed, not just right-or-wrong. Stuck? Use a clue. The scoring keeps you honest either way.",
    points: ["Type-the-answer recall", "Character-level feedback", "Optional clues when you need them"],
  },
  {
    icon: Trophy,
    kicker: "Step 3 — Master",
    title: "Earn mastery, don't just collect it",
    body: "Get a word perfect three tests in a row — no mistakes, no clues — and it's marked mastered. Slip up and the streak resets. It's a real signal you'll still know the word months from now.",
    points: ["3 perfect answers in a row", "Streak resets keep it honest", "Progress you can trust"],
  },
];

export default function HowItWorks() {
  return (
    <>
      <Section width="sm" className="pt-16 text-center sm:pt-24">
        <p className="text-small-semibold uppercase tracking-wide text-primary">How it works</p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Study. Test. Remember for good.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-large-medium text-foreground/70">
          A simple daily loop, built on how memory actually works — so the words you learn today
          are still there next year.
        </p>
      </Section>

      {/* Steps */}
      <Section width="md" className="pt-0">
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="grid items-center gap-8 rounded-3xl border border-black/10 bg-white p-6 sm:p-10 lg:grid-cols-2"
            >
              <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-small-semibold text-primary">
                  <step.icon className="h-4 w-4" /> {step.kicker}
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {step.title}
                </h2>
                <p className="mt-4 text-large-medium text-foreground/70">{step.body}</p>
                <ul className="mt-5 space-y-2.5">
                  {step.points.map((p) => (
                    <li key={p} className="flex items-center gap-3 text-regular-medium">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                <StepVisual index={i} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Spaced repetition */}
      <Section width="sm" className="bg-white text-center">
        <Repeat className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Spaced to stay
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-large-medium text-foreground/70">
          Words come back around at the right moments and your progress is tracked across days,
          weeks, months and years — so long-term recall is the whole point, not a happy accident.
        </p>
      </Section>

      {/* Mastery ladder recap */}
      <Section width="sm">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          Every word, on a journey
        </h2>
        <div className="mt-10 flex flex-col gap-3">
          {MASTERY_STATES.map((state, i) => (
            <div
              key={state.label}
              className="flex items-center gap-4 rounded-xl border border-black/10 bg-white p-4"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bone text-small-semibold text-foreground/60">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-medium-semibold">{state.label}</p>
                <p className="text-small-regular text-foreground/60">{state.note}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-small-regular text-foreground/50">
          Once a word is learned it never slips below learned — so progress feels fair, not
          punishing.
        </p>
        <div className="mt-8 text-center">
          <Button asChild size="xl">
            <Link href="/signup">Try it free</Link>
          </Button>
        </div>
      </Section>

      <div className="pb-20">
        <FinalCTA heading="See how much you actually remember." />
      </div>
    </>
  );
}

function StepVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="rounded-2xl border border-black/10 bg-bone p-6">
        <div className="grid aspect-[4/3] place-items-center rounded-xl bg-gradient-to-br from-primary/15 via-beige to-warning/15">
          <span className="text-6xl">🐈</span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
            <Volume2 className="h-4 w-4" />
          </span>
          <p className="text-large-semibold">
            le chat <span className="font-normal text-foreground/50">— the cat</span>
          </p>
        </div>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="rounded-2xl border border-black/10 bg-bone p-6">
        <p className="text-small-medium text-foreground/50">the cat</p>
        <div className="mt-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-large-semibold">
          le ch<span className="rounded bg-destructive/15 px-0.5 text-destructive">a</span>t
        </div>
        <p className="mt-3 text-small-regular text-foreground/60">
          Almost — one letter off. Here&rsquo;s exactly where.
        </p>
        <div className="mt-4 flex gap-1.5">
          <span className="h-2 flex-1 rounded-full bg-warning" />
          <span className="h-2 flex-1 rounded-full bg-black/10" />
          <span className="h-2 flex-1 rounded-full bg-black/10" />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-black/10 bg-bone p-6 text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-success px-4 py-1.5 text-small-semibold text-white">
        <Trophy className="h-4 w-4" /> Mastered
      </div>
      <div className="mt-5 flex items-center justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2.5 w-16 rounded-full bg-success" />
        ))}
      </div>
      <p className="mt-3 text-regular-medium text-foreground/70">3 perfect answers in a row</p>
    </div>
  );
}
