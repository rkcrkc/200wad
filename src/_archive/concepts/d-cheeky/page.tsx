import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Newsreader, Space_Mono } from "next/font/google";
import { DEMO_WORDS, WALL_WORDS } from "@/components/marketing/demo/demoWords";
import { MARKETING_STATS } from "@/lib/marketing/content";
import { DemoPanel } from "../d/DemoPanel";
import "../d/concept-d.css";

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
  title: "200 Words a Day — A frog boots a strawberry into the net. That's Italian.",
  description:
    "Learn a bit of French, Spanish, German or Italian with cartoons too daft to forget. See the picture, remember the word — 1,000+ per course. Free to start, no card.",
  alternates: { canonical: "/home/d-cheeky" },
  // Landing-page concept variant — keep it out of the index to avoid duplicate content.
  robots: { index: false, follow: true },
};

const fragola = DEMO_WORDS[0];
const tegame = DEMO_WORDS[1];

/**
 * Landing-page Concept D (cheeky variant) — Tone of Voice v2.
 * Same brand CSS/comic demo as /home/d, copy rewritten in the laid-back,
 * self-deprecating "mate who's brilliant at this" voice. Persona: the regular
 * joe/lass who just wants a bit of French, not fluency. Brand rule honoured:
 * one blue CTA per screen; yellow marker is emphasis only, pink is
 * social-proof/reassurance only.
 */
