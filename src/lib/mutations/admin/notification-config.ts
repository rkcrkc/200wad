"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/utils/adminGuard";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  createTemplateSchema,
  updateTemplateSchema,
  updateNotificationTypeSchema,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type UpdateNotificationTypeInput,
} from "@/lib/validations/notifications";
import type { Json } from "@/types/database";

interface MutationResult {
  success: boolean;
  error: string | null;
  id?: string | null;
}

function zodErrorMessage(err: ZodError): string {
  const first = err.issues[0];
  return `${first.path.join(".") || "input"}: ${first.message}`;
}

// ===========================================================================
// notification_types
// ===========================================================================

/**
 * Update a notification type config row (label, description, enabled, sort).
 * Disabling a type stops all broadcasts of that type from sending and
 * causes `insertFromTemplate` to silently skip writes.
 */
export async function updateNotificationType(
  type: string,
  input: UpdateNotificationTypeInput
): Promise<MutationResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  try {
    const v = updateNotificationTypeSchema.parse(input);
    if (Object.keys(v).length === 0) {
      return { success: true, error: null };
    }

    const { error } = await supabase
      .from("notification_types")
      .update(v)
      .eq("type", type);

    if (error) {
      console.error("updateNotificationType failed:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/notifications");
    return { success: true, error: null };
  } catch (err) {
    if (err instanceof ZodError) {
      return { success: false, error: zodErrorMessage(err) };
    }
    console.error("updateNotificationType unexpected:", err);
    return { success: false, error: "Unexpected error" };
  }
}

// ===========================================================================
// notification_templates
// ===========================================================================

export async function createNotificationTemplate(
  input: CreateTemplateInput
): Promise<MutationResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  try {
    const v = createTemplateSchema.parse(input);

    const { data, error } = await supabase
      .from("notification_templates")
      .insert({
        key: v.key,
        label: v.label,
        description: v.description ?? null,
        type: v.type,
        enabled: v.enabled,
        title: v.title,
        message: v.message,
        channels: v.channels,
        default_data: (v.default_data ?? null) as Json | null,
        // Admin-created templates are never marked as system; only DB seeds
        // and explicit code paths can set is_system=true.
        is_system: false,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("createNotificationTemplate failed:", error);
      return {
        success: false,
        error: error?.message ?? "Failed to create template",
        id: null,
      };
    }

    revalidatePath("/admin/notifications");
    return { success: true, error: null, id: data.id };
  } catch (err) {
    if (err instanceof ZodError) {
      return { success: false, error: zodErrorMessage(err), id: null };
    }
    console.error("createNotificationTemplate unexpected:", err);
    return { success: false, error: "Unexpected error", id: null };
  }
}

export async function updateNotificationTemplate(
  id: string,
  input: UpdateTemplateInput
): Promise<MutationResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  try {
    const v = updateTemplateSchema.parse(input);

    const payload: Record<string, unknown> = {};
    if (v.label !== undefined) payload.label = v.label;
    if (v.description !== undefined) payload.description = v.description;
    if (v.type !== undefined) payload.type = v.type;
    if (v.enabled !== undefined) payload.enabled = v.enabled;
    if (v.title !== undefined) payload.title = v.title;
    if (v.message !== undefined) payload.message = v.message;
    if (v.channels !== undefined) payload.channels = v.channels;
    if (v.default_data !== undefined) {
      payload.default_data = v.default_data as Json | null;
    }

    if (Object.keys(payload).length === 0) {
      return { success: true, error: null };
    }

    const { error } = await supabase
      .from("notification_templates")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("updateNotificationTemplate failed:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/notifications");
    return { success: true, error: null };
  } catch (err) {
    if (err instanceof ZodError) {
      return { success: false, error: zodErrorMessage(err) };
    }
    console.error("updateNotificationTemplate unexpected:", err);
    return { success: false, error: "Unexpected error" };
  }
}

/** Delete a template. is_system templates are protected (cannot be deleted). */
export async function deleteNotificationTemplate(
  id: string
): Promise<MutationResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("notification_templates")
    .select("is_system")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Template not found" };
  }
  if (existing.is_system) {
    return {
      success: false,
      error:
        "System templates cannot be deleted (they're registered by code). Disable instead.",
    };
  }

  const { error } = await supabase
    .from("notification_templates")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/notifications");
  return { success: true, error: null };
}
