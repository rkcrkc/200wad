import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import type { Subscription, PricingPlan, Language } from "@/types/database";
import { getCreditBalance } from "./credits";
import { getEnabledTiers, getDefaultFreeLessons } from "@/lib/utils/accessControl";

// ============================================================================
// Types
// ============================================================================

export interface UserSubscription extends Subscription {
  /** Whether subscription currently grants access */
  isEffective: boolean;
}

export interface GetUserSubscriptionsResult {
  subscriptions: UserSubscription[];
  error: string | null;
}

export interface GetPricingPlansResult {
  plans: PricingPlan[];
  error: string | null;
}

// ============================================================================
// User Subscriptions
// ============================================================================

/**
 * Get all subscriptions for the current user with effectiveness status.
 */
export async function getUserSubscriptions(): Promise<GetUserSubscriptionsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { subscriptions: [], error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { subscriptions: [], error: error.message };
  }

  const now = new Date();
  const subscriptions: UserSubscription[] = (data || []).map((sub) => ({
    ...sub,
    isEffective:
      sub.status === "active" ||
      (sub.status === "cancelled" &&
        sub.current_period_end !== null &&
        new Date(sub.current_period_end) > now),
  }));

  return { subscriptions, error: null };
}

/**
 * Check if user has any effective subscription that covers a given target.
 * "Effective" means active, or cancelled but still within the paid period.
 */
export async function hasActiveSubscription(
  userId: string,
  targetType: "course" | "language" | "all-languages",
  targetId?: string
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  let query = supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .or(`status.eq.active,and(status.eq.cancelled,current_period_end.gt.${now})`);

  if (targetType === "all-languages") {
    query = query.eq("type", "all-languages");
  } else {
    query = query.eq("type", targetType);
    if (targetId) {
      query = query.eq("target_id", targetId);
    }
  }

  const { count } = await query;
  return (count ?? 0) > 0;
}

// ============================================================================
// Pricing Plans
// ============================================================================

/**
 * Get all active pricing plans, optionally filtered by tier.
 *
 * Cached for 1 hour because pricing plans only change via admin actions.
 * Admin mutations call `updateTag("pricing-plans")` to force refresh.
 */
export const getActivePricingPlans = unstable_cache(
  async (
    tier?: "course" | "language" | "all-languages"
  ): Promise<GetPricingPlansResult> => {
    const supabase = createStaticClient();

    let query = supabase
      .from("pricing_plans")
      .select("*")
      .eq("is_active", true)
      .order("amount_cents");

    if (tier) {
      query = query.eq("tier", tier);
    }

    const { data, error } = await query;

    if (error) {
      return { plans: [], error: error.message };
    }

    return { plans: data || [], error: null };
  },
  ["active-pricing-plans"],
  { revalidate: 3600, tags: ["pricing-plans"] }
);

/**
 * Get all pricing plans (for admin).
 */
export async function getAllPricingPlans(): Promise<GetPricingPlansResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pricing_plans")
    .select("*")
    .order("tier")
    .order("amount_cents");

  if (error) {
    return { plans: [], error: error.message };
  }

  return { plans: data || [], error: null };
}

// ============================================================================
// Pricing Tier Copy (admin-editable upgrade-modal card copy)
// ============================================================================

export type PricingTierKey = "free" | "course" | "language" | "all-languages";

/** Modal-facing copy: audience subtitle + non-blank benefit bullets in order. */
export interface PricingTierCopy {
  audience: string | null;
  /** Subscription-page header "Access" line template (with {token}s). */
  access: string | null;
  /** Optional second line under the "Access" value; hidden when blank. */
  accessSubtext: string | null;
  benefits: string[];
}

export type PricingTierCopyMap = Partial<Record<PricingTierKey, PricingTierCopy>>;

