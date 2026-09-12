import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Newsreader, Spline_Sans_Mono } from "next/font/google";
import { ArrowRight, Check, ChevronRight, Star } from "lucide-react";
import { MARKETING_FAQS, TOPICS } from "@/lib/marketing/content";
import { DEMO_WORDS, WALL_WORDS } from "@/components/marketing/demo/demoWords";
import { HERO_LANGUAGES } from "../e/heroTriggerData";
import { FaqAccordion } from "../e/FaqAccordion";
import { HeroTrigger } from "./HeroTrigger";
import { ProgressShowcase } from "./ProgressShowcase";
import { PricingCards } from "./PricingCards";
import { EmailCapture } from "./EmailCapture";
import "../d/concept-d.css";
import "./concept-f.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400", "500"],
  variable: "--font-quote-d",
});

// Concept F swaps the eyebrow face to Spline Sans Mono (exposed as --font-mono-d,
// which .concept-d .eyebrow already reads from).
const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-d",
});

export const metadata: Metadata = {
  title: "200 Words a Day — The stupidly easy way to learn French vocab that sticks",
  description:
    "The stupidly easy way to learn French vocab that sticks — every word hooked onto an absurd cartoon you can't forget. Spanish, German & Italian coming soon. 10 lessons free per language, no card.",
  alternates: { canonical: "/home/f" },
  // Landing-page concept variant — keep it out of the index to avoid duplicate content.
  robots: { index: false, follow: true },
};

const BANNER_MESSAGES = [
  "🇫🇷 FRENCH AVAILABLE NOW",
  "🇪🇸🇩🇪🇮🇹 SPANISH, GERMAN & ITALIAN COMING SOON",
  "10 LESSONS FREE PER LANGUAGE",
];

const HERO_BENEFITS = ["Learn 1000s of words", "Start with just 10 mins a day", "Recall words years later"];

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

/** Word cartoons reused across the how-it-works fans. */
const GALLERY = [...DEMO_WORDS, ...WALL_WORDS];

const TESTIMONIALS = [
  { quote: "I learned 2,000 Spanish words within a week!", name: "Rolf J. Backström" },
  {
    quote:
      "Your 200 Words A Day German course is excellent. It is so much fun and the retention levels are absolutely fabulous even after a month of using.",
    name: "Steve A, Australia",
  },
  {
    quote: "I completed 41 lessons with a total vocabulary of 1,048 palabras (words) in less than two months!",
    name: "Doug Roy, UK",
  },
  { quote: "It is hard to keep from grinning at the cartoons — and somehow the words just stay put.", name: "Marie L, France" },
];

const COMPETITOR_FEATURES = [
  { title: "Duolingo & apps", body: "Great for a daily habit — we make the words they teach you actually stick." },
  { title: "Tutors & classroom", body: "They get you talking; we hand you the vocab so you've got something to say." },
  { title: "Watching tv & self study", body: "Bank the words you meet in the wild instead of letting them slip away." },
];

const TESTING_FEATURES = [
  { title: "Test yourself", body: "Type the answer and get honest, letter-by-letter marking — points every time you nail it." },
  { title: "See your progress", body: "Get a word right three times running and it's yours: mastered, banked, done." },
  { title: "Grow your vocab", body: "Watch your running word count climb, session after session." },
];

const BLOG_POSTS = [
  { tag: "Article", title: "100 reasons to learn a language" },
  { tag: "Article", title: "Learning languages the 200 Words a Day way" },
  { tag: "Article", title: "The science behind why funny beats boring" },
];

const FAQS = [
  ...MARKETING_FAQS,
  {
    q: "I bought your course before — is it the same?",
    a: "Same quirky method and the same much-loved cartoons you remember, now rebuilt as a proper online app with testing, progress and streaks. If you're a returning customer, get in touch and we'll get you sorted.",
  },
];

/**
 * Landing-page Concept F (RC) — the refreshed homepage, built on the Concept D
 * brand tokens with the evolved Concept F skin (.concept-f: white 30px cards,
 * blue primary buttons, tan pills, Spline Sans Mono eyebrows). Real course data
 * (topics, demo cartoons, hero triggers, FAQs) is wired in where it exists;
 * marketing imagery and testimonials are placeholders/quoted copy for now.
 */
