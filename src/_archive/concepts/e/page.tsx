import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Newsreader, Space_Mono } from "next/font/google";
import { ArrowRight, Check, Crown, Save, Smartphone, Star } from "lucide-react";
import { MARKETING_FAQS, TOPICS } from "@/lib/marketing/content";
import { DEMO_WORDS, WALL_WORDS } from "@/components/marketing/demo/demoWords";
import { HERO_LANGUAGES } from "./heroTriggerData";
import { HeroTriggers } from "./HeroTriggers";
import { ProgressShowcase } from "./ProgressShowcase";
import { PricingCards } from "./PricingCards";
import { FaqAccordion } from "./FaqAccordion";
import { EmailCapture } from "./EmailCapture";
import "../d/concept-d.css";
import "./concept-e.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400", "500"],
  variable: "--font-quote-d",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono-d",
});

export const metadata: Metadata = {
  title: "200 Words a Day — The stupidly easy way to learn French that sticks",
  description:
    "The stupidly easy way to learn French (plus Spanish, German & Italian) — every word hooked onto an absurd cartoon you can't forget. 10 lessons free per language, no card.",
  alternates: { canonical: "/home/e" },
  // Landing-page concept variant — keep it out of the index to avoid duplicate content.
  robots: { index: false, follow: true },
};

const FLAGS = ["🇫🇷", "🇪🇸", "🇩🇪", "🇮🇹"];

const BANNER_MESSAGES = [
  "🇫🇷 French now available",
  "🇪🇸 🇩🇪 🇮🇹 Spanish, German & Italian too",
  "10 lessons free per language — no card",
  "Getting words to stick since 2004",
];

const GALLERY = [...DEMO_WORDS, ...WALL_WORDS];

const CATEGORY_EMOJI: Record<string, string> = {
  "Food & drink": "🍷",
  "Family & people": "👨‍👩‍👧",
  "Travel & directions": "🧭",
  "Numbers & time": "⏰",
  "Home & everyday life": "🏠",
  "Work & school": "💼",
  "Shopping & money": "🛍️",
  "Health & the body": "🩺",
  "Nature & animals": "🦊",
  "Verbs & adjectives": "⚡",
};

const LEADERBOARD = [
  { rank: 1, name: "Marie-Claire", xp: 1840 },
  { rank: 2, name: "Diego", xp: 1620 },
  { rank: 3, name: "You", xp: 1475, you: true },
  { rank: 4, name: "Hans", xp: 1310 },
  { rank: 5, name: "Giulia", xp: 1180 },
];

/**
 * Landing-page Concept E (RC) — the full 14-section homepage, built in the
 * Concept D brand skin (.concept-d tokens/classes + .concept-e helpers).
 * Copy: quoted spec lines used verbatim; everything else written to match.
 * Positioning: French leads the messaging, all four languages available.
 */
