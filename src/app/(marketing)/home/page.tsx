import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  Check,
  Star,
  Flame,
  Trophy,
  Users,
  ArrowRight,
  Puzzle,
  Volume2,
  Target,
  GraduationCap,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/Section";
import { RotatingWord } from "@/components/marketing/RotatingWord";
import { FAQ } from "@/components/marketing/FAQ";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import {
  MARKETING_LANGUAGES,
  COMPANION_PRODUCTS,
  COURSE_FAMILIES,
  TOPICS,
  METHOD_STEPS,
  MASTERY_STATES,
  MARKETING_FAQS,
  MARKETING_STATS,
} from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "200 Words a Day — Finally remember your vocab",
  description:
    "The memory layer for however you learn a language. Memory triggers + smart testing turn words you've seen into words you know — alongside whatever app, class or course you already use. Start free.",
  alternates: { canonical: "/home" },
};

export default function MarketingHome() {
  return (
    <>
      {/* 1. HERO */}
      <Section width="lg" className="pt-14 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-small-medium text-foreground/70">
              <Sparkles className="h-4 w-4 text-primary" />
              The memory layer for your language learning
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Finally remember your{" "}
              <RotatingWord words={MARKETING_LANGUAGES.map((l) => l.name)} /> vocab
              <span className="text-foreground/40"> — years later, not minutes later.</span>
            </h1>
            <p className="mt-6 max-w-xl text-large-medium text-foreground/70">
              Memory triggers and smart testing turn words you&rsquo;ve <em>seen</em> into
              words you actually <em>know</em> — alongside whatever app, class or course you
              already use.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link href="/signup">Start free — no card</Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="text-primary">
                <Link href="/how-it-works">See how it works</Link>
              </Button>
            </div>
            <p className="mt-4 text-small-regular text-foreground/50">
              First {MARKETING_STATS.freeLessons} lessons on us · No card required
            </p>
          </div>

          {/* Hero visual: a memory-trigger card mock */}
          <HeroCard />
        </div>
      </Section>

      {/* 2. TRUST BAR */}
      <div className="border-y border-black/5 bg-white">
        <div className="mx-auto flex max-w-content-lg flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-5 text-small-medium text-foreground/60 sm:px-8">
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Join {MARKETING_STATS.learners} learners
          </span>
          <span className="inline-flex items-center gap-2">
            <Star className="h-4 w-4 fill-warning text-warning" /> Loved for making words stick
          </span>
          <span className="inline-flex items-center gap-2">
            <Puzzle className="h-4 w-4 text-primary" /> Works with any app or class
          </span>
        </div>
      </div>

      {/* 3. SOUND FAMILIAR — the forgetting problem */}
      <Section width="sm" className="text-center">
        <p className="text-small-semibold uppercase tracking-wide text-primary">Sound familiar?</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Tip of your tongue&hellip; then gone.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-large-medium text-foreground/70">
          You did the lessons. You watched the videos. You sat the class. And you still blank on
          the word when it matters. That&rsquo;s not you being lazy — it&rsquo;s how memory works
          without the right triggers and a bit of testing.
        </p>
      </Section>

      {/* 4. THE MISSING PIECE — stack diagram */}
      <Section width="md">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            The missing piece in your language puzzle
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
            Most tools are great at exposing you to a language. Very few make the vocabulary
            stay. That&rsquo;s the gap we fill.
          </p>
        </div>

        <div className="mt-12 grid items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <p className="text-small-semibold uppercase tracking-wide text-foreground/50">
              What you already use
            </p>
            <ul className="mt-4 space-y-3">
              {["Your app (Duolingo, Babbel…)", "Your class or tutor", "Immersion & content"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-3 text-medium-medium">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-bone text-foreground/60">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </li>
                )
              )}
            </ul>
            <p className="mt-4 text-small-regular text-foreground/50">
              Great for exposure &amp; practice.
            </p>
          </div>

          <div className="grid place-items-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-white">
              <ArrowRight className="h-5 w-5 sm:block" />
            </span>
          </div>

          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6">
            <p className="text-small-semibold uppercase tracking-wide text-primary">
              + 200 Words a Day
            </p>
            <ul className="mt-4 space-y-3">
              {["Memory triggers that stick", "Testing that proves recall", "Earned mastery, tracked"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-3 text-medium-medium">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </li>
                )
              )}
            </ul>
            <p className="mt-4 text-small-regular text-foreground/60">
              The layer that makes it all stay.
            </p>
          </div>
        </div>
      </Section>

      {/* 5. HOW IT WORKS */}
      <Section width="md" className="bg-white" >
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
            Three simple steps, a few minutes a day.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {METHOD_STEPS.map((step, i) => (
            <div key={step.title} className="rounded-2xl border border-black/10 bg-bone p-6">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-medium-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-5 text-large-semibold">{step.title}</h3>
              <p className="mt-2 text-regular-medium text-foreground/70">{step.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 5b. DEPTH — how much there is to learn, and at what level */}
      <Section width="md">
        <div className="text-center">
          <p className="text-small-semibold uppercase tracking-wide text-primary">
            Plenty to sink your teeth into
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            A serious vocabulary — not a starter pack
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
            {MARKETING_STATS.words} words across {MARKETING_STATS.courses} structured courses and{" "}
            {MARKETING_STATS.lessons} bite-sized lessons — from your very first word to native
            proverbs. There&rsquo;s enough here to learn for years.
          </p>
        </div>

        {/* Headline stats */}
        <div className="mt-10 grid gap-4 sm:grid-cols-4">
          <Stat value={MARKETING_STATS.words} label="words to master" />
          <Stat value={MARKETING_STATS.lessons} label="bite-sized lessons" />
          <Stat value={String(MARKETING_STATS.courses)} label="structured courses" />
          <Stat value={String(MARKETING_STATS.languages)} label="languages" />
        </div>

        {/* Course families: the beginner → advanced progression */}
        <div className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-large-semibold">A clear path from beginner to advanced</h3>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-small-semibold text-primary">
              <GraduationCap className="h-4 w-4" /> {MARKETING_STATS.levelRange}
            </span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COURSE_FAMILIES.map((fam, i) => (
              <div key={fam.name} className="flex flex-col rounded-2xl border border-black/10 bg-white p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs-medium text-white">
                    {i + 1}
                  </span>
                  <span className="text-xs-medium uppercase tracking-wide text-foreground/50">
                    {fam.level}
                  </span>
                </div>
                <h4 className="mt-4 text-medium-semibold">{fam.name}</h4>
                <p className="mt-2 text-small-regular text-foreground/70">{fam.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Topics covered */}
        <div className="mt-10 rounded-2xl border border-black/10 bg-white p-6">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h3 className="text-medium-semibold">Everyday topics you&rsquo;ll actually use</h3>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {TOPICS.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-black/10 bg-bone px-3 py-1.5 text-small-medium text-foreground/70"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </Section>

      {/* 6. PLAYS WELL WITH */}
      <Section width="md" className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Plays well with everything you already use
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
          We don&rsquo;t replace your app, your class or your tutor. We make the words they teach
          you actually stick.
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COMPANION_PRODUCTS.map((p) => (
            <div
              key={p.name}
              className="rounded-xl border border-black/10 bg-white px-5 py-4 text-left"
            >
              <p className="text-medium-semibold">{p.name}</p>
              <p className="mt-1 text-small-regular text-foreground/60">{p.note}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 7. PROOF OF RETENTION — earned mastery */}
      <Section width="md" className="bg-white">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-small-semibold text-primary">
              <Target className="h-4 w-4" /> Earned mastery
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Proof you actually know it
            </h2>
            <p className="mt-5 text-large-medium text-foreground/70">
              Every word climbs from <em>not started</em> to <em>mastered</em> — and it only
              reaches the top after three perfect tests in a row. No participation badges. Plus
              honest, character-level feedback shows you exactly what you got wrong.
            </p>
          </div>

          <div className="space-y-3">
            {MASTERY_STATES.map((state, i) => (
              <div
                key={state.label}
                className="flex items-center gap-4 rounded-xl border border-black/10 bg-bone p-4"
              >
                <div className="flex-1">
                  <p className="text-medium-semibold">{state.label}</p>
                  <p className="text-small-regular text-foreground/60">{state.note}</p>
                </div>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-black/5">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{ width: `${((i + 1) / MASTERY_STATES.length) * 100}%` }}
                  />
                </div>
                {i === MASTERY_STATES.length - 1 && (
                  <Star className="h-5 w-5 fill-success text-success" />
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 8. MOTIVATION LAYER */}
      <Section width="md" className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Built to keep you coming back
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
          A little friendly pressure goes a long way.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <MotivationCard
            icon={<Flame className="h-6 w-6 text-warning" />}
            title="Streaks"
            body="Show up daily and watch your streak grow. Streak freezes have your back on the busy days."
          />
          <MotivationCard
            icon={<Trophy className="h-6 w-6 text-primary" />}
            title="Weekly leagues"
            body="Climb the leaderboard against learners at your level — promotion and relegation every week."
          />
          <MotivationCard
            icon={<Star className="h-6 w-6 text-success" />}
            title="Achievements"
            body="Dozens of trophies to unlock as you hit milestones, from first word to full mastery."
          />
        </div>
      </Section>

      {/* 9. LANGUAGES */}
      <Section width="md" className="bg-white">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Choose your language
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
            Four languages, {MARKETING_STATS.courses} courses and {MARKETING_STATS.words} words —
            learn one deeply or unlock them all.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {MARKETING_LANGUAGES.map((lang) => (
            <Link
              key={lang.slug}
              href={`/learn/${lang.slug}`}
              className="group flex items-center gap-4 rounded-2xl border border-black/10 bg-bone p-5 transition-all hover:border-primary/40 hover:shadow-card"
            >
              <span className="text-4xl">{lang.flag}</span>
              <div className="flex-1">
                <p className="text-large-semibold">{lang.name}</p>
                <p className="text-small-regular text-foreground/60">
                  {lang.courseCount} courses · {lang.lessonCount}+ lessons ·{" "}
                  {lang.wordCount.toLocaleString()}+ words
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-foreground/30 transition-all group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </Section>

      {/* 10. FREE TIER BAND */}
      <Section width="sm" className="text-center">
        <div className="rounded-3xl border border-black/10 bg-beige px-6 py-12 sm:px-12">
          <Volume2 className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            Try it free — the first {MARKETING_STATS.freeLessons} lessons are on us
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-large-medium text-foreground/70">
            No card, no commitment. See how many words stick before you decide anything.
          </p>
          <Button asChild size="xl" className="mt-7">
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
      </Section>

      {/* 11. FAQ */}
      <Section width="sm">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          Questions, answered
        </h2>
        <div className="mt-10">
          <FAQ items={MARKETING_FAQS} />
        </div>
      </Section>

      {/* 12. FINAL CTA */}
      <div className="pb-20">
        <FinalCTA />
      </div>
    </>
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

function MotivationCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-bone p-6 text-left">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-white">{icon}</span>
      <h3 className="mt-5 text-large-semibold">{title}</h3>
      <p className="mt-2 text-regular-medium text-foreground/70">{body}</p>
    </div>
  );
}

/** Stylised memory-trigger study card for the hero (no real assets yet). */
function HeroCard() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-panel">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-bone px-3 py-1 text-small-medium text-foreground/60">
            🇫🇷 French
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1 text-xs-medium text-white">
            <Star className="h-3 w-3 fill-current" /> Mastered
          </span>
        </div>

        {/* Memory-trigger image placeholder */}
        <div className="mt-4 grid aspect-[4/3] place-items-center rounded-2xl bg-gradient-to-br from-primary/15 via-beige to-warning/15">
          <span className="text-5xl">🐈</span>
        </div>

        <div className="mt-4">
          <p className="text-small-medium text-foreground/50">Imagine&hellip;</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
              <Volume2 className="h-4 w-4" />
            </span>
            <p className="text-large-semibold">
              le chat <span className="font-normal text-foreground/50">— the cat</span>
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2 flex-1 rounded-full bg-success" />
          ))}
        </div>
        <p className="mt-2 text-xs-medium text-foreground/50">3 perfect answers in a row</p>
      </div>

      {/* Floating streak chip */}
      <div className="absolute -right-3 -top-3 flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 shadow-card">
        <Flame className="h-4 w-4 text-warning" />
        <span className="text-small-semibold">12-day streak</span>
      </div>
    </div>
  );
}
