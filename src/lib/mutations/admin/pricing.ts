"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/adminGuard";
import {
  createPricingPlanSchema,
  updatePricingPlanSchema,
  updatePricingTierCopySchema,
  type CreatePricingPlanInput,
  type UpdatePricingPlanInput,
  type UpdatePricingTierCopyInput,
} from "@/lib/validations/admin";
import { revalidatePath, updateTag } from "next/cache";

// ============================================================================
// Types
// ============================================================================

export interface MutationResult {
  success: boolean;
  error: string | null;
}

export interface CreatePricingPlanResult extends MutationResult {
  id: string | null;
}

// ============================================================================
// CREATE
// ============================================================================

export async function createPricingPlan(
  input: CreatePricingPlanInput
): Promise<CreatePricingPlanResult> {
  try {
    await requireAdmin();
    const validated = createPricingPlanSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("pricing_plans")
      .insert({
        tier: validated.tier,
        billing_model: validated.billing_model,
        amount_cents: validated.amount_cents,
        currency: validated.currency ?? "usd",
        is_active: validated.is_active ?? false,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, id: null, error: error.message };
    }

    revalidatePath("/admin/settings");
    updateTag("pricing-plans");
    return { success: true, id: data.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, id: null, error: message };
  }
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updatePricingPlan(
  id: string,
  input: UpdatePricingPlanInput
): Promise<MutationResult> {
  try {
    await requireAdmin();
    const validated = updatePricingPlanSchema.parse(input);
    const supabase = await createClient();

    const { error } = await supabase
      .from("pricing_plans")
      .update(validated)
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/settings");
    updateTag("pricing-plans");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// DELETE
// ============================================================================

export async function deletePricingPlan(id: string): Promise<MutationResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("pricing_plans")
      .delete()
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/settings");
    updateTag("pricing-plans");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// TOGGLE ACTIVE
// ============================================================================

export async function togglePricingPlanActive(
  id: string,
  isActive: boolean
): Promise<MutationResult> {
  return updatePricingPlan(id, { is_active: isActive });
}

// ============================================================================
// PRICING TIER COPY (upgrade-modal card copy)
// ============================================================================

/**
 * Upsert the editable upgrade-modal copy for a single tier. Benefit strings may
 * contain count tokens ({freeLessons}, {courses}, {lessons}, {words},
 * {languages}) interpolated against live content totals at render time.
 */
export async function updatePricingTierCopy(
  input: UpdatePricingTierCopyInput
): Promise<MutationResult> {
  try {
    await requireAdmin();
    const validated = updatePricingTierCopySchema.parse(input);
    const supabase = await createClient();

    const { error } = await supabase
      .from("pricing_tier_copy")
      .upsert(validated, { onConflict: "tier_key" });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/settings");
    updateTag("pricing-tier-copy");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
