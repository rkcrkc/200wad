"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/utils/adminGuard";
import { revalidatePath } from "next/cache";

export interface MutationResult {
  success: boolean;
  error: string | null;
}

/**
 * Manually adjust a user's credit balance (admin only).
 */
export async function adjustUserCredit(
  userId: string,
  amountCents: number,
  description: string
): Promise<MutationResult> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount_cents: amountCents,
      type: "adjustment",
      status: "confirmed",
      description,
    });

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
