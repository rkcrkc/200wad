"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
import type { MutationResult } from "./settings";

// ============================================================================
// Types
// ============================================================================

export interface RecordReferralSignupResult extends MutationResult {
  referralId: string | null;
}

// ============================================================================
// Referral Code Capture
// ============================================================================

/**
 * Record a referral when a new user signs up with a referral code.
 * Called during signup/onboarding after a user is authenticated.
 */
export async function recordReferralSignup(
  referralCode: string
): Promise<RecordReferralSignupResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, referralId: null, error: "Not authenticated" };
    }

    const adminSupabase = createAdminClient();

    // Look up the referrer by referral_code
    const { data: referrer } = await adminSupabase
      .from("users")
      .select("id")
      .eq("referral_code", referralCode)
      .single();

    if (!referrer) {
      return { success: false, referralId: null, error: "Invalid referral code" };
    }

    // Don't allow self-referral
    if (referrer.id === user.id) {
      return { success: false, referralId: null, error: "Cannot refer yourself" };
    }

    // Check if referral already exists for this referred user
    const { data: existing } = await adminSupabase
      .from("referrals")
      .select("id")
      .eq("referred_user_id", user.id)
      .single();

    if (existing) {
      return { success: false, referralId: null, error: "Referral already recorded" };
    }

    // Get referral credit amount from platform config
    const { data: config } = await adminSupabase
      .from("platform_config")
      .select("value")
      .eq("key", "referral_credit_cents")
      .single();

    const creditAmountCents = (config?.value as number) ?? 400; // Default $4

    // Create referral record
    const { data: referral, error } = await adminSupabase
      .from("referrals")
      .insert({
        referrer_id: referrer.id,
        referred_user_id: user.id,
        referral_code: referralCode,
        status: "pending",
        credit_amount_cents: creditAmountCents,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, referralId: null, error: error.message };
    }

    return { success: true, referralId: referral.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, referralId: null, error: message };
  }
}

// ============================================================================
// Referral Completion
// ============================================================================

/**
 * Complete a pending referral and credit the referrer.
 * Called when the referred user completes their first lesson.
 */
export async function completeReferralIfPending(): Promise<MutationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const adminSupabase = createAdminClient();

    // Find pending referral for this user
    const { data: referral } = await adminSupabase
      .from("referrals")
      .select("*")
      .eq("referred_user_id", user.id)
      .eq("status", "pending")
      .single();

    if (!referral) {
      // No pending referral — nothing to do
      return { success: true, error: null };
    }

    // Mark referral as completed
    await adminSupabase
      .from("referrals")
      .update({
        status: "completed",
        credited_at: new Date().toISOString(),
      })
      .eq("id", referral.id);

    // Create credit transaction for the referrer
    await adminSupabase.from("credit_transactions").insert({
      user_id: referral.referrer_id,
      amount_cents: referral.credit_amount_cents,
      type: "referral",
      status: "confirmed",
      reference_id: referral.id,
      description: `Referral credit for inviting a friend`,
    });

    // Sync to Stripe Customer Balance
    await syncCreditToStripe(referral.referrer_id, referral.credit_amount_cents);

    revalidatePath("/referrals");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// Stripe Balance Sync
// ============================================================================

/**
 * Add credit to a user's Stripe Customer Balance.
 * Stripe customer balance is expressed as negative = credit.
 */
async function syncCreditToStripe(
  userId: string,
  amountCents: number
): Promise<void> {
  const adminSupabase = createAdminClient();

  const { data: userData } = await adminSupabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (!userData?.stripe_customer_id) {
    // User doesn't have a Stripe customer yet — credits will apply at checkout
    return;
  }

  try {
    const stripe = getStripe();
    // Negative amount = credit on customer balance
    await stripe.customers.createBalanceTransaction(
      userData.stripe_customer_id,
      {
        amount: -amountCents,
        currency: "usd",
        description: "Referral credit",
      }
    );
  } catch (err) {
    // Log but don't fail — credit is tracked in our DB
    console.error("Failed to sync credit to Stripe:", err);
  }
}
