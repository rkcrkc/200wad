/**
 * Notification email sender (Phase 6 scaffolding).
 *
 * The dispatcher inserts a `notifications` row for every (user × channel)
 * pair, including channel='email'. This module is responsible for the
 * actual email transport. Today the only built-in driver is `noop`, which
 * logs and returns success — keeping the inbox-row pipeline live while we
 * defer real email delivery.
 *
 * To enable a real provider:
 *   1. Add a case to `dispatchEmail()` (e.g. "resend", "sendgrid").
 *   2. Set EMAIL_PROVIDER=<name> and any provider env vars.
 *   3. The dispatcher will pick it up automatically.
 *
 * Opt-out is honoured via `user_notification_preferences.email`. A row with
 * email=false for a given (user, type) suppresses the send. Missing rows
 * default to opted-in.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

interface BroadcastEmailPayload {
  broadcastId: string;
  type: string;
  title: string;
  message: string;
  data: Json | null;
}

interface EmailRecipient {
  userId: string;
  email: string;
  name: string | null;
}

interface SendOneResult {
  success: boolean;
  error: string | null;
}

export interface BatchEmailResult {
  provider: string;
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: { userId: string; error: string }[];
}

const RECIPIENT_PAGE_SIZE = 1000;

/** Returns the active email provider name from env, defaulting to "noop". */
export function getEmailProvider(): string {
  return (process.env.EMAIL_PROVIDER ?? "noop").trim().toLowerCase();
}

/**
 * Look up email + display name for a list of user IDs, filtering out anyone
 * who has opted out of email for this notification type.
 */
async function loadEmailRecipients(
  supabase: AdminClient,
  userIds: string[],
  type: string
): Promise<{ recipients: EmailRecipient[]; skipped: number }> {
  if (userIds.length === 0) return { recipients: [], skipped: 0 };

  // Fetch opt-out rows in a single query (rows where email=false for this type).
  const { data: optOuts, error: prefErr } = await supabase
    .from("user_notification_preferences")
    .select("user_id")
    .eq("type", type)
    .eq("email", false)
    .in("user_id", userIds);
  if (prefErr) {
    throw new Error(`Email pref lookup failed: ${prefErr.message}`);
  }
  const optedOut = new Set((optOuts ?? []).map((r) => r.user_id));

  // Page through users to avoid huge IN-lists.
  const recipients: EmailRecipient[] = [];
  for (let i = 0; i < userIds.length; i += RECIPIENT_PAGE_SIZE) {
    const slice = userIds.slice(i, i + RECIPIENT_PAGE_SIZE);
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name")
      .in("id", slice);
    if (error) throw new Error(`User email lookup failed: ${error.message}`);
    for (const row of data ?? []) {
      if (!row.email) continue;
      if (optedOut.has(row.id)) continue;
      recipients.push({ userId: row.id, email: row.email, name: row.name });
    }
  }

  const skipped = userIds.length - recipients.length;
  return { recipients, skipped };
}

/**
 * Send a single email. Switches on EMAIL_PROVIDER. Today only `noop` is
 * implemented — real providers can be added without touching the dispatcher.
 */
async function dispatchEmail(
  recipient: EmailRecipient,
  payload: BroadcastEmailPayload,
  provider: string
): Promise<SendOneResult> {
  switch (provider) {
    case "noop":
      // Intentionally minimal: emit a structured log line so ops can verify
      // pipeline reachability without sending real mail.
      console.log(
        JSON.stringify({
          event: "email.noop",
          broadcast_id: payload.broadcastId,
          user_id: recipient.userId,
          to: recipient.email,
          type: payload.type,
          subject: payload.title,
        })
      );
      return { success: true, error: null };

    // case "resend": { ... }
    // case "sendgrid": { ... }

    default:
      return {
        success: false,
        error: `EMAIL_PROVIDER='${provider}' is not implemented`,
      };
  }
}

/**
 * Send a broadcast to a batch of users via the configured email driver.
 *
 * Always returns aggregate stats — never throws on individual failures so
 * the dispatcher can still mark the broadcast as 'sent' (inbox rows are the
 * source of truth; email is best-effort).
 */
export async function sendBroadcastEmails(
  supabase: AdminClient,
  userIds: string[],
  payload: BroadcastEmailPayload
): Promise<BatchEmailResult> {
  const provider = getEmailProvider();
  const result: BatchEmailResult = {
    provider,
    attempted: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  if (userIds.length === 0) return result;

  let recipients: EmailRecipient[] = [];
  try {
    const loaded = await loadEmailRecipients(supabase, userIds, payload.type);
    recipients = loaded.recipients;
    result.skipped = loaded.skipped;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `sendBroadcastEmails(${payload.broadcastId}) recipient load failed:`,
      message
    );
    result.failed = userIds.length;
    result.errors.push({ userId: "*", error: `Recipient load: ${message}` });
    return result;
  }

  for (const recipient of recipients) {
    result.attempted++;
    try {
      const r = await dispatchEmail(recipient, payload, provider);
      if (r.success) result.succeeded++;
      else {
        result.failed++;
        result.errors.push({
          userId: recipient.userId,
          error: r.error ?? "Unknown driver error",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      result.failed++;
      result.errors.push({ userId: recipient.userId, error: message });
    }
  }

  return result;
}
