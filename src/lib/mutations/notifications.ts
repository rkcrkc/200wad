"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Notification } from "@/types/database";

interface MutationResult {
  success: boolean;
  error: string | null;
}

/**
 * Fetch the bell-dropdown payload for the current user in one round-trip.
 * Returns recent in-app notifications + unread count.
 */
export async function fetchInbox(
  limit = 20
): Promise<{ items: Notification[]; unreadCount: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], unreadCount: 0 };

  const nowIso = new Date().toISOString();

  const [{ data: items }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("channel", "in_app")
      .is("dismissed_at", null)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("channel", "in_app")
      .eq("is_read", false)
      .is("dismissed_at", null)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
  ]);

  return { items: items ?? [], unreadCount: count ?? 0 };
}

/** Mark a single notification as read. RLS scopes to the current user. */
export async function markAsRead(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("markAsRead error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Mark every unread in-app notification for the current user as read. */
export async function markAllAsRead(): Promise<MutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("channel", "in_app")
    .eq("is_read", false);

  if (error) {
    console.error("markAllAsRead error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Soft-delete: hides the notification from the inbox without removing the row
 * (so analytics on broadcasts stay accurate).
 */
export async function dismissNotification(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("dismissNotification error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