export default function ConceptE() {
  return (
    <div
      className={`concept-d concept-e ${newsreader.variable} ${spaceMono.variable} flex min-h-screen flex-col`}
    >
      {/* 1 · ANNOUNCEMENT BANNER */}
      <div className="marquee border-b-2 border-[var(--ink)] bg-[var(--ink)] py-2 text-[color:var(--paper)]">
        <div className="marquee__track">
          {[...BANNER_MESSAGES, ...BANNER_MESSAGES].map((m, i) => (
            <span key={i} className="eyebrow !text-[color:var(--paper)]">
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* NAV */}
      <header className="border-b-2 border-[var(--ink)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/home/e" className="pill yellow !no-underline">
            200 Words a Day
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6">
            <a href="#how" className="eyebrow hidden hover:text-[var(--ink)] sm:block">
              How it works
            </a>
            <a href="#pricing" className="eyebrow hidden hover:text-[var(--ink)] sm:block">
              Pricing
            </a>
            <Link href="/login" className="eyebrow hidden hover:text-[var(--ink)] sm:block">
              Log in
            </Link>
            <Link href="/signup" className="btn ghost">
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* 2 · HERO */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="eyebrow flex items-center gap-2">
                <span className="inline-flex" aria-hidden>
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-[var(--marker-2)] text-[var(--ink)]" />
                  ))}
                </span>
                Getting words to stick since 2004
              </p>
              <h1 className="h-hero mt-4">
                The stupidly easy way to learn French that{" "}
                <span className="mark">sticks</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg ink-soft">
                <strong className="text-[var(--ink)]">200 Words a Day</strong> helps you learn
                French — plus Spanish, German and Italian — by hooking every word onto a daft
                little cartoon your brain refuses to let go of. See the picture, remember the
                word, sound a bit less like a lost tourist.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <div>
                  <Link href="/signup" className="btn big">
                    Start learning — it&rsquo;s free
                  </Link>
                  <p className="eyebrow mt-2">10 lessons free per language · No credit card needed</p>
                </div>
                <div className="flex items-center -space-x-2">
                  {FLAGS.map((f, i) => (
                    <span
                      key={f}
                      style={{ zIndex: FLAGS.length - i }}
                      className="grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--ink)] bg-white text-lg shadow-[var(--shadow-sm)]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <HeroTriggers languages={HERO_LANGUAGES} />
          </div>
        </section>

        {/* 3 · SOCIAL PROOF */}
        <section className="border-y-2 border-[var(--ink)] bg-[var(--card)]">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <h2 className="h-sec text-center">Join thousands of learners</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-[15px] ink-soft">
              20,000+ people have learned with our little cartoons. Here&rsquo;s what a few of
              them say.
            </p>
            <div className="mt-8 flex snap-x gap-4 overflow-x-auto pb-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <figure
                  key={i}
                  className="card card-sm w-[280px] shrink-0 snap-start border-dashed p-5"
                >
                  <p className="quote text-lg">
                    [Placeholder — real learner testimonial to be dropped in before launch.
                    Genuine quotes only.]
                  </p>
                  <figcaption className="eyebrow mt-4">— Real learner, pending</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* 4 · HOW IT WORKS */}
        <section id="how" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="h-sec mt-3">
              Every word comes with an absurd cartoon you can&rsquo;t forget!
            </h2>
          </div>

          {/* Callouts with hand-drawn arrows */}
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              "The more absurd the better",
              "Works even if you are the forgetful type",
              "Warning: sense of humour required",
            ].map((caption, i) => (
              <div key={caption} className="flex flex-col items-center text-center">
                <span className="pill yellow">{caption}</span>
                <HandArrow className="mt-1 h-10 w-16" flip={i === 2} />
              </div>
            ))}
          </div>

          {/* Cartoon gallery */}
          <div className="-mt-2 flex snap-x gap-5 overflow-x-auto pb-4">
            {GALLERY.map((w, i) => (
              <figure
                key={w.headword}
                className={`panel ${i % 2 === 1 ? "tilt-r" : ""} w-[220px] shrink-0 snap-start !p-3`}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-[6px] border-2 border-[var(--ink)] bg-white">
                  <Image
                    src={w.image}
                    alt={w.alt}
                    fill
                    sizes="220px"
                    className="object-contain"
                  />
                </div>
                <figcaption className="eyebrow mt-2 text-center">
                  <span className={w.gender === "f" ? "text-la" : "text-le"}>{w.headword}</span> —{" "}
                  {w.english}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* 5 · CURRICULUM */}
        <section className="border-y-2 border-[var(--ink)]" style={{ background: "var(--paper-2)" }}>
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2">
            <div>
              <h2 className="h-sec">100s of lessons per language</h2>
              <p className="mt-5 text-lg ink-soft">
                Vocab is the backbone of actually speaking a language — all the grammar in the
                world won&rsquo;t save you if your mind goes blank when you need the word. Stack
                up hundreds of lessons, from your first &ldquo;two beers, please&rdquo; to the
                words that get you through real life without pointing and grunting.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="pill">✅ Beginner</span>
                <span className="pill">✅ Intermediate</span>
                <span className="pill">✅ Advanced</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TOPICS.map((topic) => (
                <div key={topic} className="card card-sm flex flex-col gap-1 p-4">
                  <span className="text-2xl" aria-hidden>
                    {CATEGORY_EMOJI[topic] ?? "📚"}
                  </span>
                  <span className="text-[14px] font-bold leading-tight">{topic}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6 · TESTING & PROGRESS */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <ProgressShowcase />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="h-sec">Follow the schedule or go with your own flow</h2>
              <p className="mt-3 text-lg ink-soft">
                Grow your vocab with as little as 5 minutes a day.
              </p>
              <ul className="mt-6 grid gap-4">
                <Feature
                  title="Test yourself"
                  body="Type the answer and get honest, letter-by-letter marking — points every time you nail it."
                />
                <Feature
                  title="See your progress"
                  body="Get a word right three times running and it's yours: mastered, banked, done."
                />
                <Feature
                  title="Grow your vocab"
                  body="Watch your running word count climb, session after session."
                />
              </ul>
            </div>
          </div>
        </section>

        {/* 7 · COMPETITORS */}
        <section className="border-y-2 border-[var(--ink)] bg-[var(--card)]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2">
            <div>
              <h2 className="h-sec">Works well alongside your other studies</h2>
              <p className="mt-5 text-lg ink-soft">
                Your tutor, your class, Duolingo — brilliant for grammar and getting your ear
                in, but they&rsquo;re all a bit stingy with actual words. 200WAD is the vocab
                engine that makes the rest of your studies click faster, so you hit your
                language goals sooner.
              </p>
            </div>
            <div className="relative">
              <div className="flex flex-wrap gap-3">
                <span className="pill">Your class does the grammar</span>
                <span className="pill">Duolingo keeps your ear in</span>
                <span className="pill">Your tutor gets you talking</span>
                <span className="pill yellow">We hand you the words</span>
              </div>
              <div className="mt-6 flex items-start gap-3">
                <HandArrow className="h-12 w-16 shrink-0" />
                <p className="quote text-xl">
                  Because what good is your grammar if you&rsquo;ve got no words to put in the
                  sentence!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8 · GAMIFICATION */}
        <section className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-8 sm:py-24">
          <h2 className="h-sec">Compete against others around the world</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg ink-soft">
            Every word you nail earns points, and your score this week already ranks you against
            everyone else in your league. Finish in the top three to get promoted — bragging
            rights very much included.
          </p>
          <div className="mx-auto mt-10 max-w-md">
            <div className="card p-4 text-left">
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="eyebrow">Gold League · this week</span>
                <span className="eyebrow">XP</span>
              </div>
              <ul className="grid gap-2">
                {LEADERBOARD.map((row) => (
                  <li
                    key={row.rank}
                    className={`flex items-center gap-3 rounded-[10px] border-2 border-[var(--ink)] px-3 py-2 ${
                      row.you ? "bg-[var(--marker)]" : "bg-white"
                    }`}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center text-lg">
                      {row.rank <= 3 ? ["🥇", "🥈", "🥉"][row.rank - 1] : row.rank}
                    </span>
                    <span className="flex-1 font-bold">
                      {row.name}
                      {row.you && <span className="ml-2 eyebrow">that&rsquo;s you</span>}
                    </span>
                    {row.rank === 1 && <Crown className="h-4 w-4" />}
                    <span className="font-mono text-[15px]">{row.xp.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 9 · PRICING */}
        <section id="pricing" className="border-y-2 border-[var(--ink)]" style={{ background: "var(--paper-2)" }}>
          <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
            <div className="text-center">
              <p className="eyebrow">Pricing</p>
              <h2 className="h-sec mt-3">Start free</h2>
            </div>
            <div className="mt-10">
              <PricingCards />
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <span className="pill">🌐 Use any web browser</span>
              <span className="pill">
                <Save className="h-4 w-4" /> Progress saved to your account
              </span>
              <span className="pill">
                <Smartphone className="h-4 w-4" /> Study on mobile too
              </span>
            </div>
          </div>
        </section>

        {/* 10 · ABOUT */}
        <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="card p-8 sm:p-12">
            <span className="pill yellow">Est. 2004</span>
            <h2 className="h-sec mt-4">The same course you know and love, now 100% online</h2>
            <p className="mt-5 text-lg ink-soft">
              200 Words a Day started as a labour of love back in 2004, and picked up thousands of
              gloriously loyal fans who liked our quirky, not-so-serious take on learning. Trouble
              is, our original tech creaked a little louder every year — and the &ldquo;are you
              ever going online?&rdquo; emails kept coming. Well: here we are. French leads the
              way, with Spanish, German and Italian right alongside, and mobile apps on the way.
            </p>
            <Link href="/about" className="btn ghost mt-6 inline-flex items-center gap-2">
              Read our story <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* 11 · FAQs */}
        <section className="border-t-2 border-[var(--ink)] bg-[var(--card)]">
          <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
            <div className="text-center">
              <p className="eyebrow">FAQs</p>
              <h2 className="h-sec mt-3">The bits people usually ask</h2>
            </div>
            <div className="mt-10">
              <FaqAccordion items={MARKETING_FAQS} />
            </div>
          </div>
        </section>

        {/* 12 · CLOSING CTA */}
        <section className="border-t-2 border-[var(--ink)]" style={{ background: "var(--paper-2)" }}>
          <div className="mx-auto max-w-5xl px-5 py-16 text-center sm:px-8 sm:py-24">
            <h2 className="h-sec">Try now free</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 sm:gap-8">
              <BeforeAfter
                label="You now"
                face="😵‍💫"
                tilt={false}
                bubbles={["…um", "how do you say…", "?"]}
                muted
              />
              <BeforeAfter
                label="You soon"
                face="😄"
                tilt
                bubbles={["bonjour!", "una fragola", "¡vamos!", "danke!"]}
              />
            </div>
            <div className="mt-10">
              <Link href="/signup" className="btn big">
                Start learning — it&rsquo;s free
              </Link>
              <p className="eyebrow mt-3">10 lessons free per language · No card</p>
            </div>
          </div>
        </section>

        {/* 13 · EMAIL CAPTURE */}
        <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
          <EmailCapture />
        </section>
      </main>

      {/* 14 · FOOTER */}
      <footer className="border-t-2 border-[var(--ink)]" style={{ background: "var(--paper-2)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8">
          <p className="eyebrow">200 Words a Day — the vocab that actually sticks</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { href: "/pricing", label: "Pricing" },
              { href: "/login", label: "Log in" },
              { href: "/about", label: "About" },
              { href: "/terms", label: "Terms" },
              { href: "/privacy", label: "Privacy" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="eyebrow hover:text-[var(--ink)]">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--marker)]">
        <Check className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[16px] font-bold">{title}</p>
        <p className="text-[14px] ink-soft">{body}</p>
      </div>
    </li>
  );
}

/** A rough, hand-drawn-style arrow. `flip` mirrors it horizontally. */
function HandArrow({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 80 60"
      className={className}
      aria-hidden
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d="M8 8 C 34 2, 58 14, 66 44"
        fill="none"
        stroke="var(--ink)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path
        d="M55 36 L67 46 L52 50"
        fill="none"
        stroke="var(--ink)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BeforeAfter({
  label,
  face,
  bubbles,
  tilt,
  muted,
}: {
  label: string;
  face: string;
  bubbles: string[];
  tilt: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`panel ${tilt ? "tilt-r" : ""} ${muted ? "opacity-80" : ""}`}>
      <p className="eyebrow text-center">{label}</p>
      <p className="mt-2 text-center text-6xl" aria-hidden>
        {face}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {bubbles.map((b, i) => (
          <span
            key={`${b}-${i}`}
            className={`float-b pill !py-1 !text-[13px] ${muted ? "" : "yellow"}`}
            style={{ "--b-rot": `${i % 2 === 0 ? -2 : 2}deg` } as React.CSSProperties}
          >
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}
