import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  Check,
  Star,
  Eye,
  Volume2,
  Keyboard,
  ArrowRight,
  GraduationCap,
  Layers,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/Section";
import { RotatingWord } from "@/components/marketing/RotatingWord";
import { FAQ } from "@/components/marketing/FAQ";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import {
  MARKETING_LANGUAGES,
  COURSE_FAMILIES,
  TOPICS,
  MARKETING_FAQS,
  MARKETING_STATS,
} from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "200 Words a Day — The memory-trigger method",
  description:
    "The original memory-trigger method, reborn. Link every foreign word to a vivid, slightly silly picture and it sticks for good. 23,000+ words across French, Spanish, German & Italian. Start free.",
  alternates: { canonical: "/home/b" },
  // A/B variant of the homepage — keep it out of the index to avoid duplicate content.
  robots: { index: false, follow: true },
};

/** Worked memory-trigger examples — the method shown, not just told. */
const TRIGGERS: { flag: string; word: string; meaning: string; trigger: string }[] = [
  {
    flag: "🇫🇷",
    word: "le pain",
    meaning: "bread",
    trigger: "Bite the baguette and it's so rock-hard it causes you real PAIN.",
  },
  {
    flag: "🇮🇹",
    word: "il gatto",
    meaning: "cat",
    trigger: "A smug cat devours an entire chocolate GATeau in one sitting.",
  },
  {
    flag: "🇩🇪",
    word: "der Hund",
    meaning: "dog",
    trigger: "A dog charges off to join the HUNT, tail wagging like mad.",
  },
];

