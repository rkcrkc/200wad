"use client";

import { useState } from "react";
import { Toaster } from "sonner";
import { showAchievementToast } from "@/lib/toast/achievement";
import {
  CelebrationModal,
  type CelebrationStat,
  type CelebrationCTA,
  type CelebrationTier,
} from "@/components/celebrations/CelebrationModal";
import { FreeTierUpgradeCelebration } from "@/components/celebrations/FreeTierUpgradeCelebration";

type VariantId =
  | "word-mastered-toast"
  | "lesson-learned"
  | "lesson-mastered"
  | "lesson-1y"
  | "lesson-5y"
  | "free-tier-upgrade"
  | "course-learned"
  | "course-mastered"
  | "language-learned"
  | "language-mastered";

interface VariantMeta {
  id: VariantId;
  label: string;
  category: "Word" | "Lesson" | "Free tier" | "Course" | "Language";
  trigger: string;
  description: string;
  // Whether this variant actually fires in the live app today, or is a
  // preview-only mockup with no trigger wired up yet. The three "mastered"
  // tiers fire from completeTestSession() (src/lib/mutations/test.ts); the
  // rest exist here for design review only.
  wired: boolean;
}

const VARIANTS: VariantMeta[] = [
  {
    id: "word-mastered-toast",
    label: "Word mastered (toast)",
    category: "Word",
    trigger: "Per word, when correct_streak hits 3 during a test",
    description:
      "Lightweight per-word toast confirming mastery. Fires individually — not aggregated.",
    wired: false,
  },
  {
    id: "lesson-learned",
    label: "Lesson learned",
    category: "Lesson",
    trigger: "Lesson transitions to 'learned' (100% words at learned+)",
    description:
      "Medium celebration. Distinct from lesson mastered: same lesson, lower bar — every word recalled at least once with full marks.",
    wired: false,
  },
  {
    id: "lesson-mastered",
    label: "Lesson mastered",
    category: "Lesson",
    trigger: "Lesson transitions to 'mastered' (100% words at mastered)",
    description:
      "Major celebration with confetti and share. Fires when every word in the lesson hits 3-streak.",
    wired: true,
  },
  {
    id: "lesson-1y",
    label: "Lesson 1-year milestone",
    category: "Lesson",
    trigger: "Lesson reaches 1-year milestone test completion",
    description:
      "Medium celebration. 'Committed to long-term memory.' First major checkpoint after mastery.",
    wired: false,
  },
  {
    id: "lesson-5y",
    label: "Lesson 5-year milestone",
    category: "Lesson",
    trigger: "Lesson reaches 5-year milestone test completion",
    description:
      "Terminal lesson celebration. 'Retained for life.' Major + certificate + share.",
    wired: false,
  },
  {
    id: "free-tier-upgrade",
    label: "Free tier — upgrade variant",
    category: "Free tier",
    trigger: "Last free lesson hits ANY of: test taken / learned / mastered (whichever first, idempotent)",
    description:
      "Renders AFTER the standard test completion modal dismisses. Celebration framing for the upgrade pitch — peak emotional moment, not denial.",
    wired: false,
  },
  {
    id: "course-learned",
    label: "Course — all lessons learned",
    category: "Course",
    trigger: "Every lesson in course reaches 'learned' or higher",
    description: "Medium celebration. CTA pushes toward mastery on weakest lesson.",
    wired: false,
  },
  {
    id: "course-mastered",
    label: "Course mastered",
    category: "Course",
    trigger: "Every lesson in course at 'mastered'",
    description:
      "Major celebration with full stats grid + share. Stats selection is open — review and trim here.",
    wired: true,
  },
  {
    id: "language-learned",
    label: "Language — all courses learned",
    category: "Language",
    trigger: "Every course in language at 'learned'",
    description: "Major celebration. CTA pushes toward mastery on weakest course.",
    wired: false,
  },
  {
    id: "language-mastered",
    label: "Language mastered",
    category: "Language",
    trigger: "Every course in language at 'mastered'",
    description:
      "Top-tier celebration: flag + trophy + confetti + share + new-language picker.",
    wired: true,
  },
];

const CATEGORY_ORDER: VariantMeta["category"][] = [
  "Word",
  "Lesson",
  "Free tier",
  "Course",
  "Language",
];

