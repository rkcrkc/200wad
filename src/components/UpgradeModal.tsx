"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, X, Check, ChevronDown } from "lucide-react";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { createDirectCheckout } from "@/lib/mutations/checkout";
import type { PricingPlan } from "@/types/database";
import type { PricingTierCopy, PricingTierCopyMap } from "@/lib/queries/subscriptions";

/** A language the user can pick to upgrade (single-language tier). */
export interface UpgradeLanguageOption {
  id: string;
  name: string;
  flag: string;
  /** Content counts surfaced as plan benefits. */
  courses?: number;
  lessons?: number;
  words?: number;
}

/** Aggregate content totals across every language (All Languages tier). */
export interface AllLanguagesStats {
  languages: number;
  courses: number;
  lessons: number;
  words: number;
}

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonTitle?: string;
  languageName?: string;
  languageFlag?: string;
  languageId?: string;
  /**
   * Languages selectable for the single-language tier. When provided (and
   * non-empty), the language card shows a picker (controlled via
   * `selectedLanguageId` / `onSelectLanguage`) letting the user choose which
   * language to upgrade.
   */
  languages?: UpgradeLanguageOption[];
  /** Currently picked language id (controlled by the parent). */
  selectedLanguageId?: string | null;
  /** Called when the user picks a different language in the dropdown. */
  onSelectLanguage?: (id: string) => void;
  /** Totals across every language, shown on the All Languages card. */
  allLanguagesStats?: AllLanguagesStats;
  /**
   * Admin-editable card copy keyed by tier. When omitted, built-in defaults are
   * used so the modal still renders correctly (e.g. on the lesson-gate flow).
   */
  copy?: PricingTierCopyMap;
  plans: PricingPlan[];
  enabledTiers: string[];
  originLessonId?: string;
  freeLessons?: number;
}

type BillingModel = "monthly" | "annual" | "lifetime";

/** Whole-dollar price with no cents (amounts are rounded to clean dollars). */
function formatWholeDollars(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}

/** Big dollar amount with the decimal + cents rendered as superscript. */
function PriceAmount({ cents }: { cents: number }) {
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  return (
    <span className="text-large-semibold font-bold">
      ${dollars}
      {remainder > 0 && (
        <sup className="align-super text-[0.6em] font-bold">
          .{String(remainder).padStart(2, "0")}
        </sup>
      )}
    </span>
  );
}

function getPlanByTierAndModel(
  plans: PricingPlan[],
  tier: string,
  model: string
): PricingPlan | undefined {
  return plans.find((p) => p.tier === tier && p.billing_model === model);
}

/** Compact, marketing-friendly approximation, e.g. 612 → "~600". */
function approxWords(n: number): string {
  if (n <= 0) return "0";
  if (n < 50) return `${n}`;
  return `~${Math.round(n / 50) * 50}`;
}

interface PlanContent {
  features: string[];
  /** Short, punchy audience line shown beneath the features. */
  audience: string;
}

// Default card copy, used when the admin-editable copy hasn't been supplied
// (e.g. the lesson-gate modal) or a tier row is missing. Benefit strings carry
// count tokens that are interpolated against live content totals at render time.
const DEFAULT_FREE_COPY: PricingTierCopy = {
  audience: "For curious beginners",
  access: null,
  accessSubtext: null,
  benefits: [
    "First {freeLessons} lessons of every language",
    "Study & test sessions to try it out",
    "Basic progress tracking",
  ],
};
const DEFAULT_LANGUAGE_COPY: PricingTierCopy = {
  audience: "For focused learners",
  access: null,
  accessSubtext: null,
  benefits: [
    "{courses} courses · {lessons} lessons",
    "Learn {words} words",
    "Native audio, example sentences & unlimited sessions",
  ],
};
const DEFAULT_ALL_LANGUAGES_COPY: PricingTierCopy = {
  audience: "For polyglots",
  access: null,
  accessSubtext: null,
  benefits: [
    "{languages} languages · {courses} courses",
    "{lessons} lessons · {words} words",
    "New languages & courses included as we add them",
  ],
};

/** Replace {token} placeholders; unknown tokens are left untouched. */
function interpolate(
  template: string,
  tokens: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in tokens ? String(tokens[key]) : match
  );
}

function buildFreeContent(
  copy: PricingTierCopy | undefined,
  freeLessons: number
): PlanContent {
  const src = copy ?? DEFAULT_FREE_COPY;
  return {
    audience: src.audience ?? DEFAULT_FREE_COPY.audience ?? "",
    features: src.benefits.map((b) => interpolate(b, { freeLessons })),
  };
}

