import type { Metadata } from "next";
import Link from "next/link";
import { Check, Ear, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/Section";
import { COMPANION_PRODUCTS, MARKETING_STATS, TOPICS } from "@/lib/marketing/content";
import { DemoCard } from "../c/DemoCard";

export const metadata: Metadata = {
  title: "200 Words a Day — You know this word. Your mouth just won't cough it up.",
  description:
    "Learn a bit of French, Spanish, German or Italian with cartoons too daft to forget — so the word's actually there when you open your mouth. Works alongside whatever you already use. Free to start, no card.",
  alternates: { canonical: "/home/c-cheeky" },
  // Landing-page concept variant — keep it out of the index to avoid duplicate content.
  robots: { index: false, follow: true },
};

/**
 * Landing-page Concept C (cheeky variant) — Tone of Voice v2.
 * Same structure/demo as /home/c, copy rewritten in the laid-back, self-
 * deprecating "mate who's brilliant at this" voice. Persona: the regular joe
 * who just wants a bit of French, not fluency. Jokes on the hooks; the money
 * moments (offer, price, reassurance) stay warm and unambiguous.
 */
export default function ConceptCCheeky() {
  return (
    <div className="flex min-h-screen flex-col bg-bone text-foreground">
      {/* NAV */}
      <header className="border-b border-black/5">
        <div className="mx-auto flex max-w-content-lg items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/home/c-cheeky" className="font-display text-large-semibold tracking-tight">
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
                A bit of French · Spanish · German · Italian
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
                You know this word.
                <br />
                Your mouth just <span className="text-primary">won&rsquo;t cough it up</span>.
              </h1>
              <p className="mt-6 max-w-xl text-large-medium text-foreground/70">
                We glue every word to a ridiculous little cartoon — the kind your brain
                refuses to let go of — so it&rsquo;s actually there when you need it, not
                three days later in the shower. Learn enough to order the beer, read the
                menu, and stop pointing at things like a tourist. Sits happily next to
                whatever app, class or tutor you&rsquo;re already using.
              </p>
              <div className="mt-8">
                <Button asChild size="xl">
                  <Link href="/signup">Go on then — it&rsquo;s free</Link>
                </Button>
                <p className="mt-3 text-small-regular text-foreground/50">
                  No card · All {MARKETING_STATS.languages} languages · The free lessons are
                  yours to keep (yes, actually keep)
                </p>
              </div>
            </div>
            <DemoCard />
          </div>
        </Section>

        {/* RECOGNISE VS RECALL */}
        <Section width="md" className="bg-white">
          <div className="text-center">
            <p className="text-small-semibold uppercase tracking-wide text-primary">The annoying bit</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Recognising a word ≠ remembering it.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
              Multiple choice makes a word look familiar, which feels great right up until
              you&rsquo;re stood in a café with a waiter waiting and absolutely nothing
              coming out. No little box to tap. Just you, some pigeons, and a long pause.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-bone p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-foreground/50">
                <Ear className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-large-semibold">What your app quizzes you on</h3>
              <p className="mt-2 text-regular-medium text-foreground/70">
                Spot the right word out of four. Feels clever. Isn&rsquo;t hard — the answer
                was sat right there on the screen the whole time.
              </p>
            </div>
            <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-primary">
                <MessageCircleQuestion className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-large-semibold">What real life asks for</h3>
              <p className="mt-2 text-regular-medium text-foreground/70">
                No options, no hints, no screen. Just the word — which needs to actually be
                <em> in there</em> when you go looking for it.
              </p>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-large-medium text-foreground/70">
            The daft cartoon is the cheat code: see it once, and later, when you&rsquo;re
            groping for the word, <span className="font-semibold text-foreground">the picture just hands it over</span>.
          </p>
        </Section>

        {/* HOW IT WORKS */}
        <Section width="md" id="method">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              How it works (there&rsquo;s not much to it)
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
              A few minutes a day. No endless lists, no homework guilt, no gold stars for
              showing up.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <MethodStep
              n={1}
              title="Look at the silly picture"
              body="Every word gets a hand-drawn cartoon that ties its sound to something ridiculous. A frog belting a strawberry into the net is la fragola. Try to forget it. Go on. You can't."
            />
            <MethodStep
              n={2}
              title="Nab the gender for free"
              body="Feminine words star a woman, masculine words a bloke. So le or la comes bundled in with the word — no charts, no chanting, no guessing and hoping."
            />
            <MethodStep
              n={3}
              title="Have a go, keep it for good"
              body="Type the answer and we'll mark it honestly, letter by letter. Then the word pops back a day, a week and a month later, until it's properly stuck. Faster than you can say voilà. (Okay, not quite. But you get it.)"
            />
          </div>
        </Section>

        {/* COMPLEMENT STRIP */}
        <Section width="md" className="bg-beige/60">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Keep your streak. Keep your tutor. Keep the lot.
              </h2>
              <p className="mt-5 text-large-medium text-foreground/70">
                We&rsquo;re not trying to nick you off Duolingo or your Tuesday class —
                they&rsquo;re grand at what they do. They&rsquo;re just a bit thin on actual
                words. Do the vocab with us and everything else you&rsquo;re doing suddenly
                gets a whole lot easier.
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
              More words than you&rsquo;ll ever need (in a good way)
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
              1,000+ words per course, from &ldquo;two beers please&rdquo; all the way up to
              showing off at dinner parties. Dip in for a fortnight or stick around for
              years — no pressure either way.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-4">
            <Stat value={MARKETING_STATS.words} label="words to nab" />
            <Stat value={MARKETING_STATS.lessons} label="bite-sized lessons" />
            <Stat value={String(MARKETING_STATS.courses)} label="proper courses" />
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
              &ldquo;It&rsquo;s actually staying in my head. Weird.&rdquo;
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
              Twenty-odd years of learners and the same happy surprise keeps coming up: the
              words are still there later.
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
              Free. Actually free.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-large-medium text-foreground/70">
              Not &ldquo;free, now pop your card in&rdquo; free. All four languages, the
              first {MARKETING_STATS.freeLessons} lessons of every course, no card, kept
              forever. If none of it sticks, you&rsquo;ve lost nothing but a few minutes and
              a football-playing frog.
            </p>
            <ul className="mx-auto mt-7 grid max-w-md gap-2.5 text-left">
              {[
                "Works on your phone, on the bus, in the queue",
                "Your progress follows you around on any device",
                "Vanish for a week? It'll be right where you left it",
                "Cancel in two clicks — no phone calls, no awkwardness",
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
              <Link href="/signup">Go on then — it&rsquo;s free</Link>
            </Button>
          </div>
        </Section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto flex max-w-content-lg flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8">
          <p className="text-small-medium text-foreground/60">
            200 Words a Day — the vocab that actually sticks.
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
