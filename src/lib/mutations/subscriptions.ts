"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { createCheckoutSchema, type CreateCheckoutInput } from "@/lib/validations/admin";
import type { MutationResult } from "@/lib/mutations/settings";

// ============================================================================
// Types
// ============================================================================

export interface CheckoutSessionResult extends MutationResult {
  url: string | null;
}

export interface PortalSessionResult extends MutationResult {
  url: string | null;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get or create a Stripe Customer for the authenticated user.
 */
async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (user?.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  await supabase
    .from("users")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  return customer.id;
}

// ============================================================================
// Checkout
// ============================================================================

/**
 * Create a Stripe Checkout Session for the given cart items.
 * Handles both subscription (monthly/annual) and payment (lifetime) modes.
 */
export async function createCheckoutSession(
  input: CreateCheckoutInput
): Promise<CheckoutSessionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, url: null, error: "Not authenticated" };
    }

    const validated = createCheckoutSchema.parse(input);
    const stripe = getStripe();
    const adminSupabase = createAdminClient();

    // Look up stripe_price_id for each item
    const planIds = validated.items.map((item) => item.pricingPlanId);
    const { data: plans, error: plansError } = await adminSupabase
      .from("pricing_plans")
      .select("id, stripe_price_id, billing_model, tier")
      .in("id", planIds);

    if (plansError || !plans) {
      return { success: false, url: null, error: "Failed to look up pricing plans" };
    }

    // Verify all plans have stripe_price_id
    const missingStripe = plans.filter((p) => !p.stripe_price_id);
    if (missingStripe.length > 0) {
      return {
        success: false,
        url: null,
        error: "Some pricing plans have not been synced to Stripe. Run syncPricingToStripe first.",
      };
    }

    // Separate lifetime vs recurring items
    const lifetimeItems = plans.filter((p) => p.billing_model === "lifetime");
    const recurringItems = plans.filter((p) => p.billing_model !== "lifetime");

    if (lifetimeItems.length > 0 && recurringItems.length > 0) {
      return {
        success: false,
        url: null,
        error: "Cannot mix lifetime and recurring items in a single checkout. Please separate them.",
      };
    }

    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email || ""
    );

    const isLifetime = lifetimeItems.length > 0;
    const mode = isLifetime ? "payment" : "subscription";

    // Build line items with metadata
    const lineItems = validated.items.map((item) => {
      const plan = plans.find((p) => p.id === item.pricingPlanId);
      return {
        price: plan!.stripe_price_id!,
        quantity: 1,
      };
    });

    // Build metadata for the session
    const itemsMeta = validated.items.map((item) => ({
      pricingPlanId: item.pricingPlanId,
      tier: item.tier,
      targetId: item.targetId,
    }));

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: mode as "subscription" | "payment",
      line_items: lineItems,
      success_url: `${origin}/account/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/account/subscriptions/cancel`,
      metadata: {
        user_id: user.id,
        items: JSON.stringify(itemsMeta),
      },
    });

    return { success: true, url: session.url, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, url: null, error: message };
  }
}

// ============================================================================
// Language Courses (for expandable rows)
// ============================================================================

export interface LanguageCourse {
  id: string;
  name: string;
  level: string | null;
  totalLessons: number;
  actualWordCount: number;
}

export interface GetLanguageCoursesResult extends MutationResult {
  courses: LanguageCourse[];
}

/**
 * Fetch courses for a language (used in expandable subscription rows).
 */
export async function getLanguageCoursesAction(
  languageId: string
): Promise<GetLanguageCoursesResult> {
  try {
    const supabase = await createClient();

    // Fetch published courses for this language
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("id, name, level")
      .eq("language_id", languageId)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (coursesError || !courses) {
      return { success: false, courses: [], error: coursesError?.message || "Failed to fetch courses" };
    }

    if (courses.length === 0) {
      return { success: true, courses: [], error: null };
    }

    // Get lesson counts per course
    const courseIds = courses.map((c) => c.id);
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, course_id")
      .in("course_id", courseIds);

    const lessonCountByCourse: Record<string, number> = {};
    lessons?.forEach((lesson) => {
      if (lesson.course_id) {
        lessonCountByCourse[lesson.course_id] =
          (lessonCountByCourse[lesson.course_id] || 0) + 1;
      }
    });

    // Count actual words per course (via lesson_words)
    const allLessonIds = lessons?.map((l) => l.id) || [];
    const wordCountByCourse: Record<string, number> = {};

    if (allLessonIds.length > 0) {
      // Paginate via .range() — PostgREST's 1,000-row max-rows cap silently
      // truncates single-request responses, which would under-count words
      // per course for languages with many courses/lessons.
      const lessonWords = await fetchAllRows<{ lesson_id: string | null }>(
        (from, to) =>
          supabase
            .from("lesson_words")
            .select("lesson_id")
            .in("lesson_id", allLessonIds)
            .range(from, to),
        { label: "getLanguageCoursesAction:lesson_words" }
      );

      lessonWords.forEach((lw) => {
        const lesson = lessons?.find((l) => l.id === lw.lesson_id);
        if (lesson?.course_id) {
          wordCountByCourse[lesson.course_id] =
            (wordCountByCourse[lesson.course_id] || 0) + 1;
        }
      });
    }

    const result: LanguageCourse[] = courses.map((course) => ({
      id: course.id,
      name: course.name,
      level: course.level,
      totalLessons: lessonCountByCourse[course.id] || 0,
      actualWordCount: wordCountByCourse[course.id] || 0,
    }));

    return { success: true, courses: result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, courses: [], error: message };
  }
}

// ============================================================================
// Customer Portal
// ============================================================================

/**
 * Create a Stripe Customer Portal session for managing existing subscriptions.
 */
export async function createCustomerPortalSession(): Promise<PortalSessionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, url: null, error: "Not authenticated" };
    }

    const adminSupabase = createAdminClient();
    const { data: userData } = await adminSupabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!userData?.stripe_customer_id) {
      return {
        success: false,
        url: null,
        error: "No Stripe customer found. You may not have an active subscription.",
      };
    }

    const stripe = getStripe();
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${origin}/account/subscriptions`,
    });

    return { success: true, url: session.url, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, url: null, error: message };
  }
}
