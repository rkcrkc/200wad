import type { Metadata } from "next";
import Link from "next/link";
import { Check, Ear, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/Section";
import { COMPANION_PRODUCTS, MARKETING_STATS, TOPICS } from "@/lib/marketing/content";
import { DemoCard } from "./DemoCard";

export const metadata: Metadata = {
  title: "200 Words a Day — You know the word. It just won't come out.",
  description:
    "200 Words a Day plants French, Spanish, German and Italian vocabulary in your memory with absurd little cartoons — so the word is there when you open your mouth. Works alongside whatever you already use. Start free.",
  alternates: { canonical: "/home/c" },
  // Landing-page concept variant — keep it out of the index to avoid duplicate content.
  robots: { index: false, follow: true },
};

/**
 * Landing-page Concept C — "Proof first, blank-moment voice".
 * See docs/LANDING_PAGE_CONCEPTS_PLAN.md for the strategy, 4-question-test
 * annotations and the objections deliberately addressed/omitted.
 */
export default function ConceptC() {
  return (
    <div className="flex min-h-screen flex-col bg-bone text-foreground">
      {/* NAV */}
      <header className="border-b border-black/5">
        <div className="mx-auto flex max-w-content-lg items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/home/c" className="font-display text-large-semibold tracking-tight">
            200 Words a Day
          </Link>
          <nav className="flex items-center gap-2 sm:gap-6">
            <a href="#method" className="hidden text-regular-medium text-foreground/70 hover:text-foreground sm:block">
              How it works
            </a>
            <Link href="/pricing" className="hidden text-regular-medium text-foreground/70 hover:text-foreground sm:block">
              Pricing
            </Link>
            <Link href="/login" className="hidden text-regular-medium text-foreground/70 hover:text-foreground sm:block">
              Log in
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Start free</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <Section width="lg" className="pt-12 sm:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div>
              <p className="text-small-semibold uppercase tracking-wide text-primary">
                Vocabulary for French · Spanish · German · Italian
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
                You know the word.
                <br />
                It just won&rsquo;t <span className="text-primary">come out</span>.
              </h1>
              <p className="mt-6 max-w-xl text-large-medium text-foreground/70">
                200 Words a Day plants each word in your memory with a ridiculous little
                cartoon — so when you reach for it mid-sentence, the picture hands it to
                you. Built to sit alongside whatever app, class or tutor you already use.
              </p>
              <div className="mt-8">
                <Button asChild size="xl">
                  <Link href="/signup">Start remembering — free</Link>
                </Button>
                <p className="mt-3 text-small-regular text-foreground/50">
                  No card · All {MARKETING_STATS.languages} languages · The free lessons are
                  yours forever
                </p>
              </div>
            </div>
            <DemoCard />
          </div>
        </Section>

        {/* RECOGNISE VS RECALL */}
        <Section width="md" className="bg-white">
          <div className="text-center">
            <p className="text-small-semibold uppercase tracking-wide text-primary">The wall</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Recognising isn&rsquo;t remembering.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
              Multiple-choice made the word look familiar. Speaking is different: you have
              to pull it out of thin air, mid-sentence, with someone waiting. That&rsquo;s
              recall — and it&rsquo;s the bit most tools never train.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-bone p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-foreground/50">
                <Ear className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-large-semibold">What your app tests</h3>
              <p className="mt-2 text-regular-medium text-foreground/70">
                See the word, pick it from four options, feel fluent-ish. Recognition is
                easy — the answer is on the screen.
              </p>
            </div>
            <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-primary">
                <MessageCircleQuestion className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-large-semibold">What speaking demands</h3>
              <p className="mt-2 text-regular-medium text-foreground/70">
                A blank line and a ticking clock. No options, no hints — just you, reaching
                for a word that has to be <em>there</em>.
              </p>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-large-medium text-foreground/70">
            Memory triggers are retrieval cues. See the picture once, and when you need the
            word, <span className="font-semibold text-foreground">the picture finds it for you</span>.
          </p>
        </Section>

        {/* HOW IT WORKS */}
        <Section width="md" id="method">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
              A few minutes a day. No lists, no grinding.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <MethodStep
              n={1}
              title="See the picture"
              body="Every word gets a hand-drawn cartoon linking its sound to something absurd. A frog scoring a goal with a strawberry is la fragola. You couldn't forget it if you tried."
            />
            <MethodStep
              n={2}
              title="Learn the gender free of charge"
              body="Feminine words star a female character, masculine words a male one. You absorb le or la with the word itself — never guess again."
            />
            <MethodStep
              n={3}
              title="Prove it, then keep it"
              body="Type the answer and get honest, character-level feedback. Words come back a day, a week and a month later — three perfect tests in a row and a word is mastered."
            />
          </div>
        </Section>

        {/* COMPLEMENT STRIP */}
        <Section width="md" className="bg-beige/60">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Keep your streak. Keep your tutor.
              </h2>
              <p className="mt-5 text-large-medium text-foreground/70">
                We&rsquo;re not here to replace Duolingo, your class or your tutor —
                they&rsquo;re good at what they do. They&rsquo;re just short on vocabulary.
                Do the words with us, and everything else you&rsquo;re doing gets easier.
              </p>
            </div>
            <div className="grid gap-3">
              {COMPANION_PRODUCTS.slice(0, 3).map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-4 rounded-xl border border-black/10 bg-white px-5 py-4"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                    <Check className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-medium-semibold">{p.name}</p>
                    <p className="text-small-regular text-foreground/60">{p.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* DEPTH */}
        <Section width="md">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Enough words to learn for years
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
              1,000+ words per course, beginner to advanced — from your first words to
              native proverbs.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-4">
            <Stat value={MARKETING_STATS.words} label="words to master" />
            <Stat value={MARKETING_STATS.lessons} label="bite-sized lessons" />
            <Stat value={String(MARKETING_STATS.courses)} label="structured courses" />
            <Stat value={String(MARKETING_STATS.languages)} label="languages" />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {TOPICS.slice(0, 8).map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-small-medium text-foreground/70"
              >
                {topic}
              </span>
            ))}
          </div>
        </Section>

        {/* TESTIMONIALS — placeholder-flagged until real quotes are supplied */}
        <Section width="md" className="bg-white">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              &ldquo;It&rsquo;s staying in my head — a first.&rdquo;
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
              Twenty years of learners, and the same theme keeps coming up: the words are
              still there later.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-dashed border-black/20 bg-bone p-6">
                <p className="text-regular-medium italic text-foreground/50">
                  [Placeholder — real learner quote about retention to be dropped in before
                  launch. Must be a genuine testimonial.]
                </p>
                <p className="mt-4 text-small-semibold text-foreground/40">— Real learner, pending</p>
              </div>
            ))}
          </div>
        </Section>

        {/* FREE TIER + REASSURANCE SWEEP */}
        <Section width="sm">
          <div className="rounded-3xl border border-black/10 bg-white px-6 py-12 text-center sm:px-12">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Try it properly, free
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-large-medium text-foreground/70">
              The free tier isn&rsquo;t a tease: all four languages, the first{" "}
              {MARKETING_STATS.freeLessons} lessons of every course, no card. If the words
              don&rsquo;t stick, you&rsquo;ve lost nothing.
            </p>
            <ul className="mx-auto mt-7 grid max-w-md gap-2.5 text-left">
              {[
                "Works on your phone, on the commute",
                "Progress lives in your account, on any device",
                "Miss a week? Pick up exactly where you left off",
                "Cancel in two clicks — no phone calls, no guilt",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-regular-medium text-foreground/70">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                    <Check className="h-3 w-3" />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <Button asChild size="xl" className="mt-8">
              <Link href="/signup">Start remembering — free</Link>
            </Button>
          </div>
        </Section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto flex max-w-content-lg flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8">
          <p className="text-small-medium text-foreground/60">
            200 Words a Day — the vocabulary that sticks.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { href: "/pricing", label: "Pricing" },
              { href: "/login", label: "Log in" },
              { href: "/terms", label: "Terms" },
              { href: "/privacy", label: "Privacy" },
              { href: "/refunds", label: "Refunds" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-small-regular text-foreground/50 hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}

function MethodStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-medium-semibold text-white">
        {n}
      </span>
      <h3 className="mt-5 text-large-semibold">{title}</h3>
      <p className="mt-2 text-regular-medium text-foreground/70">{body}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 text-center">
      <p className="text-4xl font-semibold tracking-tight text-primary">{value}</p>
      <p className="mt-1 text-small-regular text-foreground/60">{label}</p>
    </div>
  );
}