/** Raw row including blank benefit slots — used by the admin edit form. */
export interface PricingTierCopyRow {
  tier_key: string;
  audience: string | null;
  access: string | null;
  access_subtext: string | null;
  benefit_1: string | null;
  benefit_2: string | null;
  benefit_3: string | null;
  benefit_4: string | null;
  benefit_5: string | null;
}

/**
 * Get editable upgrade-modal copy keyed by tier.
 *
 * Cached for 1 hour; admin edits call `updateTag("pricing-tier-copy")`.
 * Benefit strings may contain count tokens ({freeLessons}, {courses},
 * {lessons}, {words}, {languages}) interpolated at render time.
 */
export const getPricingTierCopy = unstable_cache(
  async (): Promise<PricingTierCopyMap> => {
    const supabase = createStaticClient();

    const { data, error } = await supabase
      .from("pricing_tier_copy")
      .select("*");

    if (error || !data) {
      return {};
    }

    const map: PricingTierCopyMap = {};
    for (const row of data) {
      map[row.tier_key as PricingTierKey] = {
        audience: row.audience,
        access: row.access,
        accessSubtext: row.access_subtext,
        benefits: [
          row.benefit_1,
          row.benefit_2,
          row.benefit_3,
          row.benefit_4,
          row.benefit_5,
        ].filter((b): b is string => !!b && b.trim().length > 0),
      };
    }
    return map;
  },
  ["pricing-tier-copy"],
  { revalidate: 3600, tags: ["pricing-tier-copy"] }
);

/**
 * Get all pricing tier copy rows (for admin), including blank benefit slots.
 */
export async function getAllPricingTierCopy(): Promise<{
  rows: PricingTierCopyRow[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pricing_tier_copy")
    .select("*")
    .order("tier_key");

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: data || [], error: null };
}

// ============================================================================
// Subscription Page Data
// ============================================================================

/** A published course within a language, prefetched for the expandable list. */
export interface LanguageCourse {
  id: string;
  name: string;
  level: string | null;
  totalLessons: number;
  wordCount: number;
  thumbnailUrl: string | null;
  /** Effective free-lesson allowance (course override or platform default). */
  freeLessons: number;
}

export interface SubscriptionLanguage {
  id: string;
  name: string;
  code: string;
  courseCount: number;
  totalWords: number;
  /** Sum of published-course lesson counts across the language. */
  totalLessons: number;
  /** Free-lesson allowance summed across the language's published courses. */
  freeLessons: number;
  /** Published courses, prefetched so row expansion renders instantly. */
  courses: LanguageCourse[];
}

export interface SubscriptionPageData {
  subscriptions: UserSubscription[];
  plans: PricingPlan[];
  languages: SubscriptionLanguage[];
  userLanguageIds: string[];
  enabledTiers: string[];
  creditBalanceCents: number;
  /** Platform default free-lesson allowance per course (for header copy). */
  defaultFreeLessons: number;
  /**
   * Admin-editable "Access" copy per plan kind: the main line template plus an
   * optional sub-text line (both may contain {token}s). Sub-text hides when blank.
   */
  accessCopy: Partial<Record<PricingTierKey, { template: string | null; subtext: string | null }>>;
  isGuest: boolean;
}

export interface GetSubscriptionPageDataResult {
  data: SubscriptionPageData | null;
  error: string | null;
}

/**
 * Fetch all data needed for the subscription management page.
 */
