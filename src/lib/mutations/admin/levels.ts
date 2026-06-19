"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/utils/adminGuard";
import { revalidatePath } from "next/cache";
import {
  createLevelSchema,
  updateLevelSchema,
  type CreateLevelInput,
  type UpdateLevelInput,
} from "@/lib/validations/admin";
import { ZodError } from "zod";

export async function createLevel(input: CreateLevelInput) {
  await requireAdmin();
  const supabase = createAdminClient();

  try {
    const validated = createLevelSchema.parse(input);

    const { data: level, error } = await supabase
      .from("levels")
      .insert({
        level_number: validated.level_number,
        slug: validated.slug,
        name: validated.name,
        color: validated.color,
        xp_threshold: validated.xp_threshold,
        lessons_mastered_threshold: validated.lessons_mastered_threshold,
        enabled: validated.enabled,
      })
      .select("id")
      .single();

    if (error || !level) {
      return { success: false, error: error?.message ?? "Failed to create level", id: null };
    }

    revalidatePath("/admin/levels");
    return { success: true, error: null, id: level.id };
  } catch (err) {
    if (err instanceof ZodError) {
      const firstError = err.issues[0];
      const fieldName = firstError.path.join(".");
      return { success: false, error: `${fieldName}: ${firstError.message}`, id: null };
    }
    return { success: false, error: "Unexpected error", id: null };
  }
}

export async function updateLevel(id: string, input: UpdateLevelInput) {
  await requireAdmin();
  const supabase = createAdminClient();

  try {
    const validated = updateLevelSchema.parse(input);

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (validated.level_number !== undefined) updatePayload.level_number = validated.level_number;
    if (validated.slug !== undefined) updatePayload.slug = validated.slug;
    if (validated.name !== undefined) updatePayload.name = validated.name;
    if (validated.color !== undefined) updatePayload.color = validated.color;
    if (validated.xp_threshold !== undefined) updatePayload.xp_threshold = validated.xp_threshold;
    if (validated.lessons_mastered_threshold !== undefined)
      updatePayload.lessons_mastered_threshold = validated.lessons_mastered_threshold;
    if (validated.enabled !== undefined) updatePayload.enabled = validated.enabled;

    const { error } = await supabase.from("levels").update(updatePayload).eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/levels");
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

export async function deleteLevel(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from("levels").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/levels");
  return { success: true, error: null };
}

export async function toggleLevelEnabled(id: string, enabled: boolean) {
  return updateLevel(id, { enabled });
}