function buildLanguageContent(
  copy: PricingTierCopy | undefined,
  lang: UpgradeLanguageOption | null
): PlanContent {
  const audience = copy?.audience ?? DEFAULT_LANGUAGE_COPY.audience ?? "";
  // Without live counts (lesson-gate modal) the token benefits can't render,
  // so fall back to a generic, token-free benefit set.
  if (lang?.courses == null || lang?.lessons == null) {
    return {
      audience,
      features: [
        "All lessons for this language",
        "Native audio & example sentences",
        "Unlimited study & test sessions",
      ],
    };
  }
  const tokens = {
    courses: lang.courses,
    lessons: lang.lessons,
    words: approxWords(lang.words ?? 0),
  };
  const benefits = copy?.benefits ?? DEFAULT_LANGUAGE_COPY.benefits;
  return { audience, features: benefits.map((b) => interpolate(b, tokens)) };
}

function buildAllLanguagesContent(
  copy: PricingTierCopy | undefined,
  stats?: AllLanguagesStats
): PlanContent {
  const audience = copy?.audience ?? DEFAULT_ALL_LANGUAGES_COPY.audience ?? "";
  if (!stats) {
    return {
      audience,
      features: [
        "Every language, current & future",
        "Native audio & example sentences",
        "Unlimited study & test sessions",
      ],
    };
  }
  const tokens = {
    languages: stats.languages,
    courses: stats.courses,
    lessons: stats.lessons,
    words: approxWords(stats.words),
  };
  const benefits = copy?.benefits ?? DEFAULT_ALL_LANGUAGES_COPY.benefits;
  return { audience, features: benefits.map((b) => interpolate(b, tokens)) };
}

/**
 * Dropdown that lets the user switch which language the single-language tier
 * card applies to. Renders the selected flag + name as the card title; opening
 * it reveals the remaining not-yet-unlocked languages.
 */
