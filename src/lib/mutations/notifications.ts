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
 * Returns recent in-app notifications + the "since last seen" badge count.
 *
 * `unreadCount` here is the badge count: notifications created after the
 * user last opened the dropdown. Per-row `is_read` is independent and only
 * controls the visual style of individual rows.
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

  // Fetch items + the user's last-seen baseline in parallel.
  const [{ data: items }, { data: userRow }] = await Promise.all([
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
      .from("users")
      .select("notifications_last_seen_at")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const lastSeen = userRow?.notifications_last_seen_at ?? null;

  let countQuery = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("channel", "in_app")
    .is("dismissed_at", null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  if (lastSeen) {
    countQuery = countQuery.gt("created_at", lastSeen);
  }

  const { count } = await countQuery;

  return { items: items ?? [], unreadCount: count ?? 0 };
}

/**
 * Stamp `users.notifications_last_seen_at = now()` to clear the bell badge.
 * Called when the user opens the dropdown. Does not modify per-row `is_read`.
 */
export async function markNotificationsSeen(): Promise<MutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("users")
    .update({ notifications_last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("markNotificationsSeen error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
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

/** Mark a single notification as unread. RLS scopes to the current user. */
export async function markAsUnread(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: false })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("markAsUnread error:", error);
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
