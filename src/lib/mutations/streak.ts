"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface RecoverStreakResult {
  success: boolean;
  error: string | null;
  data?: {
    recoveredDays: number;
    coinCost: number;
    coinTransactionId: string;
    newStreak: number;
  };
}

/**
 * Spend coins to recover a 1-3 day streak gap. Wraps the SECURITY DEFINER
 * `recover_streak` RPC. The RPC re-validates every gate (claim matches
 * server-side gap, balance, current_streak > 0) so this action just routes
 * the call and revalidates the affected pages.
 */
export async function recoverStreakAction(
  daysMissed: number
): Promise<RecoverStreakResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const { data, error } = await supabase.rpc("recover_streak", {
    p_user_id: user.id,
    p_days_missed: daysMissed,
  });

  if (error) {
    console.error("Error recovering streak:", error);
    return { success: false, error: error.message };
  }

  // Refresh both surfaces that show streak / coin state.
  revalidatePath("/streak");
  revalidatePath("/trophies");

  const payload = (data ?? {}) as {
    recovered_days?: number;
    coin_cost?: number;
    coin_transaction_id?: string;
    new_streak?: number;
  };

  return {
    success: true,
    error: null,
    data: {
      recoveredDays: payload.recovered_days ?? 0,
      coinCost: payload.coin_cost ?? 0,
      coinTransactionId: payload.coin_transaction_id ?? "",
      newStreak: payload.new_streak ?? 0,
    },
  };
}