export default function ConceptF() {
  return (
    <div
      className={`concept-d concept-f ${newsreader.variable} ${splineMono.variable} flex min-h-screen flex-col`}
    >
      {/* 1 · ANNOUNCEMENT BANNER */}
      <div className="border-b-2 border-[var(--ink)] bg-[var(--ink)] py-2 text-[color:var(--paper)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-1 px-5 text-center sm:flex-row sm:px-8">
          {BANNER_MESSAGES.map((m) => (
            <span key={m} className="eyebrow !text-[color:var(--paper)]">
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* NAV */}
      <header className="border-b-2 border-[var(--ink)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/home/f" className="text-lg font-extrabold !no-underline" style={{ fontFamily: "var(--font-bricolage)" }}>
            200 Words a Day
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6">
            <a href="#how" className="eyebrow hidden hover:text-[var(--ink)] sm:block">How it works</a>
            <a href="#about" className="eyebrow hidden hover:text-[var(--ink)] sm:block">About</a>
            <a href="#pricing" className="eyebrow hidden hover:text-[var(--ink)] sm:block">Pricing</a>
            <Link href="/login" className="eyebrow hidden hover:text-[var(--ink)] sm:block">Login</Link>
            <Link href="/signup" className="btn ghost">Start free</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* 2 · HERO */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
            <div>
              <p className="eyebrow flex items-center gap-2">
                <span className="inline-flex" aria-hidden>
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-[var(--marker-2)] text-[var(--marker-2)]" />
                  ))}
                </span>
                1,000+ learners around the world
              </p>
              <h1 className="h-hero mt-4">
                The stupidly easy way to learn French vocab that <span className="mark">sticks</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg ink-soft">
                <strong className="text-[var(--ink)]">200 Words a Day</strong> helps you learn French — plus
                Spanish, German and Italian soon — by hooking every word onto a picture and a daft memory
                trigger you can&rsquo;t forget. Remember the word, sound a bit less like a lost tourist, and
                build a vocab that actually sticks.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/signup" className="btn big inline-flex items-center gap-2">
                  <span aria-hidden>🇫🇷</span> Start learning — it&rsquo;s free
                </Link>
                <Link href="/signup" className="btn ghost big inline-flex items-center gap-2">
                  Join waitlist <span aria-hidden>🇪🇸🇩🇪🇮🇹</span>
                </Link>
              </div>
              <p className="eyebrow mt-3">10 lessons free per language · No credit card needed</p>
              <div className="mt-8 flex flex-wrap gap-2.5">
                {HERO_BENEFITS.map((b) => (
                  <span key={b} className="pill inline-flex items-center gap-2 !text-[14px]">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#00c950]" aria-hidden>
                      <Check className="h-3 w-3 text-white" />
                    </span>
                    {b}
                  </span>
                ))}
              </div>
            </div>
            <HeroTrigger languages={HERO_LANGUAGES} />
          </div>
        </section>

        {/* 3 · SOCIAL PROOF */}
        <section className="mx-auto max-w-6xl px-5 pb-14 sm:px-8 sm:pb-20">
          <div className="gap-4 [column-fill:balance] sm:columns-2 lg:columns-4">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="card card-sm mb-4 break-inside-avoid p-5">
                <p className="text-[15px] leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <figcaption className="mt-4 flex items-center gap-3">
                  <Avatar />
                  <span className="eyebrow flex-1">{t.name}</span>
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-2 flex justify-center">
            <button className="pill line inline-flex items-center gap-2">
              <span className="flex -space-x-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-5 w-5 rounded-full border-2 border-[var(--ink)] bg-[var(--tan)]" />
                ))}
              </span>
              <span className="eyebrow">More reviews (100+)</span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </section>

        {/* 4 · HOW IT WORKS — intro */}
        <section id="how" className="relative overflow-hidden px-5 py-20 sm:px-8 sm:py-28">
          <Scribble className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[420px] w-[840px] -translate-x-1/2 -translate-y-1/2 text-[var(--paper-2)] md:block" />
          {/* Scattered reactions */}
          <span className="absolute left-[8%] top-[38%] hidden text-5xl lg:block" aria-hidden>😵‍💫</span>
          <span className="absolute right-[12%] top-[36%] hidden text-5xl lg:block" aria-hidden>🙈</span>
          <span className="absolute left-[28%] bottom-[14%] hidden text-4xl lg:block" aria-hidden>🤷‍♀️</span>
          <span className="absolute right-[26%] bottom-[16%] hidden text-4xl font-bold lg:block" aria-hidden>⁉️</span>
          <span className="absolute left-[26%] top-[16%] hidden -rotate-6 lg:block" aria-hidden>
            <span className="pill quote !bg-[var(--tan)] !text-[15px]">&ldquo;…Um&rdquo;</span>
          </span>
          <span className="absolute right-[22%] top-[14%] hidden rotate-3 lg:block" aria-hidden>
            <span className="pill quote !bg-[var(--tan)] !text-[15px]">&ldquo;How do you say…&rdquo;</span>
          </span>

          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="h-sec">
              Your <span className="mark">lack of vocab</span> is holding you back
            </h2>
            <p className="mt-5 text-[15px] ink-soft">
              We all know the feeling — you go to speak French, but as soon as you open your mouth, nothing
              comes out! If you don&rsquo;t know many words, you can&rsquo;t expect to say much when crunch
              time comes. That&rsquo;s why building a solid vocab of lots of words is the basis for fluency.
              The only problem is, learning vocab is a boring &amp; tedious process… until now!
            </p>
          </div>
        </section>

        {/* 4 · HOW IT WORKS — main */}
        <section className="border-y-2 border-[var(--ink)]" style={{ background: "var(--paper-2)" }}>
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">That&rsquo;s why we created 200 Words a Day</p>
              <h2 className="h-sec mt-3">
                Now learning vocab couldn&rsquo;t be easier{" "}
                <span className="ink-soft">(or more of a laugh)</span>
              </h2>
              <p className="mt-5 text-[15px] ink-soft">
                200 Words A Day solves that exact problem by giving you thousands of words, each with a wacky
                cartoon &amp; memory hook you can&rsquo;t forget. It turns vocab learning from a mind-numbing
                chore into a game — you&rsquo;ll pass hours without even realising it doesn&rsquo;t feel like
                &ldquo;study&rdquo; at all.
              </p>
            </div>

            {/* Fanned word cards */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              {GALLERY.map((w, i) => (
                <WordCard key={w.headword} word={w} rotate={(i % 5) - 2} />
              ))}
            </div>

            {/* Annotations */}
            <div className="mx-auto mt-8 grid max-w-4xl gap-6 sm:grid-cols-3">
              {["The more absurd the better", "Warning: sense of humour required", "Works even if you are the forgetful type"].map(
                (caption, i) => (
                  <div key={caption} className="flex flex-col items-center text-center">
                    <HandArrow className="h-10 w-14" flip={i === 2} />
                    <span className="mt-2 text-[14px] font-bold">{caption}</span>
                  </div>
                ),
              )}
            </div>

            {/* Numbered steps */}
            <div className="mt-16 text-center">
              <p className="eyebrow">How it works</p>
              <h3 className="h-sec mt-3 !text-[clamp(26px,3.4vw,34px)]">How it works</h3>
              <p className="mt-3 text-[15px] ink-soft">Every word comes with a cartoon that hooks in your brain</p>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[
                { n: 1, title: "See the cartoon", word: DEMO_WORDS[0] },
                { n: 2, title: "Hear the trigger", word: DEMO_WORDS[1] },
                { n: 3, title: "Remember the word", word: DEMO_WORDS[2] },
              ].map((s) => (
                <div key={s.n} className="stepcard p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--paper)] text-[13px] font-bold text-[var(--ink)]">
                      {s.n}
                    </span>
                    <span className="text-lg font-bold">{s.title}</span>
                  </div>
                  <div className="relative mt-5 aspect-[3/2] overflow-hidden rounded-[16px] border-2 border-[var(--paper)] bg-white">
                    <Image src={s.word.image} alt={s.word.alt} fill sizes="360px" className="object-contain" />
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <figure className="mx-auto mt-16 max-w-xl text-center">
              <p className="quote text-xl">
                &ldquo;Thanks for the many laughs, and thanks for making German so much easier!&rdquo;
              </p>
              <figcaption className="mt-4 flex items-center justify-center gap-3">
                <Avatar />
                <span className="eyebrow">Nita Christopher</span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* 5 · CURRICULUM */}
        <section className="border-b-2 border-[var(--ink)]" style={{ background: "var(--card)" }}>
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {TOPICS.map((topic) => (
                <div key={topic} className="wordcard flex flex-col gap-2 p-4">
                  <span className="text-2xl" aria-hidden>{CATEGORY_EMOJI[topic] ?? "📚"}</span>
                  <span className="text-[14px] font-bold leading-tight">{topic}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="eyebrow">100&rsquo;s of lessons</p>
              <h2 className="h-sec mt-3">
                Quickly build a <span className="mark">big</span> vocabulary of words
              </h2>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <span className="pill line !text-[14px]">✅ Beginner</span>
                <span className="pill line !text-[14px]">✅ Intermediate</span>
                <span className="pill line !text-[14px]">✅ Advanced</span>
              </div>
              <p className="mt-5 text-[15px] ink-soft">
                Vocab is the backbone of actually speaking a language — all the grammar in the world won&rsquo;t
                save you if your mind goes blank when you need the word. Stack up hundreds of lessons, from your
                first &ldquo;two beers, please&rdquo; to the words that get you through real life without
                pointing and grunting.
              </p>
              <Link href="/signup" className="btn mt-6 inline-block">Start now — it&rsquo;s free</Link>
            </div>
          </div>
        </section>

        {/* 6 · TESTING & PROGRESS 1 */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="eyebrow">What you&rsquo;ll learn</p>
              <h2 className="h-sec mt-3">Test yourself as you go &amp; watch your progress skyrocket</h2>
              <p className="mt-4 text-[15px] ink-soft">
                Enjoy watching your vocab grow with as little as 10 minutes study time a day.
              </p>
              <ul className="mt-8 grid gap-5">
                {TESTING_FEATURES.map((f) => (
                  <Feature key={f.title} title={f.title} body={f.body} />
                ))}
              </ul>
            </div>
            <ProgressShowcase />
          </div>
        </section>

        {/* 6 · TESTING & PROGRESS 2 (competitor) */}
        <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Placeholder className="order-2 aspect-[3/2] lg:order-1" />
            <div className="order-1 lg:order-2">
              <p className="eyebrow">What you&rsquo;ll learn</p>
              <h2 className="h-sec mt-3">Keep your other studies, but use this for vocab</h2>
              <p className="mt-4 text-[15px] ink-soft">
                200 Words a Day lets you plow through the vocab, so you can use your other tools more
                effectively for grammar, speaking and everything else.
              </p>
              <ul className="mt-8 grid gap-5">
                {COMPETITOR_FEATURES.map((f) => (
                  <Feature key={f.title} title={f.title} body={f.body} />
                ))}
              </ul>
              <Link href="/signup" className="btn mt-8 inline-block">Start now — it&rsquo;s free</Link>
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
              <span className="pill line !text-[14px]">🌐 Use any web browser</span>
              <span className="pill line !text-[14px]">💾 Progress saved to your account</span>
              <span className="pill line !text-[14px]">📱 Study on mobile too</span>
            </div>
          </div>
        </section>

        {/* 11 · FAQs */}
        <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="h-sec text-center">Frequently asked questions</h2>
          <div className="mt-10">
            <FaqAccordion items={FAQS} />
          </div>
        </section>

        {/* 10 · ABOUT */}
        <section id="about" className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-24">
          <div className="card p-6 sm:p-10">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <Placeholder className="aspect-square" />
              <div>
                <p className="eyebrow">Our story</p>
                <h2 className="h-sec mt-3">Learning vocab was such a bore, so we developed 200WAD</h2>
                <p className="mt-5 text-[15px] ink-soft">
                  200 Words a Day started as a labour of love back in 2004, and picked up thousands of
                  gloriously loyal fans who liked our quirky, not-so-serious take on learning. Trouble is, our
                  original tech creaked a little louder every year — and the &ldquo;are you ever going
                  online?&rdquo; emails kept coming. Well: here we are. French leads the way, with Spanish,
                  German and Italian right alongside, and mobile apps on the way.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <Avatar className="!h-10 !w-10" />
                  <span className="eyebrow">Kevin Crocombe, 200 Words a Day creator</span>
                </div>
                <Link href="/about" className="btn ghost mt-6 inline-flex items-center gap-2">
                  Read our story <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 4 · HOW IT WORKS — build vocab CTA */}
        <section className="mx-auto max-w-4xl px-5 pb-16 text-center sm:px-8 sm:pb-24">
          <h2 className="h-sec mx-auto max-w-2xl">Build a vocabulary of thousands of words, faster than ever!</h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {GALLERY.slice(0, 6).map((w, i) => (
              <WordCard key={w.headword} word={w} rotate={(i % 5) - 2} />
            ))}
          </div>
          <Link href="/signup" className="btn big mt-10 inline-block">Start now — it&rsquo;s free</Link>
        </section>

        {/* 13 · EMAIL CAPTURE */}
        <section className="mx-auto max-w-4xl px-5 pb-16 sm:px-8 sm:pb-24">
          <EmailCapture />
        </section>

        {/* 15 · BLOG */}
        <section className="border-y-2 border-[var(--ink)]" style={{ background: "var(--pink-soft)" }}>
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <div className="text-center">
              <p className="eyebrow">200 WAD Blog</p>
              <h2 className="h-sec mt-3">Get into the language learning spirit</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {BLOG_POSTS.map((p) => (
                <Link key={p.title} href="/blog" className="card flex flex-col p-4 !no-underline">
                  <Placeholder className="aspect-[16/9] !rounded-[16px]" />
                  <p className="eyebrow mt-4">{p.tag}</p>
                  <p className="mt-2 text-lg font-bold leading-tight">{p.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 14 · FOOTER */}
      <footer style={{ background: "var(--paper-2)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row sm:px-8">
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

function WordCard({
  word,
  rotate = 0,
}: {
  word: { headword: string; english: string; gender: "f" | "m" | null; image: string; alt: string };
  rotate?: number;
}) {
  return (
    <figure
      className="wordcard w-[150px] shrink-0 p-2"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="relative aspect-square overflow-hidden rounded-[8px] border-2 border-[var(--ink)] bg-white">
        <Image src={word.image} alt={word.alt} fill sizes="150px" className="object-contain" />
      </div>
      <figcaption className="mt-2 px-1 text-[12px] font-bold leading-tight">
        <span className={word.gender === "f" ? "text-la" : "text-le"}>{word.headword}</span>{" "}
        <span className="ink-soft font-medium">= {word.english}</span>
      </figcaption>
    </figure>
  );
}

function Avatar({ className }: { className?: string }) {
  return <span className={`h-8 w-8 shrink-0 rounded-full border-2 border-[var(--ink)] bg-[var(--tan)] ${className ?? ""}`} />;
}

function Placeholder({ className }: { className?: string }) {
  return (
    <div
      className={`grid place-items-center rounded-[24px] border-2 border-dashed border-[var(--ink-soft)] bg-[var(--paper-2)] ${className ?? ""}`}
    >
      <span className="eyebrow opacity-50">Image</span>
    </div>
  );
}

/** A rough, hand-drawn-style arrow. `flip` mirrors it horizontally. */
function HandArrow({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 80 60" className={className} aria-hidden style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M40 6 C 44 26, 40 40, 40 52" fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M30 42 L40 54 L50 42" fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Faint background brush-scribble behind the "how it works" intro heading. */
function Scribble({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 840 420" className={className} aria-hidden fill="none">
      <path
        d="M60 300 C 180 120, 260 360, 380 200 S 560 60, 680 240 S 800 360, 780 180"
        stroke="currentColor"
        strokeWidth={64}
        strokeLinecap="round"
      />
    </svg>
  );
}
