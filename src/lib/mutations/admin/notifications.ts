"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/utils/adminGuard";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  createBroadcastSchema,
  updateBroadcastSchema,
  type CreateBroadcastInput,
  type UpdateBroadcastInput,
} from "@/lib/validations/notifications";
import { dispatchBroadcast } from "@/lib/notifications/dispatcher";
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

/**
 * Create a broadcast. Status auto-derives from `scheduled_for`:
 *   future → 'scheduled'
 *   absent → 'draft'
 */
export async function createBroadcast(
  input: CreateBroadcastInput
): Promise<MutationResult> {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  try {
    const v = createBroadcastSchema.parse(input);

    const status =
      v.scheduled_for && new Date(v.scheduled_for) > new Date()
        ? "scheduled"
        : "draft";

    const { data, error } = await supabase
      .from("notification_broadcasts")
      .insert({
        title: v.title,
        message: v.message,
        type: v.type,
        data: (v.data ?? null) as Json,
        audience: v.audience as Json,
        channels: v.channels,
        scheduled_for: v.scheduled_for ?? null,
        status,
        created_by: admin.userId,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("createBroadcast error:", error);
      return {
        success: false,
        error: error?.message ?? "Failed to create broadcast",
        id: null,
      };
    }

    revalidatePath("/admin/notifications");
    return { success: true, error: null, id: data.id };
  } catch (err) {
    if (err instanceof ZodError) {
      return { success: false, error: zodErrorMessage(err), id: null };
    }
    console.error("createBroadcast unexpected:", err);
    return { success: false, error: "Unexpected error", id: null };
  }
}

/**
 * Update an existing broadcast. Only allowed while status is draft or
 * scheduled — sent/sending/failed broadcasts are immutable.
 */
export async function updateBroadcast(
  id: string,
  input: UpdateBroadcastInput
): Promise<MutationResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  try {
    const v = updateBroadcastSchema.parse(input);

    // Block edits on broadcasts that have already been (or are being) sent.
    const { data: existing } = await supabase
      .from("notification_broadcasts")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return { success: false, error: "Broadcast not found" };
    }
    if (existing.status !== "draft" && existing.status !== "scheduled") {
      return {
        success: false,
        error: `Cannot edit a broadcast in status '${existing.status}'`,
      };
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (v.title !== undefined) payload.title = v.title;
    if (v.message !== undefined) payload.message = v.message;
    if (v.type !== undefined) payload.type = v.type;
    if (v.data !== undefined) payload.data = v.data as Json;
    if (v.audience !== undefined) payload.audience = v.audience as Json;
    if (v.channels !== undefined) payload.channels = v.channels;
    if (v.scheduled_for !== undefined) {
      payload.scheduled_for = v.scheduled_for;
      payload.status =
        v.scheduled_for && new Date(v.scheduled_for) > new Date()
          ? "scheduled"
          : "draft";
    }

    const { error } = await supabase
      .from("notification_broadcasts")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("updateBroadcast error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/notifications");
    return { success: true, error: null };
  } catch (err) {
    if (err instanceof ZodError) {
      return { success: false, error: zodErrorMessage(err) };
    }
    console.error("updateBroadcast unexpected:", err);
    return { success: false, error: "Unexpected error" };
  }
}

/** Delete a broadcast. The FK on notifications.broadcast_id is ON DELETE SET NULL. */
export async function deleteBroadcast(id: string): Promise<MutationResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notification_broadcasts")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/notifications");
  return { success: true, error: null };
}

/**
 * Cancel a scheduled broadcast (revert to draft).
 * Only valid for scheduled broadcasts.
 */
export async function cancelScheduledBroadcast(
  id: string
): Promise<MutationResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("notification_broadcasts")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Broadcast not found" };
  }
  if (existing.status !== "scheduled") {
    return {
      success: false,
      error: `Only scheduled broadcasts can be cancelled (current: ${existing.status})`,
    };
  }

  const { error } = await supabase
    .from("notification_broadcasts")
    .update({ status: "draft", scheduled_for: null })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/notifications");
  return { success: true, error: null };
}

/**
 * Send a broadcast immediately. Delegates the fan-out to the dispatcher,
 * which atomically claims the row, resolves the audience, inserts inbox
 * rows per (user × channel), and marks the broadcast as sent.
 */
export async function sendBroadcastNow(id: string): Promise<MutationResult> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("notification_broadcasts")
    .select("status, scheduled_for")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Broadcast not found" };
  }
  if (existing.status !== "draft" && existing.status !== "scheduled") {
    return {
      success: false,
      error: `Cannot send a broadcast in status '${existing.status}'`,
    };
  }

  // Clear any pending schedule so the dispatcher treats this as a now-send.
  if (existing.scheduled_for) {
    await supabase
      .from("notification_broadcasts")
      .update({ scheduled_for: null })
      .eq("id", id);
  }

  const result = await dispatchBroadcast(id);

  revalidatePath("/admin/notifications");

  if (!result.success) {
    return { success: false, error: result.error ?? "Dispatch failed" };
  }
  return { success: true, error: null };
}