function LanguagePicker({
  languages,
  selectedId,
  onSelect,
}: {
  languages: UpgradeLanguageOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected =
    languages.find((l) => l.id === selectedId) ?? languages[0];

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-w-0 items-center gap-2 text-left"
      >
        <span className="truncate text-xl-semibold">{selected.name} only</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 max-h-64 w-56 overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-xl"
        >
          {languages.map((lang) => {
            const isSelected = lang.id === selectedId;
            return (
              <button
                key={lang.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelect(lang.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-bone",
                  isSelected && "bg-bone"
                )}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="min-w-0 flex-1 truncate text-regular-medium text-foreground">
                  {lang.name}
                </span>
                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface PricingCardProps {
  title: string;
  icon: React.ReactNode;
  tier: string;
  plans: PricingPlan[];
  billingModel: BillingModel;
  features: string[];
  audience?: string;
  badge?: string;
  /**
   * Visual emphasis. "amber" is the featured/highlighted card (single language);
   * "plain" matches the understated Free card (white body, bone header).
   */
  tone?: "amber" | "plain";
  /** Replaces the default icon + title (e.g. with a language picker). */
  header?: React.ReactNode;
}

/** Short "For ..." subtitle shown beneath a card's title. */
function AudienceLine({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm italic text-muted-foreground">{children}</p>;
}

function PricingCard({ title, icon, tier, plans, billingModel, features, audience, badge, tone = "amber", header }: PricingCardProps) {
  const plan = getPlanByTierAndModel(plans, tier, billingModel);
  const monthly = getPlanByTierAndModel(plans, tier, "monthly");

  if (!plan) return null;

  const isPlain = tone === "plain";
  const isAnnual = billingModel === "annual" && monthly;
  const displayCents = isAnnual
    ? Math.round(plan.amount_cents / 12)
    : plan.amount_cents;
  const displaySuffix = billingModel === "lifetime" ? "one-time" : "/month";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-t-3xl border-b-0 shadow-card",
        isPlain
          ? "border border-beige bg-white"
          : "border-2 border-amber-200 bg-amber-50/50"
      )}
    >
      {/* Header section with title + price */}
      <div className={cn("px-5 py-4", isPlain ? "bg-bone" : "bg-amber-100/60")}>
        {/* Icon row: plan icon leading, badge trailing */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xl">{icon}</span>
          {badge && (
            <span className="shrink-0 rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              {badge}
            </span>
          )}
        </div>
        {/* Plan name (or language picker) */}
        <div className="mb-1 flex min-w-0 items-center">
          {header ?? <span className="truncate text-xl-semibold">{title}</span>}
        </div>
        {audience && <AudienceLine>{audience}</AudienceLine>}
        <div className="flex items-baseline">
          <PriceAmount cents={displayCents} />
          {billingModel !== "lifetime" && (
            <span className="ml-1 text-sm text-muted-foreground">{displaySuffix}</span>
          )}
          {isAnnual && monthly && (
            <span className="ml-2 self-center rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white">
              Save {formatWholeDollars(monthly.amount_cents * 12 - plan.amount_cents)}/year
            </span>
          )}
          {billingModel === "lifetime" && (
            <span className="ml-2 self-center rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white">
              Yours forever
            </span>
          )}
        </div>
        {isAnnual && (
          <p className="mt-1 text-xs text-muted-foreground">
            {formatWholeDollars(plan.amount_cents)} billed annually
          </p>
        )}
        {billingModel === "lifetime" && (
          <p className="mt-1 text-xs text-muted-foreground">Pay once, access forever</p>
        )}
      </div>

      {/* Features */}
      <div className="px-5 py-4">
        <ul className="space-y-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FreePlanCard({
  freeLessons = 10,
  copy,
  billingModel,
}: {
  freeLessons?: number;
  copy?: PricingTierCopy;
  billingModel: BillingModel;
}) {
  const { features, audience } = buildFreeContent(copy, freeLessons);
  return (
    <div className="overflow-hidden rounded-t-3xl border border-b-0 border-beige bg-white shadow-card">
      {/* Header section */}
      <div className="bg-bone px-5 py-4">
        {/* Icon row */}
        <div className="mb-2 flex items-center">
          <span className="text-xl">🎓</span>
        </div>
        <div className="mb-1 flex min-w-0 items-center">
          <span className="text-xl-semibold">Free</span>
        </div>
        <AudienceLine>{audience}</AudienceLine>
        <div className="flex items-baseline">
          <PriceAmount cents={0} />
          <span className="ml-1 text-sm text-muted-foreground">/month</span>
        </div>
        {/* Spacer matching the paid cards' "billed annually" / "pay once" line
            so the header sections stay the same height in those modes. */}
        {billingModel !== "monthly" && (
          <p className="invisible mt-1 text-xs" aria-hidden="true">
            &nbsp;
          </p>
        )}
      </div>

      {/* Features */}
      <div className="px-5 py-4">
        <ul className="space-y-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const BILLING_OPTIONS: { value: BillingModel; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
  { value: "lifetime", label: "Lifetime" },
];

export function UpgradeModal({
  isOpen,
  onClose,
  lessonTitle,
  languageName,
  languageFlag,
  languageId,
  languages,
  selectedLanguageId,
  onSelectLanguage,
  allLanguagesStats,
  copy,
  plans,
  enabledTiers,
  originLessonId,
  freeLessons,
}: UpgradeModalProps) {
  const [billingModel, setBillingModel] = useState<BillingModel>("annual");
  const [checkoutTier, setCheckoutTier] = useState<"language" | "all-languages" | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Picker mode is active when a list of selectable languages is supplied.
  // Resolve the language the single-language tier currently applies to: the
  // picker selection when in picker mode, otherwise the explicit props.
  const hasPicker = !!languages && languages.length > 0;
  const pickedLanguage = hasPicker
    ? languages.find((l) => l.id === selectedLanguageId) ?? languages[0]
    : null;
  const effectiveLanguageId = pickedLanguage?.id ?? languageId;
  const effectiveLanguageName = pickedLanguage?.name ?? languageName;
  const effectiveLanguageFlag = pickedLanguage?.flag ?? languageFlag;

  const handleCheckout = async (tier: "language" | "all-languages") => {
    setCheckoutTier(tier);
    setCheckoutError(null);

    const result = await createDirectCheckout({
      tier,
      billingModel,
      languageId: tier === "language" ? (effectiveLanguageId ?? null) : null,
      languageName: tier === "language" ? (effectiveLanguageName ?? null) : null,
      originLessonId,
      cancelUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/account/subscriptions`,
    });

    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      setCheckoutError(result.error || "Something went wrong. Please try again.");
      setCheckoutTier(null);
    }
  };

  const showLanguageTier =
    enabledTiers.includes("language") && !!effectiveLanguageId;
  const showAllLanguagesTier = enabledTiers.includes("all-languages");

  const languageContent = buildLanguageContent(copy?.language, pickedLanguage);
  const allLanguagesContent = buildAllLanguagesContent(
    copy?.["all-languages"],
    allLanguagesStats
  );

  // Only show billing options that have at least one plan
  const availableOptions = BILLING_OPTIONS.filter((opt) =>
    plans.some((p) => p.billing_model === opt.value)
  );

  // Grid columns: always free + however many paid tiers
  const paidCardCount = (showLanguageTier ? 1 : 0) + (showAllLanguagesTier ? 1 : 0);
  const totalCards = 1 + paidCardCount;
  const gridCols =
    totalCards === 3
      ? "sm:grid-cols-3"
      : totalCards === 2
        ? "sm:grid-cols-2"
        : "";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-6xl h-[90vh] overflow-hidden rounded-3xl bg-white shadow-xl flex flex-col">
        {/* Fixed top bar */}
        <div className="shrink-0 flex items-center justify-end bg-bone px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* Header section with beige background */}
          <div className="shrink-0 bg-bone px-6 pb-6">
            {/* Lock icon */}
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>

            {/* Heading */}
            <div className="text-center">
              <h2 className="text-xl-semibold mb-2">
                {lessonTitle ? "Upgrade to Unlock" : "Choose a Plan"}
              </h2>
              <p className="text-regular text-muted-foreground">
                {lessonTitle
                  ? `Upgrade your plan to study '${lessonTitle}'`
                  : "Subscribe to unlock all lessons."}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1 flex-col px-6 pt-6">
            {/* Billing toggle */}
            {availableOptions.length > 1 && (
              <div className="mb-5">
                <Tabs
                  className="justify-center"
                  tabs={availableOptions.map((opt) => {
                    const badge =
                      opt.value === "annual"
                        ? "save $$"
                        : opt.value === "lifetime"
                          ? "best value"
                          : null;
                    const isActive = opt.value === billingModel;
                    return {
                      id: opt.value,
                      label: badge ? (
                        <span className="flex items-center gap-1.5">
                          {opt.label}
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-600",
                              isActive ? "bg-white" : "bg-green-200"
                            )}
                          >
                            {badge}
                          </span>
                        </span>
                      ) : (
                        opt.label
                      ),
                    };
                  })}
                  activeTab={billingModel}
                  onChange={(id) => setBillingModel(id as BillingModel)}
                />
              </div>
            )}

            {/* Pricing cards */}
            <div className={cn("grid flex-1 grid-cols-1 gap-4", gridCols)}>
              <FreePlanCard
                freeLessons={freeLessons}
                copy={copy?.free}
                billingModel={billingModel}
              />
              {showLanguageTier && (
                <PricingCard
                  title={`${effectiveLanguageName || "Language"} only`}
                  icon={effectiveLanguageFlag || "🌐"}
                  tier="language"
                  plans={plans}
                  billingModel={billingModel}
                  features={languageContent.features}
                  audience={languageContent.audience}
                  badge="Most popular"
                  header={
                    hasPicker && languages.length > 1 && onSelectLanguage ? (
                      <LanguagePicker
                        languages={languages}
                        selectedId={effectiveLanguageId!}
                        onSelect={onSelectLanguage}
                      />
                    ) : undefined
                  }
                />
              )}
              {showAllLanguagesTier && (
                <PricingCard
                  title="All Languages"
                  icon="🌐"
                  tier="all-languages"
                  plans={plans}
                  billingModel={billingModel}
                  features={allLanguagesContent.features}
                  audience={allLanguagesContent.audience}
                  tone="plain"
                />
              )}
            </div>
          </div>
        </div>

        {/* Fixed footer with CTAs styled as card bottoms */}
        <div className="shrink-0 px-6 pb-6">
          {checkoutError && (
            <p className="mb-3 text-center text-sm text-destructive">{checkoutError}</p>
          )}
          <div className={cn("grid grid-cols-1 gap-4", gridCols)}>
            <div className="rounded-b-3xl border border-t-0 border-beige bg-white px-5 py-4 shadow-card">
              <PrimaryButton variant="outline" fullWidth disabled>
                Current Plan
              </PrimaryButton>
            </div>
            {showLanguageTier && (
              <div className="rounded-b-3xl border-2 border-t-0 border-amber-200 bg-amber-50/50 px-5 py-4 shadow-card">
                <PrimaryButton
                  fullWidth
                  loading={checkoutTier === "language"}
                  disabled={checkoutTier !== null && checkoutTier !== "language"}
                  onClick={() => handleCheckout("language")}
                >
                  Upgrade plan
                </PrimaryButton>
              </div>
            )}
            {showAllLanguagesTier && (
              <div className="rounded-b-3xl border border-t-0 border-beige bg-white px-5 py-4 shadow-card">
                <PrimaryButton
                  fullWidth
                  loading={checkoutTier === "all-languages"}
                  disabled={checkoutTier !== null && checkoutTier !== "all-languages"}
                  onClick={() => handleCheckout("all-languages")}
                >
                  Upgrade plan
                </PrimaryButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
