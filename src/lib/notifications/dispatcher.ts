/**
 * Notification dispatcher.
 *
 * Resolves a broadcast's audience to user IDs, fans out one notifications
 * row per (user, channel), and updates the broadcast row with delivery
 * stats. Email channel is recognized but the actual send is deferred to
 * the sender module (Phase 6).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { sendBroadcastEmails } from "@/lib/notifications/sender";
import { isTypeEnabled } from "@/lib/queries/notification-config";
import type { Json, NotificationInsert } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminClient>;

interface AudienceFilter {
  all?: boolean;
  plan?: ("free" | "paid")[];
  language?: string[];
  active_within_days?: number;
  inactive_for_days?: number;
  user_ids?: string[];
}

interface DispatchResult {
  success: boolean;
  recipientCount: number;
  error: string | null;
}

const DISPATCH_PAGE_SIZE = 1000;

/**
 * Resolve a broadcast's audience JSON to a deduplicated list of user IDs.
 *
 * Filters compose with AND. `all: true` short-circuits to every user.
 */
export async function resolveAudience(
  supabase: AdminClient,
  audience: AudienceFilter
): Promise<string[]> {
  // Direct user list bypasses everything else.
  if (audience.user_ids && audience.user_ids.length > 0) {
    return Array.from(new Set(audience.user_ids));
  }

  // Start with all users (paginated to avoid 1k row default cap).
  let userIds: string[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .order("id")
      .range(from, from + DISPATCH_PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to load users: ${error.message}`);
    if (!data || data.length === 0) break;
    userIds.push(...data.map((u) => u.id));
    if (data.length < DISPATCH_PAGE_SIZE) break;
    from += DISPATCH_PAGE_SIZE;
  }

  if (audience.all === true) return userIds;

  // Plan filter — joins via subscriptions table. "paid" = active subscription.
  if (audience.plan && audience.plan.length > 0) {
    const wantsPaid = audience.plan.includes("paid");
    const wantsFree = audience.plan.includes("free");

    if (!(wantsPaid && wantsFree)) {
      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("status", "active");
      if (error) throw new Error(`Plan filter failed: ${error.message}`);
      const paidIds = new Set((subs ?? []).map((s) => s.user_id));

      userIds = userIds.filter((id) =>
        wantsPaid ? paidIds.has(id) : !paidIds.has(id)
      );
    }
  }

  // Language filter — keep users who have at least one matching user_languages row.
  if (audience.language && audience.language.length > 0) {
    const { data: langs, error } = await supabase
      .from("languages")
      .select("id, code")
      .in("code", audience.language);
    if (error) throw new Error(`Language lookup failed: ${error.message}`);
    const langIds = (langs ?? []).map((l) => l.id);

    if (langIds.length === 0) {
      userIds = [];
    } else {
      const { data: ul, error: ulErr } = await supabase
        .from("user_languages")
        .select("user_id")
        .in("language_id", langIds);
      if (ulErr) throw new Error(`Language join failed: ${ulErr.message}`);
      const matched = new Set(
        (ul ?? []).map((r) => r.user_id).filter((v): v is string => !!v)
      );
      userIds = userIds.filter((id) => matched.has(id));
    }
  }

  // Active-within-days filter (last_activity_date >= cutoff).
  if (
    audience.active_within_days !== undefined &&
    audience.active_within_days > 0
  ) {
    const cutoff = new Date(
      Date.now() - audience.active_within_days * 86_400_000
    )
      .toISOString()
      .slice(0, 10);
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .gte("last_activity_date", cutoff);
    if (error) throw new Error(`Active filter failed: ${error.message}`);
    const active = new Set((data ?? []).map((u) => u.id));
    userIds = userIds.filter((id) => active.has(id));
  }

  // Inactive-for-days filter (last_activity_date < cutoff or null).
  if (
    audience.inactive_for_days !== undefined &&
    audience.inactive_for_days > 0
  ) {
    const cutoff = new Date(
      Date.now() - audience.inactive_for_days * 86_400_000
    )
      .toISOString()
      .slice(0, 10);
    const { data: activeRows, error } = await supabase
      .from("users")
      .select("id")
      .gte("last_activity_date", cutoff);
    if (error) throw new Error(`Inactive filter failed: ${error.message}`);
    const recentlyActive = new Set((activeRows ?? []).map((u) => u.id));
    // Keep only users who are NOT in the recently-active set.
    userIds = userIds.filter((id) => !recentlyActive.has(id));
  }

  return Array.from(new Set(userIds));
}

/**
 * Dispatch a single broadcast: resolve audience, insert per-user
 * notifications rows, mark the broadcast as sent.
 */
export async function dispatchBroadcast(
  broadcastId: string
): Promise<DispatchResult> {
  const supabase = createAdminClient();

  const { data: broadcast, error: loadError } = await supabase
    .from("notification_broadcasts")
    .select("*")
    .eq("id", broadcastId)
    .maybeSingle();

  if (loadError || !broadcast) {
    return {
      success: false,
      recipientCount: 0,
      error: loadError?.message ?? "Broadcast not found",
    };
  }

  if (broadcast.status === "sent") {
    return {
      success: true,
      recipientCount: broadcast.recipient_count ?? 0,
      error: null,
    };
  }

  // Type-level gate: if the type is disabled, refuse to dispatch and mark
  // the broadcast as failed with a clear reason. This is the global kill
  // switch for an entire category (system, billing, etc.).
  if (!(await isTypeEnabled(broadcast.type))) {
    await supabase
      .from("notification_broadcasts")
      .update({ status: "failed" })
      .eq("id", broadcastId);
    return {
      success: false,
      recipientCount: 0,
      error: `Notification type '${broadcast.type}' is disabled`,
    };
  }

  // Atomically claim the broadcast so concurrent runs don't double-send.
  const { error: claimError } = await supabase
    .from("notification_broadcasts")
    .update({ status: "sending" })
    .eq("id", broadcastId)
    .in("status", ["draft", "scheduled"]);
  if (claimError) {
    return {
      success: false,
      recipientCount: 0,
      error: `Could not claim broadcast: ${claimError.message}`,
    };
  }

  try {
    const audience = (broadcast.audience ?? {}) as AudienceFilter;
    const userIds = await resolveAudience(supabase, audience);
    const channels = broadcast.channels ?? ["in_app"];

    if (userIds.length === 0) {
      await supabase
        .from("notification_broadcasts")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          recipient_count: 0,
        })
        .eq("id", broadcastId);
      return { success: true, recipientCount: 0, error: null };
    }

    // Build inbox rows. One per (user × channel). Email rows still get
    // inserted so we have a delivery record; the sender module (Phase 6)
    // handles the actual transport.
    const rows: NotificationInsert[] = [];
    for (const uid of userIds) {
      for (const channel of channels) {
        rows.push({
          user_id: uid,
          broadcast_id: broadcastId,
          channel,
          type: broadcast.type,
          title: broadcast.title,
          message: broadcast.message,
          data: broadcast.data as Json | null,
          is_read: false,
        });
      }
    }

    // Insert in chunks to stay under request size limits.
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(chunk);
      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
    }

    // Hand email-channel sends off to the sender module. Failures here are
    // logged but don't fail the broadcast — inbox rows are the source of
    // truth, and the sender is no-op by default.
    if (channels.includes("email")) {
      try {
        const emailResult = await sendBroadcastEmails(supabase, userIds, {
          broadcastId,
          type: broadcast.type,
          title: broadcast.title,
          message: broadcast.message,
          data: broadcast.data as Json | null,
        });
        if (emailResult.failed > 0) {
          console.warn(
            `dispatchBroadcast(${broadcastId}) email partial failure:`,
            JSON.stringify({
              provider: emailResult.provider,
              attempted: emailResult.attempted,
              succeeded: emailResult.succeeded,
              failed: emailResult.failed,
              skipped: emailResult.skipped,
              firstError: emailResult.errors[0],
            })
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(
          `dispatchBroadcast(${broadcastId}) email send failed:`,
          message
        );
      }
    }

    await supabase
      .from("notification_broadcasts")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_count: userIds.length,
      })
      .eq("id", broadcastId);

    return { success: true, recipientCount: userIds.length, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`dispatchBroadcast(${broadcastId}) failed:`, message);
    await supabase
      .from("notification_broadcasts")
      .update({ status: "failed" })
      .eq("id", broadcastId);
    return { success: false, recipientCount: 0, error: message };
  }
}

/**
 * Cron entry: find every scheduled broadcast whose `scheduled_for` has
 * passed and dispatch them sequentially. Also sweeps any broadcasts
 * already in `sending` (e.g. from a previous crashed run) so we don't
 * leave them stuck.
 */
export async function dispatchScheduledBroadcasts(): Promise<{
  dispatched: number;
  failed: number;
  results: { id: string; recipientCount: number; error: string | null }[];
}> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabase
    .from("notification_broadcasts")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_for", nowIso);

  if (error) throw new Error(`Scheduled scan failed: ${error.message}`);

  // Recover any 'sending' broadcasts that were never finalized.
  const { data: stuck } = await supabase
    .from("notification_broadcasts")
    .select("id")
    .eq("status", "sending");

  const ids = [
    ...(due ?? []).map((r) => r.id),
    ...(stuck ?? []).map((r) => r.id),
  ];

  let dispatched = 0;
  let failed = 0;
  const results: {
    id: string;
    recipientCount: number;
    error: string | null;
  }[] = [];

  for (const id of ids) {
    const res = await dispatchBroadcast(id);
    results.push({
      id,
      recipientCount: res.recipientCount,
      error: res.error,
    });
    if (res.success) dispatched++;
    else failed++;
  }

  return { dispatched, failed, results };
}
