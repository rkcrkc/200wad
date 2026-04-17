"use server";

import { createClient } from "@/lib/supabase/server";

/** Dismiss a tip for the current user (globally, not per-word) */
export async function dismissTip(tipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("user_tip_dismissals")
    .upsert(
      { user_id: user.id, tip_id: tipId },
      { onConflict: "user_id,tip_id" }
    );

  if (error) {
    console.error("Error dismissing tip:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/** Reset all tip dismissals for the current user (tips will reappear) */
export async function resetAllTipDismissals() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("user_tip_dismissals")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("Error resetting tip dismissals:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
