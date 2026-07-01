"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
// Switch Unlocked Language
// ============================================================================

/**
 * Re-target the user's active individual-language subscription to a different
 * language. The "language" pricing tier is language-agnostic (one price for any
 * language), so this is a pure re-pointing of the paid slot — no Stripe change.
 */
export async function switchLanguageSubscription(
  subscriptionId: string,
  newLanguageId: string
): Promise<MutationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const adminSupabase = createAdminClient();

    // Load the subscription and verify it belongs to the user, is a language
    // sub, and is still effective (active, or cancelled within the paid period).
    const { data: sub, error: subError } = await adminSupabase
      .from("subscriptions")
      .select("id, user_id, type, status, current_period_end, target_id")
      .eq("id", subscriptionId)
      .single();

    if (subError || !sub) {
      return { success: false, error: "Subscription not found" };
    }
    if (sub.user_id !== user.id) {
      return { success: false, error: "Not authorized" };
    }
    if (sub.type !== "language") {
      return { success: false, error: "Only individual-language plans can be switched" };
    }

    const isEffective =
      sub.status === "active" ||
      (sub.status === "cancelled" &&
        sub.current_period_end !== null &&
        new Date(sub.current_period_end) > new Date());
    if (!isEffective) {
      return { success: false, error: "This plan is no longer active" };
    }

    if (newLanguageId === sub.target_id) {
      return { success: false, error: "That language is already unlocked" };
    }

    // Verify the target language exists and is visible.
    const { data: lang } = await adminSupabase
      .from("languages")
      .select("id")
      .eq("id", newLanguageId)
      .eq("is_visible", true)
      .single();

    if (!lang) {
      return { success: false, error: "Language not available" };
    }

    const { error: updateError } = await adminSupabase
      .from("subscriptions")
      .update({ target_id: newLanguageId, updated_at: new Date().toISOString() })
      .eq("id", subscriptionId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/account/subscriptions");
    revalidatePath("/dashboard");

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
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