export default function MarketingHomeB() {
  return (
    <>
      {/* 1. HERO — method-led */}
      <Section width="lg" className="pt-14 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-small-medium text-foreground/70">
              <Sparkles className="h-4 w-4 text-primary" />
              The original memory-trigger method — reborn
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Learn a{" "}
              <RotatingWord words={MARKETING_LANGUAGES.map((l) => l.name)} /> word.
              <span className="text-foreground/40"> Never forget it.</span>
            </h1>
            <p className="mt-6 max-w-xl text-large-medium text-foreground/70">
              We link every word to a vivid, slightly silly picture — the kind your brain
              refuses to let go of. See it, hear it, type it, and it&rsquo;s yours for good.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link href="/signup">Try the method free</Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="text-primary">
                <Link href="/how-it-works">See how it works</Link>
              </Button>
            </div>
            <p className="mt-4 text-small-regular text-foreground/50">
              First {MARKETING_STATS.freeLessons} lessons free · No card required
            </p>
          </div>

          {/* Hero visual: a single worked trigger, front and centre */}
          <TriggerCard {...TRIGGERS[0]} large />
        </div>
      </Section>

      {/* 2. THE TRICK — demonstrate the method with worked examples */}
      <Section width="md" className="bg-white">
        <div className="text-center">
          <p className="text-small-semibold uppercase tracking-wide text-primary">
            Here&rsquo;s the trick
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            A picture your brain can&rsquo;t un-see
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
            Rote lists fade by tomorrow. A weird, vivid image doesn&rsquo;t. Every word comes with
            its own memory trigger — link the sound to a picture, and recall becomes automatic.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {TRIGGERS.map((t) => (
            <TriggerCard key={t.word} {...t} />
          ))}
        </div>
      </Section>

      {/* 3. MULTI-SENSORY — see it, hear it, type it */}
      <Section width="md">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            See it. Hear it. Type it.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
            Three senses, one word — the more ways it goes in, the harder it is to forget.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <SenseCard
            icon={<Eye className="h-6 w-6 text-primary" />}
            title="See it"
            body="A vivid memory-trigger image locks the meaning to a picture you'll actually remember."
          />
          <SenseCard
            icon={<Volume2 className="h-6 w-6 text-primary" />}
            title="Hear it"
            body="Native-speaker audio on every word, so you learn how it really sounds from day one."
          />
          <SenseCard
            icon={<Keyboard className="h-6 w-6 text-primary" />}
            title="Type it"
            body="Recall it by typing, with honest character-level feedback showing exactly what you missed."
          />
        </div>
      </Section>

      {/* 4. DEPTH — how much there is, and at what level */}
      <Section width="md" className="bg-white">
        <div className="text-center">
          <p className="text-small-semibold uppercase tracking-wide text-primary">
            Plenty to learn
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {MARKETING_STATS.words} words, all triggered
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
            {MARKETING_STATS.courses} structured courses across {MARKETING_STATS.lessons} lessons,
            each word with its own trigger — from your very first word to native proverbs.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-4">
          <Stat value={MARKETING_STATS.words} label="words to master" />
          <Stat value={MARKETING_STATS.lessons} label="bite-sized lessons" />
          <Stat value={String(MARKETING_STATS.courses)} label="structured courses" />
          <Stat value={String(MARKETING_STATS.languages)} label="languages" />
        </div>

        <div className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-large-semibold">From first words to native proverbs</h3>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-small-semibold text-primary">
              <GraduationCap className="h-4 w-4" /> {MARKETING_STATS.levelRange}
            </span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COURSE_FAMILIES.map((fam, i) => (
              <div key={fam.name} className="flex flex-col rounded-2xl border border-black/10 bg-bone p-5">
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

        <div className="mt-10 rounded-2xl border border-black/10 bg-bone p-6">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h3 className="text-medium-semibold">Everyday topics you&rsquo;ll actually use</h3>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {TOPICS.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-small-medium text-foreground/70"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </Section>

      {/* 5. PROGRESS — words per day, tracked (nod to the original) */}
      <Section width="md">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-small-semibold text-primary">
              <TrendingUp className="h-4 w-4" /> Words per day
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Watch your vocabulary grow
            </h2>
            <p className="mt-5 text-large-medium text-foreground/70">
              Every session is tracked automatically. See your words-per-day climb, your streak
              build, and each word ladder up from <em>learning</em> to <em>mastered</em> — earned
              only after three perfect answers in a row.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Automatic progress tracking on every word",
                "A daily words-per-day count that keeps you honest",
                "Mastery you earn, never just collect",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-regular-medium">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                    <Check className="h-3 w-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Simple words-per-day chart mock */}
          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-medium-semibold">This week</p>
              <span className="text-small-medium text-success">+142 words</span>
            </div>
            <div className="mt-6 flex h-40 items-end gap-2">
              {[40, 65, 30, 80, 55, 95, 70].map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-lg bg-primary/80"
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-xs-medium text-foreground/40">
                    {["M", "T", "W", "T", "F", "S", "S"][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 6. COMPANION — brief nod to positioning */}
      <Section width="sm" className="bg-white text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          The memory layer for however you learn
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-large-medium text-foreground/70">
          Keep your app, your class, your tutor. 200 Words a Day is the piece that makes the
          vocabulary they teach you actually stay.
        </p>
      </Section>

      {/* 7. LANGUAGES */}
      <Section width="md">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Pick your language
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-large-medium text-foreground/70">
            Four languages, {MARKETING_STATS.courses} courses and {MARKETING_STATS.words} triggered
            words — learn one deeply or unlock them all.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {MARKETING_LANGUAGES.map((lang) => (
            <Link
              key={lang.slug}
              href={`/learn/${lang.slug}`}
              className="group flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-5 transition-all hover:border-primary/40 hover:shadow-card"
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

      {/* 8. FAQ */}
      <Section width="sm" className="bg-white">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          Questions, answered
        </h2>
        <div className="mt-10">
          <FAQ items={MARKETING_FAQS} />
        </div>
      </Section>

      {/* 9. FINAL CTA */}
      <div className="pb-20">
        <FinalCTA heading="One word. One picture. Remembered for good." />
      </div>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-bone p-6 text-center">
      <p className="text-4xl font-semibold tracking-tight text-primary">{value}</p>
      <p className="mt-1 text-small-regular text-foreground/60">{label}</p>
    </div>
  );
}

function SenseCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 text-left">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-bone">{icon}</span>
      <h3 className="mt-5 text-large-semibold">{title}</h3>
      <p className="mt-2 text-regular-medium text-foreground/70">{body}</p>
    </div>
  );
}

/** A worked memory-trigger card: word, meaning, picture placeholder and the trigger line. */
function TriggerCard({
  flag,
  word,
  meaning,
  trigger,
  large,
}: {
  flag: string;
  word: string;
  meaning: string;
  trigger: string;
  large?: boolean;
}) {
  return (
    <div
      className={
        "flex flex-col rounded-3xl border border-black/10 bg-white p-5 " +
        (large ? "mx-auto w-full max-w-sm shadow-panel" : "shadow-card")
      }
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-bone px-3 py-1 text-small-medium text-foreground/60">
          {flag} {word}
        </span>
        <span className="text-small-medium text-foreground/50">{meaning}</span>
      </div>

      {/* Memory-trigger image placeholder */}
      <div className="mt-4 grid aspect-[4/3] place-items-center rounded-2xl bg-gradient-to-br from-primary/15 via-beige to-warning/15">
        <span className="text-5xl">{flag}</span>
      </div>

      <div className="mt-4">
        <p className="text-small-medium text-foreground/50">Imagine&hellip;</p>
        <p className="mt-1 text-regular-medium text-foreground/80">{trigger}</p>
      </div>

      {large && (
        <div className="mt-5 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1 text-xs-medium text-white">
            <Star className="h-3 w-3 fill-current" /> Stuck for good
          </span>
        </div>
      )}
    </div>
  );
}
