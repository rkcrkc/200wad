"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/utils/adminGuard";
import { revalidatePath } from "next/cache";
import {
  createLeagueSchema,
  updateLeagueSchema,
  type CreateLeagueInput,
  type UpdateLeagueInput,
} from "@/lib/validations/admin";
import { ZodError } from "zod";

export async function createLeague(input: CreateLeagueInput) {
  await requireAdmin();
  const supabase = createAdminClient();

  try {
    const validated = createLeagueSchema.parse(input);

    const { data: league, error } = await supabase
      .from("leagues")
      .insert({
        tier_order: validated.tier_order,
        slug: validated.slug,
        name: validated.name,
        icon: validated.icon,
        color: validated.color,
        division_size: validated.division_size,
        promote_count: validated.promote_count,
        relegate_count: validated.relegate_count,
        enabled: validated.enabled,
      })
      .select("id")
      .single();

    if (error || !league) {
      return { success: false, error: error?.message ?? "Failed to create league", id: null };
    }

    revalidatePath("/admin/leagues");
    return { success: true, error: null, id: league.id };
  } catch (err) {
    if (err instanceof ZodError) {
      const firstError = err.issues[0];
      const fieldName = firstError.path.join(".");
      return { success: false, error: `${fieldName}: ${firstError.message}`, id: null };
    }
    return { success: false, error: "Unexpected error", id: null };
  }
}

export async function updateLeague(id: string, input: UpdateLeagueInput) {
  await requireAdmin();
  const supabase = createAdminClient();

  try {
    const validated = updateLeagueSchema.parse(input);

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (validated.tier_order !== undefined) updatePayload.tier_order = validated.tier_order;
    if (validated.slug !== undefined) updatePayload.slug = validated.slug;
    if (validated.name !== undefined) updatePayload.name = validated.name;
    if (validated.icon !== undefined) updatePayload.icon = validated.icon;
    if (validated.color !== undefined) updatePayload.color = validated.color;
    if (validated.division_size !== undefined) updatePayload.division_size = validated.division_size;
    if (validated.promote_count !== undefined) updatePayload.promote_count = validated.promote_count;
    if (validated.relegate_count !== undefined) updatePayload.relegate_count = validated.relegate_count;
    if (validated.enabled !== undefined) updatePayload.enabled = validated.enabled;

    const { error } = await supabase.from("leagues").update(updatePayload).eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/leagues");
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

export async function deleteLeague(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from("leagues").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/leagues");
  return { success: true, error: null };
}

export async function toggleLeagueEnabled(id: string, enabled: boolean) {
  return updateLeague(id, { enabled });
}