export function CelebrationsPreviewClient() {
  const [active, setActive] = useState<VariantId | null>(null);

  const handleTrigger = (id: VariantId) => {
    if (id === "word-mastered-toast") {
      showAchievementToast({
        title: "Word mastered: cordero",
        message: "lamb · 3 in a row, no clues",
        emoji: "⭐",
        duration: 4500,
      });
      return;
    }
    setActive(id);
  };

  return (
    <div className="space-y-6">
      <Toaster position="bottom-right" />

      <header>
        <h1 className="text-page-header text-foreground">Celebrations preview</h1>
        <p className="mt-2 max-w-2xl text-regular-semibold text-foreground/70">
          Visual review of every completion celebration variant. Click any
          variant to render it with mock data. Each card is tagged{" "}
          <span className="text-success">Live</span> if it fires in the app
          today, or <span className="text-warning">Preview only</span> if it&apos;s
          a mockup with no trigger wired up yet.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-white p-6">
        {CATEGORY_ORDER.map((category) => {
          const variants = VARIANTS.filter((v) => v.category === category);
          if (variants.length === 0) return null;
          return (
            <div key={category} className="mb-6 last:mb-0">
              <h2 className="mb-3 text-regular-semibold text-foreground/70">
                {category}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {variants.map((variant) => (
                  <VariantCard
                    key={variant.id}
                    variant={variant}
                    onTrigger={() => handleTrigger(variant.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <ActiveVariant id={active} onDismiss={() => setActive(null)} />
    </div>
  );
}

function VariantCard({
  variant,
  onTrigger,
}: {
  variant: VariantMeta;
  onTrigger: () => void;
}) {
  return (
    <button
      onClick={onTrigger}
      className="group flex flex-col items-start rounded-xl border border-border bg-bone p-4 text-left transition-colors hover:border-primary/40 hover:bg-white"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <p className="text-regular-semibold text-foreground group-hover:text-primary">
          {variant.label}
        </p>
        <WiredBadge wired={variant.wired} />
      </div>
      <p className="mt-1 text-xs-medium text-foreground/60">
        Trigger: {variant.trigger}
      </p>
      <p className="mt-2 text-small-regular text-foreground/70">
        {variant.description}
      </p>
      <span className="mt-3 text-xs-medium text-primary group-hover:underline">
        Preview →
      </span>
    </button>
  );
}

function WiredBadge({ wired }: { wired: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs-medium ${
        wired
          ? "bg-success/10 text-success"
          : "bg-warning/10 text-warning"
      }`}
    >
      {wired ? "Live" : "Preview only"}
    </span>
  );
}

function ActiveVariant({
  id,
  onDismiss,
}: {
  id: VariantId | null;
  onDismiss: () => void;
}) {
  if (id === null || id === "word-mastered-toast") return null;

  if (id === "free-tier-upgrade") {
    return (
      <FreeTierUpgradeCelebration
        courseTitle="Spanish · Beginner"
        unlockCount={47}
        stats={[
          { label: "Words mastered", value: 38 },
          { label: "Days active", value: 12 },
          { label: "Time studied", value: "2h 14m" },
        ]}
        plans={[
          {
            tier: "free",
            name: "Free",
            price: "$0",
            cadence: "forever",
            bullets: [
              "First 3 lessons per language",
              "Basic progress tracking",
              "Limited daily sessions",
            ],
            ctaLabel: "Current plan",
            current: true,
          },
          {
            tier: "language",
            name: "Spanish",
            price: "$8",
            cadence: "per month",
            bullets: [
              "All Spanish lessons",
              "Unlimited sessions",
              "Full progress stats",
              "Spaced-repetition milestones",
            ],
            ctaLabel: "Subscribe",
            highlighted: true,
          },
          {
            tier: "all-languages",
            name: "All Languages",
            price: "$12",
            cadence: "per month",
            bullets: [
              "Every language we offer",
              "Future languages included",
              "Best value",
            ],
            ctaLabel: "Subscribe",
          },
        ]}
        onSubscribe={() => {}}
        onContinueFree={onDismiss}
        onDismiss={onDismiss}
      />
    );
  }

  const config = VARIANT_CONFIGS[id];
  return (
    <CelebrationModal
      tier={config.tier}
      title={config.title}
      eyebrow={config.eyebrow}
      emoji={config.emoji}
      flagEmoji={config.flagEmoji}
      subtitle={config.subtitle}
      stats={config.stats}
      primaryCta={config.primaryCta}
      secondaryCta={config.secondaryCta}
      tertiaryCta={config.tertiaryCta ?? { label: "Done", onClick: onDismiss }}
      shareable={config.shareable}
      onShare={() => {}}
      onDismiss={onDismiss}
    />
  );
}

interface VariantConfig {
  tier: CelebrationTier;
  title: string;
  eyebrow?: string;
  emoji?: string;
  flagEmoji?: string;
  subtitle?: string;
  stats?: CelebrationStat[];
  primaryCta?: CelebrationCTA;
  secondaryCta?: CelebrationCTA;
  tertiaryCta?: CelebrationCTA;
  shareable?: boolean;
}

const VARIANT_CONFIGS: Record<
  Exclude<VariantId, "word-mastered-toast" | "free-tier-upgrade">,
  VariantConfig
> = {
  "lesson-learned": {
    tier: "medium",
    eyebrow: "Lesson 5 · Animals",
    title: "Lesson learned!",
    emoji: "✅",
    subtitle: "Every word answered correctly at least once. Now lock it in.",
    stats: [
      { label: "Words learned", value: 12 },
      { label: "Time on lesson", value: "18m" },
      { label: "Tests passed", value: 1 },
    ],
    primaryCta: { label: "Aim for mastery" },
    secondaryCta: { label: "Next lesson" },
    shareable: true,
  },
  "lesson-mastered": {
    tier: "major",
    eyebrow: "Lesson 5 · Animals",
    title: "Lesson mastered!",
    emoji: "⭐",
    subtitle: "Every word locked in three perfect tests in a row.",
    stats: [
      { label: "Words mastered", value: 12 },
      { label: "Perfect tests", value: 4 },
      { label: "Time on lesson", value: "42m" },
      { label: "Days from start", value: 6 },
    ],
    primaryCta: { label: "Next lesson" },
    secondaryCta: { label: "Review your stats" },
    shareable: true,
  },
  "lesson-1y": {
    tier: "medium",
    eyebrow: "Lesson 5 · Animals",
    title: "Committed to long-term memory",
    emoji: "🧠",
    subtitle:
      "You first studied this lesson a year ago — and you still remember every word.",
    stats: [
      { label: "Tests passed", value: 6 },
      { label: "Total time", value: "1h 12m" },
      { label: "Days since start", value: 365 },
    ],
    primaryCta: { label: "Continue learning" },
    shareable: true,
  },
  "lesson-5y": {
    tier: "major",
    eyebrow: "Lesson 5 · Animals",
    title: "Retained for life",
    emoji: "🏆",
    subtitle:
      "You've proven this lesson stuck — across five years and ten tests.",
    stats: [
      { label: "Tests passed", value: 10 },
      { label: "Total time", value: "1h 47m" },
      { label: "Days since start", value: 1825 },
      { label: "Retention", value: "100%" },
    ],
    primaryCta: { label: "View certificate" },
    secondaryCta: { label: "Continue learning" },
    shareable: true,
  },
  "course-learned": {
    tier: "medium",
    eyebrow: "Spanish · Beginner",
    title: "Course complete!",
    emoji: "📘",
    subtitle:
      "You've answered every word correctly at least once. Now push for mastery.",
    stats: [
      { label: "Words learned", value: 200 },
      { label: "Lessons learned", value: 20 },
      { label: "Days active", value: 34 },
      { label: "Time studied", value: "9h 12m" },
    ],
    primaryCta: { label: "Push for mastery" },
    secondaryCta: { label: "Browse other courses" },
    shareable: true,
  },
  "course-mastered": {
    tier: "major",
    eyebrow: "Spanish · Beginner",
    title: "Course mastered!",
    emoji: "🏆",
    subtitle: "Every word, every lesson — locked in.",
    stats: [
      { label: "Words mastered", value: 200 },
      { label: "Lessons mastered", value: 20 },
      { label: "Total time", value: "14h 38m" },
      { label: "Days start to finish", value: 62 },
      { label: "Longest streak", value: "11 days" },
      { label: "Perfect tests", value: 47 },
      { label: "Fastest lesson", value: "12m" },
    ],
    primaryCta: { label: "Start Spanish · Intermediate" },
    secondaryCta: { label: "Try a new language" },
    shareable: true,
  },
  "language-learned": {
    tier: "major",
    eyebrow: "Spanish",
    title: "Spanish complete!",
    flagEmoji: "🇪🇸",
    subtitle:
      "You've learned every word in every Spanish course. Now push for mastery.",
    stats: [
      { label: "Words learned", value: 1200 },
      { label: "Courses complete", value: 6 },
      { label: "Days active", value: 184 },
      { label: "Time studied", value: "62h" },
    ],
    primaryCta: { label: "Push for mastery" },
    secondaryCta: { label: "Try a new language" },
    shareable: true,
  },
  "language-mastered": {
    tier: "major",
    eyebrow: "Spanish",
    title: "You've mastered Spanish",
    flagEmoji: "🇪🇸",
    emoji: "🏆",
    subtitle:
      "Every word in every course — locked in. This is a serious achievement.",
    stats: [
      { label: "Words mastered", value: 1200 },
      { label: "Courses mastered", value: 6 },
      { label: "Total time", value: "94h" },
      { label: "Days start to finish", value: 312 },
      { label: "Longest streak", value: "47 days" },
      { label: "Perfect tests", value: 312 },
    ],
    primaryCta: { label: "Pick a new language" },
    secondaryCta: { label: "Revisit weakest words" },
    shareable: true,
  },
};
