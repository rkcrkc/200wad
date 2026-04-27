import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Notification, NotificationBroadcast } from "@/types/database";

/**
 * Fetch the current user's recent in-app notifications for the bell dropdown.
 *
 * Filters:
 *   - channel = 'in_app'
 *   - dismissed_at IS NULL
 *   - expires_at IS NULL OR expires_at > now()
 *
 * Newest first.
 */
export async function listInboxNotifications(
  limit = 30
): Promise<Notification[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("channel", "in_app")
    .is("dismissed_at", null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("listInboxNotifications error:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Count unread, non-dismissed, non-expired in-app notifications for the bell badge.
 */
export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const nowIso = new Date().toISOString();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("channel", "in_app")
    .eq("is_read", false)
    .is("dismissed_at", null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  if (error) {
    console.error("getUnreadCount error:", error);
    return 0;
  }

  return count ?? 0;
}

/** Fetch a single notification owned by the current user. */
export async function getNotification(
  id: string
): Promise<Notification | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getNotification error:", error);
    return null;
  }

  return data;
}

// ============================================================================
// Admin queries
// ============================================================================

export interface BroadcastWithStats extends NotificationBroadcast {
  delivered_count: number;
  read_count: number;
}

/** Admin: list all broadcasts with delivery + read counts. */
export async function listBroadcasts(): Promise<BroadcastWithStats[]> {
  const supabase = createAdminClient();

  const { data: broadcasts, error } = await supabase
    .from("notification_broadcasts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !broadcasts) {
    if (error) console.error("listBroadcasts error:", error);
    return [];
  }

  if (broadcasts.length === 0) return [];

  // Aggregate delivered + read counts per broadcast.
  const ids = broadcasts.map((b) => b.id);
  const { data: deliveryRows } = await supabase
    .from("notifications")
    .select("broadcast_id, is_read")
    .in("broadcast_id", ids);

  const stats = new Map<string, { delivered: number; read: number }>();
  for (const row of deliveryRows ?? []) {
    if (!row.broadcast_id) continue;
    const cur = stats.get(row.broadcast_id) ?? { delivered: 0, read: 0 };
    cur.delivered += 1;
    if (row.is_read) cur.read += 1;
    stats.set(row.broadcast_id, cur);
  }

  return broadcasts.map((b) => {
    const s = stats.get(b.id) ?? { delivered: 0, read: 0 };
    return {
      ...b,
      delivered_count: s.delivered,
      read_count: s.read,
    };
  });
}

/** Admin: fetch a single broadcast. */
export async function getBroadcast(
  id: string
): Promise<NotificationBroadcast | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notification_broadcasts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getBroadcast error:", error);
    return null;
  }

  return data;
}
