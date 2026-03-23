"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/adminGuard";
import {
  createPricingPlanSchema,
  updatePricingPlanSchema,
  type CreatePricingPlanInput,
  type UpdatePricingPlanInput,
} from "@/lib/validations/admin";
import { revalidatePath } from "next/cache";

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
