"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/adminGuard";
import { revalidatePath } from "next/cache";
import type { Json } from "@/types/database";

export interface MutationResult {
  success: boolean;
  error: string | null;
}

/**
 * Update a platform config value.
 */
export async function updatePlatformConfig(
  key: string,
  value: unknown
): Promise<MutationResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    // Upsert: update if exists, insert if not
    const { error } = await supabase
      .from("platform_config")
      .upsert(
        { key, value: value as Json, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/settings");
    revalidatePath("/admin/text-labels");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