export async function getSubscriptionPageData(): Promise<GetSubscriptionPageDataResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: {
        subscriptions: [],
        plans: [],
        languages: [],
        userLanguageIds: [],
        enabledTiers: [],
        creditBalanceCents: 0,
        defaultFreeLessons: 0,
        accessCopy: {},
        isGuest: true,
      },
      error: null,
    };
  }

  const [subsResult, plansResult, languagesResult, userLangsResult, userProfileResult, enabledTiers, creditResult, coursesResult, defaultFreeLessons, tierCopy] =
    await Promise.all([
      getUserSubscriptions(),
      getActivePricingPlans(),
      supabase
        .from("languages")
        .select("id, name, code")
        .eq("is_visible", true)
        .order("sort_order"),
      supabase
        .from("user_languages")
        .select("language_id")
        .eq("user_id", user.id),
      supabase
        .from("users")
        .select("current_language_id")
        .eq("id", user.id)
        .single(),
      getEnabledTiers(),
      getCreditBalance(),
      // Full published course rows: drive per-language aggregates AND the
      // prefetched course lists so row expansion is instant (no per-click fetch).
      supabase
        .from("courses")
        .select("id, language_id, name, level, total_lessons, word_count, thumbnail_url, free_lessons")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      getDefaultFreeLessons(),
      getPricingTierCopy(),
    ]);

  // Editable "Access" copy (main line + optional sub-text), keyed by the plan
  // kinds the header uses. A missing row falls back to the built-in template.
  const accessCopy: Partial<Record<PricingTierKey, { template: string | null; subtext: string | null }>> = {};
  for (const key of ["free", "language", "all-languages"] as const) {
    const entry = tierCopy[key];
    if (entry) accessCopy[key] = { template: entry.access, subtext: entry.accessSubtext };
  }

  // Build course count + lesson/free maps, plus the prefetched course lists.
  const courseCountByLanguage: Record<string, number> = {};
  const lessonsByLanguage: Record<string, number> = {};
  const freeLessonsByLanguage: Record<string, number> = {};
  const wordCountByLanguage: Record<string, number> = {};
  const coursesByLanguage: Record<string, LanguageCourse[]> = {};
  coursesResult.data?.forEach((course) => {
    if (course.language_id) {
      courseCountByLanguage[course.language_id] =
        (courseCountByLanguage[course.language_id] || 0) + 1;
      const total = course.total_lessons ?? 0;
      const free = Math.min(course.free_lessons ?? defaultFreeLessons, total);
      lessonsByLanguage[course.language_id] =
        (lessonsByLanguage[course.language_id] || 0) + total;
      freeLessonsByLanguage[course.language_id] =
        (freeLessonsByLanguage[course.language_id] || 0) + free;
      wordCountByLanguage[course.language_id] =
        (wordCountByLanguage[course.language_id] || 0) + (course.word_count ?? 0);
      (coursesByLanguage[course.language_id] ||= []).push({
        id: course.id,
        name: course.name,
        level: course.level,
        totalLessons: total,
        wordCount: course.word_count ?? 0,
        thumbnailUrl: course.thumbnail_url,
        freeLessons: course.free_lessons ?? defaultFreeLessons,
      });
    }
  });

  const languages: SubscriptionLanguage[] = (languagesResult.data || []).map(
    (lang: Pick<Language, "id" | "name" | "code">) => ({
      id: lang.id,
      name: lang.name,
      code: lang.code,
      courseCount: courseCountByLanguage[lang.id] || 0,
      totalWords: wordCountByLanguage[lang.id] || 0,
      totalLessons: lessonsByLanguage[lang.id] || 0,
      freeLessons: freeLessonsByLanguage[lang.id] || 0,
      courses: coursesByLanguage[lang.id] || [],
    })
  );

  // Merge user_languages rows with current_language_id fallback
  const fromUserLangs = (userLangsResult.data || [])
    .map((ul) => ul.language_id)
    .filter(Boolean) as string[];
  const currentLangId = userProfileResult.data?.current_language_id;
  const userLanguageIds = [...new Set([
    ...fromUserLangs,
    ...(currentLangId ? [currentLangId] : []),
  ])];

  return {
    data: {
      subscriptions: subsResult.subscriptions,
      plans: plansResult.plans,
      languages,
      userLanguageIds,
      enabledTiers,
      creditBalanceCents: creditResult.balance.availableCents,
      defaultFreeLessons,
      accessCopy,
      isGuest: false,
    },
    error: subsResult.error || plansResult.error || languagesResult.error?.message || null,
  };
}
