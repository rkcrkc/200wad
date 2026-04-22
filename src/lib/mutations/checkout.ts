"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

// ============================================================================
// Types & Validation
// ============================================================================

const directCheckoutSchema = z.object({
  tier: z.enum(["language", "all-languages"]),
  billingModel: z.enum(["monthly", "annual", "lifetime"]),
  languageId: z.string().uuid().nullable(),
  languageName: z.string().nullable(),
  originLessonId: z.string().uuid().optional(),
  cancelUrl: z.string().optional(),
});

export type DirectCheckoutInput = z.infer<typeof directCheckoutSchema>;

export interface DirectCheckoutResult {
  success: boolean;
  url: string | null;
  error: string | null;
}

// ============================================================================
// Helpers
// ============================================================================

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
// Direct Checkout
// ============================================================================

/**
 * Create a Stripe Checkout Session directly from the UpgradeModal.
 * Bypasses the subscriptions page for a streamlined 2-step funnel.
 */
export async function createDirectCheckout(
  input: DirectCheckoutInput
): Promise<DirectCheckoutResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, url: null, error: "Not authenticated" };
    }

    const validated = directCheckoutSchema.parse(input);
    const adminSupabase = createAdminClient();

    // Find the matching pricing plan
    const { data: plan, error: planError } = await adminSupabase
      .from("pricing_plans")
      .select("id, stripe_price_id, billing_model, tier, amount_cents")
      .eq("tier", validated.tier)
      .eq("billing_model", validated.billingModel)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return {
        success: false,
        url: null,
        error: "No matching pricing plan found for this tier and billing model.",
      };
    }

    if (!plan.stripe_price_id) {
      return {
        success: false,
        url: null,
        error: "This pricing plan has not been synced to Stripe yet.",
      };
    }

    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email || ""
    );

    const isLifetime = validated.billingModel === "lifetime";
    const mode = isLifetime ? "payment" : "subscription";
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Build metadata
    const metadata: Record<string, string> = {
      user_id: user.id,
      items: JSON.stringify([
        {
          pricingPlanId: plan.id,
          tier: validated.tier,
          targetId: validated.languageId,
        },
      ]),
    };

    if (validated.originLessonId) {
      metadata.origin_lesson_id = validated.originLessonId;
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: mode as "subscription" | "payment",
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/account/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: validated.cancelUrl || `${origin}/account/subscriptions`,
      metadata,
    });

    return { success: true, url: session.url, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, url: null, error: message };
  }
}
