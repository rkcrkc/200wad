"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/utils/adminGuard";
import { revalidatePath } from "next/cache";
import {
  createTipSchema,
  updateTipSchema,
  type CreateTipInput,
  type UpdateTipInput,
} from "@/lib/validations/tips";
import { ZodError } from "zod";

export async function createTip(input: CreateTipInput) {
  await requireAdmin();
  const supabase = createAdminClient();

  try {
    const validated = createTipSchema.parse(input);
    const { word_ids, ...tipData } = validated;

    // Insert tip
    const { data: tip, error: tipError } = await supabase
      .from("tips")
      .insert({
        title: tipData.title ?? null,
        body: tipData.body,
        emoji: tipData.emoji ?? null,
        display_context: tipData.display_context,
        is_active: tipData.is_active,
        sort_order: tipData.sort_order,
      })
      .select("id")
      .single();

    if (tipError || !tip) {
      return { success: false, error: tipError?.message ?? "Failed to create tip", id: null };
    }

    // Insert tip_words junction rows
    if (word_ids.length > 0) {
      const tipWordRows = word_ids.map((wordId, i) => ({
        tip_id: tip.id,
        word_id: wordId,
        sort_order: i,
      }));

      const { error: twError } = await supabase
        .from("tip_words")
        .insert(tipWordRows);

      if (twError) {
        console.error("Error linking words to tip:", twError);
      }
    }

    revalidatePath("/admin/tips");
    return { success: true, error: null, id: tip.id };
  } catch (err) {
    if (err instanceof ZodError) {
      const firstError = err.issues[0];
      const fieldName = firstError.path.join(".");
      return { success: false, error: `${fieldName}: ${firstError.message}`, id: null };
    }
    return { success: false, error: "Unexpected error", id: null };
  }
}

export async function updateTip(id: string, input: UpdateTipInput) {
  await requireAdmin();
  const supabase = createAdminClient();

  try {
    const validated = updateTipSchema.parse(input);
    const { word_ids, ...tipData } = validated;

    // Update tip fields
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (tipData.title !== undefined) updatePayload.title = tipData.title;
    if (tipData.body !== undefined) updatePayload.body = tipData.body;
    if (tipData.emoji !== undefined) updatePayload.emoji = tipData.emoji;
    if (tipData.display_context !== undefined) updatePayload.display_context = tipData.display_context;
    if (tipData.is_active !== undefined) updatePayload.is_active = tipData.is_active;
    if (tipData.sort_order !== undefined) updatePayload.sort_order = tipData.sort_order;

    const { error: updateError } = await supabase
      .from("tips")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Replace tip_words if word_ids provided
    if (word_ids !== undefined) {
      // Delete existing
      await supabase.from("tip_words").delete().eq("tip_id", id);

      // Insert new
      if (word_ids.length > 0) {
        const tipWordRows = word_ids.map((wordId, i) => ({
          tip_id: id,
          word_id: wordId,
          sort_order: i,
        }));

        const { error: twError } = await supabase
          .from("tip_words")
          .insert(tipWordRows);

        if (twError) {
          console.error("Error updating tip words:", twError);
        }
      }
    }

    revalidatePath("/admin/tips");
    return { success: true, error: null };
  } catch (err) {
    if (err instanceof ZodError) {
      const firstError = err.issues[0];
      const fieldName = firstError.path.join(".");
      return { success: false, error: `${fieldName}: ${firstError.message}` };
    }
    return { success: false, error: "Unexpected error" };
  }
}

export async function deleteTip(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from("tips").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/tips");
  return { success: true, error: null };
}

export async function toggleTipActive(id: string, isActive: boolean) {
  return updateTip(id, { is_active: isActive });
}
