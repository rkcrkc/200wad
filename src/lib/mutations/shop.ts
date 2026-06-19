"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface PurchaseResult {
  success: boolean;
  error: string | null;
  data?: {
    purchaseId: string;
    coinCost: number;
    coinTransactionId: string;
    itemSlug: string;
  };
}

/**
 * Spend coins on a shop item. Wraps the SECURITY DEFINER `purchase_shop_item`
 * RPC, which re-validates every gate (active, max-owned, balance) and applies
 * the item effect server-side. This action just routes the call and
 * revalidates the surfaces that show coin / inventory state.
 */
export async function purchaseItemAction(
  itemId: string,
  quantity = 1
): Promise<PurchaseResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const { data, error } = await supabase.rpc("purchase_shop_item", {
    p_user_id: user.id,
    p_item_id: itemId,
    p_quantity: quantity,
  });

  if (error) {
    console.error("Error purchasing shop item:", error);
    return { success: false, error: error.message };
  }

  // Refresh the shop (balance + owned counts) and the streak page (freeze
  // count, since streak_freeze items top it up).
  revalidatePath("/shop");
  revalidatePath("/streak");

  const payload = (data ?? {}) as {
    purchase_id?: string;
    coin_cost?: number;
    coin_transaction_id?: string;
    item_slug?: string;
  };

  return {
    success: true,
    error: null,
    data: {
      purchaseId: payload.purchase_id ?? "",
      coinCost: payload.coin_cost ?? 0,
      coinTransactionId: payload.coin_transaction_id ?? "",
      itemSlug: payload.item_slug ?? "",
    },
  };
}
