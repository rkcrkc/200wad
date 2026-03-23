"use server";

import type Stripe from "stripe";
import { requireAdmin } from "@/lib/utils/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import type { MutationResult } from "@/lib/mutations/settings";

/**
 * Sync pricing plans to Stripe.
 * Creates Stripe Products and Prices for any active pricing_plans rows
 * that are missing stripe_product_id or stripe_price_id.
 * Admin-only.
 */
export async function syncPricingToStripe(): Promise<MutationResult> {
  try {
    await requireAdmin();

    const stripe = getStripe();
    const supabase = createAdminClient();

    const { data: plans, error } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("is_active", true);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!plans || plans.length === 0) {
      return { success: false, error: "No active pricing plans found" };
    }

    // Group by tier to share products
    const tierProducts: Record<string, string> = {};

    for (const plan of plans) {
      // Create or reuse Stripe Product per tier
      let stripeProductId = plan.stripe_product_id;

      if (!stripeProductId) {
        // Check if another plan in same tier already has a product
        if (tierProducts[plan.tier]) {
          stripeProductId = tierProducts[plan.tier];
        } else {
          const tierLabel =
            plan.tier === "all-languages" ? "All Languages" : "Language";
          const product = await stripe.products.create({
            name: `200WAD ${tierLabel} Subscription`,
            metadata: { tier: plan.tier },
          });
          stripeProductId = product.id;
        }
        tierProducts[plan.tier] = stripeProductId;

        await supabase
          .from("pricing_plans")
          .update({ stripe_product_id: stripeProductId })
          .eq("id", plan.id);
      } else {
        tierProducts[plan.tier] = stripeProductId;
      }

      // Create Stripe Price if missing
      if (!plan.stripe_price_id) {
        const isRecurring = plan.billing_model !== "lifetime";
        const interval =
          plan.billing_model === "annual" ? "year" : "month";

        const priceParams: Stripe.PriceCreateParams = {
          product: stripeProductId,
          unit_amount: plan.amount_cents,
          currency: plan.currency,
          metadata: {
            pricing_plan_id: plan.id,
            tier: plan.tier,
            billing_model: plan.billing_model,
          },
          ...(isRecurring ? { recurring: { interval } } : {}),
        };

        const price = await stripe.prices.create(priceParams);

        await supabase
          .from("pricing_plans")
          .update({ stripe_price_id: price.id })
          .eq("id", plan.id);
      }
    }

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
