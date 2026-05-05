/**
 * One-off notification helper.
 *
 * Use this whenever an event in the app triggers a notification for a
 * single user (e.g. payment failure, achievement unlock, lesson reminder).
 * It inserts an inbox row per requested channel and, for the email channel,
 * delegates to the sender module (no-op driver by default).
 *
 * For multi-user editorial sends, use the broadcast pipeline instead.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Json,
  NotificationInsert,
} from "@/types/database";
import { sendBroadcastEmails } from "@/lib/notifications/sender";
import { NOTIFICATION_TYPES } from "@/lib/validations/notifications";

type AdminClient = SupabaseClient<Database>;

/**
 * Channels supported by the dispatcher. The "toast" channel is intentionally
 * NOT persisted — toasts are transient client-side renders. We accept it here
 * so a single template can declare both "in_app" + "toast" without callers
 * having to filter; the insert step drops it.
 */
export type NotificationChannel = "in_app" | "email" | "toast";

export interface InsertNotificationInput {
  userId: string;
  type: (typeof NOTIFICATION_TYPES)[number] | string;
  title: string;
  message: string;
  data?: Json | null;
  /** Defaults to ["in_app"]. Pass ["in_app", "email"] for both. */
  channels?: NotificationChannel[];
  /** Optional expiry timestamp (ISO). After this, the row is hidden in inbox queries. */
  expiresAt?: string | null;
}

export interface InsertNotificationResult {
  success: boolean;
  error: string | null;
  notificationIds: string[];
}

/**
 * Insert one notifications row per channel for a single user.
 *
 * Returns aggregate success — partial inserts (e.g. in_app succeeded but
 * email DB row failed) are surfaced via `error` while still returning the
 * IDs that did land. Email transport failures are logged but do not fail
 * the call (inbox row is the source of truth).
 */
export async function insertNotification(
  supabase: AdminClient,
  input: InsertNotificationInput
): Promise<InsertNotificationResult> {
  const channels = input.channels && input.channels.length > 0
    ? input.channels
    : ["in_app"];

  // Toast is a client-only transient channel; it never writes to the inbox.
  // Filter it out before building rows so a template declaring both "in_app"
  // and "toast" lands a single inbox row, not two.
  const persistedChannels = channels.filter((c) => c !== "toast");

  if (persistedChannels.length === 0) {
    // Toast-only template — nothing to write here. Caller (insertFromTemplate)
    // still treats this as success because the template is valid; the toast
    // itself fires from the client.
    return { success: true, error: null, notificationIds: [] };
  }

  const rows: NotificationInsert[] = persistedChannels.map((channel) => ({
    user_id: input.userId,
    channel,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data ?? null,
    expires_at: input.expiresAt ?? null,
    is_read: false,
  }));

  const { data, error } = await supabase
    .from("notifications")
    .insert(rows)
    .select("id");

  if (error) {
    console.error("insertNotification failed:", error.message);
    return { success: false, error: error.message, notificationIds: [] };
  }

  const ids = (data ?? []).map((r) => r.id);

  // Best-effort email transport. Driver is no-op by default.
  if (persistedChannels.includes("email")) {
    try {
      await sendBroadcastEmails(supabase, [input.userId], {
        broadcastId: "direct", // not tied to a broadcast row
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(
        `insertNotification email send failed for user ${input.userId}:`,
        message
      );
    }
  }

  return { success: true, error: null, notificationIds: ids };
}