export default function ConceptDCheeky() {
  return (
    <div className={`concept-d ${newsreader.variable} ${spaceMono.variable} flex min-h-screen flex-col`}>
      {/* NAV */}
      <header className="border-b-2 border-[var(--ink)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/home/d-cheeky" className="pill yellow !no-underline">
            200 Words a Day
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6">
            <a href="#method" className="eyebrow hidden hover:text-[var(--ink)] sm:block">
              Method
            </a>
            <Link href="/pricing" className="eyebrow hidden hover:text-[var(--ink)] sm:block">
              Pricing
            </Link>
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
        {/* HERO */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="eyebrow">A serious vocabulary method. No, honestly.</p>
              <h1 className="h-hero mt-4">
                A frog boots a strawberry into the net.{" "}
                <span className="mark">That&rsquo;s Italian.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg ink-soft">
                We teach a bit of French, Spanish, German and Italian with cartoons far too
                daft to forget. Look at the silly picture, remember the word, sound less
                like a lost tourist. 1,000+ words per course — nick as many as you fancy.
              </p>
              <div className="mt-8">
                <Link href="/signup" className="btn big">
                  Go on then — it&rsquo;s free
                </Link>
                <p className="eyebrow mt-3">No card · the free lessons are yours to keep</p>
              </div>
            </div>
            <DemoPanel />
          </div>
        </section>

        {/* GROUNDING */}
        <section id="method" className="border-y-2 border-[var(--ink)] bg-[var(--card)]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="h-sec">Looks daft. Works properly.</h2>
                <p className="mt-5 text-lg ink-soft">
                  The daftness is the whole trick. Sound-alike pictures are the exact same
                  memory hack the champions use to memorise a shuffled deck of cards — we&rsquo;ve
                  just been pointing it at vocabulary since 2004. The sillier the scene, the
                  harder it is to shake.
                </p>
                <p className="mt-4 text-lg ink-soft">
                  And you don&rsquo;t have to dream any of it up yourself. Every cartoon&rsquo;s
                  already drawn, with a real human saying the word and an example sentence to
                  match. You just show up.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="pill yellow">At it since 2004</span>
                  <span className="pill">Proper memory science — no woo</span>
                  <span className="pill">Real voices, not a robot</span>
                </div>
              </div>
              <div className="card card-sm border-dashed p-6" style={{ background: "var(--pink-soft)" }}>
                <p className="quote text-xl">
                  [Placeholder — real learner quote about the cartoon popping into their
                  head to be dropped in before launch. Genuine testimonials only.]
                </p>
                <p className="eyebrow mt-4">— Real learner, pending</p>
              </div>
            </div>
          </div>
        </section>

        {/* GENDER TRIGGERS */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <h2 className="h-sec">
              Stop guessing <span className="text-le">le</span> or{" "}
              <span className="text-la">la</span> and hoping.
            </h2>
            <p className="mt-5 text-lg ink-soft">
              Feminine word? The cartoon stars a woman. Masculine? A bloke. The frog in la
              fragola is a she, so the gender just tags along with the word — no tables, no
              chanting, no coin-flipping in the middle of a sentence.
            </p>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 sm:gap-10">
            <GenderCard
              image={fragola.image}
              alt={fragola.alt}
              article="la"
              rest="fragola"
              gender="f"
              caption="strawberry · she scores, so it's feminine"
              tilt={false}
            />
            <GenderCard
              image={tegame.image}
              alt={tegame.alt}
              article="il"
              rest="tegame"
              gender="m"
              caption="pan · Mr T's in charge, so it's masculine"
              tilt
            />
          </div>
        </section>

        {/* WORD WALL */}
        <section className="border-y-2 border-[var(--ink)]" style={{ background: "var(--paper-2)" }}>
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <div className="max-w-2xl">
              <h2 className="h-sec">1,000+ words a course. All this daft.</h2>
              <p className="mt-5 text-lg ink-soft">
                Food, travel, people, numbers, verbs — beginner to showing-off, one silly
                scene at a time. {MARKETING_STATS.words} words across{" "}
                {MARKETING_STATS.languages} languages, not that anyone&rsquo;s counting.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-3">
              {WALL_WORDS.map((w, i) => (
                <figure key={w.headword} className={`panel ${i % 2 === 1 ? "tilt-r" : ""} !p-3`}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[6px] border-2 border-[var(--ink)] bg-white">
                    <Image
                      src={w.image}
                      alt={w.alt}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 340px"
                      className="object-contain"
                    />
                  </div>
                  <figcaption className="eyebrow mt-2 text-center">
                    <span className={w.gender === "f" ? "text-la" : "text-le"}>
                      {w.headword}
                    </span>{" "}
                    — {w.english}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* COMPLEMENT */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="h-sec">Keep your streak. We&rsquo;re not the jealous type.</h2>
              <p className="mt-5 text-lg ink-soft">
                Duolingo, Babbel, your Tuesday class, your tutor — hang onto the lot.
                They&rsquo;re grand at grammar and getting you talking; they&rsquo;re just a
                bit stingy with actual words. That&rsquo;s our job. We&rsquo;re the vocab bit
                that makes everything else click — not one more app to feel guilty about.
              </p>
            </div>
            <div className="flex flex-wrap content-center gap-3">
              <span className="pill">Your app does the grammar</span>
              <span className="pill">Your tutor gets you chatting</span>
              <span className="pill yellow">We hand you the words</span>
            </div>
          </div>
        </section>

        {/* FREE TIER + SWEEP */}
        <section className="mx-auto max-w-4xl px-5 pb-16 sm:px-8 sm:pb-24">
          <div className="card p-8 sm:p-12">
            <h2 className="h-sec">Free. The actually-free kind.</h2>
            <p className="mt-4 max-w-2xl text-lg ink-soft">
              All four languages. The first {MARKETING_STATS.freeLessons} lessons of every
              course. No card, and the free lessons stay yours forever. If none of it
              sticks, you&rsquo;re out nothing but a few minutes with a football-playing
              frog — and honestly, that&rsquo;s a decent few minutes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="pill pink">Works on your phone</span>
              <span className="pill pink">Progress saved to your account</span>
              <span className="pill pink">Miss a week? Pick right up</span>
              <span className="pill pink">Cancel in two clicks</span>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="border-t-2 border-[var(--ink)] bg-[var(--card)]">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 sm:py-24">
            <p className="eyebrow">One last thing</p>
            <h2 className="h-sec mt-3">Still thinking about that frog?</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg ink-soft">
              Yeah — that&rsquo;s the whole point. Now picture a thousand more where she
              came from.
            </p>
            <div className="mt-8">
              <Link href="/signup" className="btn big">
                Go on then — it&rsquo;s free
              </Link>
              <p className="eyebrow mt-3">No card · all four languages</p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t-2 border-[var(--ink)]" style={{ background: "var(--paper-2)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8">
          <p className="eyebrow">200 Words a Day — the vocab that actually sticks</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { href: "/pricing", label: "Pricing" },
              { href: "/login", label: "Log in" },
              { href: "/terms", label: "Terms" },
              { href: "/privacy", label: "Privacy" },
              { href: "/refunds", label: "Refunds" },
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

function GenderCard({
  image,
  alt,
  article,
  rest,
  gender,
  caption,
  tilt,
}: {
  image: string;
  alt: string;
  article: string;
  rest: string;
  gender: "f" | "m";
  caption: string;
  tilt: boolean;
}) {
  return (
    <figure className={`panel ${tilt ? "tilt-r" : ""}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[8px] border-2 border-[var(--ink)] bg-white">
        <Image
          src={image}
          alt={alt}
          fill
          sizes="(max-width: 640px) 90vw, 480px"
          className="object-contain"
        />
      </div>
      <figcaption className="mt-3">
        <p className="text-xl font-bold">
          <span className={gender === "f" ? "text-la" : "text-le"}>{article}</span> {rest}
        </p>
        <p className="eyebrow mt-1">{caption}</p>
      </figcaption>
    </figure>
  );
}
