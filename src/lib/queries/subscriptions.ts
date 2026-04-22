import { createClient } from "@/lib/supabase/server";
import type { Subscription, PricingPlan, Language } from "@/types/database";
import { getCreditBalance, type CreditBalance } from "./credits";
import { getEnabledTiers } from "@/lib/utils/accessControl";

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
 */
export async function getActivePricingPlans(
  tier?: "course" | "language" | "all-languages"
): Promise<GetPricingPlansResult> {
  const supabase = await createClient();

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
}

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
// Subscription Page Data
// ============================================================================

export interface SubscriptionLanguage {
  id: string;
  name: string;
  code: string;
  courseCount: number;
  totalWords: number;
}

export interface SubscriptionPageData {
  subscriptions: UserSubscription[];
  plans: PricingPlan[];
  languages: SubscriptionLanguage[];
  userLanguageIds: string[];
  enabledTiers: string[];
  creditBalanceCents: number;
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
        isGuest: true,
      },
      error: null,
    };
  }

  const [subsResult, plansResult, languagesResult, userLangsResult, userProfileResult, enabledTiers, creditResult, coursesResult, wordCountsResult] =
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
      // Course counts per language
      supabase
        .from("courses")
        .select("id, language_id")
        .eq("is_published", true),
      // Word counts per language (via words -> lessons -> courses)
      supabase
        .from("words")
        .select(`id, lessons!inner( courses!inner( language_id ) )`),
    ]);

  // Build course count map
  const courseCountByLanguage: Record<string, number> = {};
  coursesResult.data?.forEach((course) => {
    if (course.language_id) {
      courseCountByLanguage[course.language_id] =
        (courseCountByLanguage[course.language_id] || 0) + 1;
    }
  });

  // Build word count map
  const wordCountByLanguage: Record<string, number> = {};
  wordCountsResult.data?.forEach((word) => {
    const langId = (word.lessons as any)?.courses?.language_id;
    if (langId) {
      wordCountByLanguage[langId] = (wordCountByLanguage[langId] || 0) + 1;
    }
  });

  const languages: SubscriptionLanguage[] = (languagesResult.data || []).map(
    (lang: Pick<Language, "id" | "name" | "code">) => ({
      id: lang.id,
      name: lang.name,
      code: lang.code,
      courseCount: courseCountByLanguage[lang.id] || 0,
      totalWords: wordCountByLanguage[lang.id] || 0,
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
      isGuest: false,
    },
    error: subsResult.error || plansResult.error || languagesResult.error?.message || null,
  };
}
