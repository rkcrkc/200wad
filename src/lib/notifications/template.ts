/**
 * Template-driven notification helper.
 *
 * Code paths that fire a notification (e.g. Stripe webhook on payment
 * failure, achievement unlock, lesson reminder) call `insertFromTemplate`
 * with a stable `key`. The template's title/message/channels/default_data
 * are pulled from the DB so admins can edit content via the CMS without a
 * deploy.
 *
 * Gates applied (in order):
 *   1. Type must be enabled (notification_types.enabled = true)
 *   2. Template must exist
 *   3. Template must be enabled (notification_templates.enabled = true)
 *   4. Per-user opt-out (handled by `sendBroadcastEmails`)
 *
 * If any gate fails, the call returns `{ success: true, skipped: true }` —
 * the caller does NOT need to handle this as an error. Disabling is normal
 * operating state, not failure.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { insertNotification } from "@/lib/notifications/insert";
import { getTemplateByKey, isTypeEnabled } from "@/lib/queries/notification-config";
import type { Json, NotificationTemplate } from "@/types/database";

type Channel = "in_app" | "email";

export interface InsertFromTemplateInput {
  userId: string;
  /**
   * Optional shallow merge into the template's default_data. Use for
   * variable substitution (e.g. an order ID, a target href). The result
   * is stored in notifications.data.
   */
  dataOverrides?: Record<string, unknown>;
  /** Override the template's channels for this single send. */
  channelsOverride?: Channel[];
  /** Override expiry for this single send. */
  expiresAt?: string | null;
}

export interface InsertFromTemplateResult {
  success: boolean;
  skipped: boolean;
  reason?:
    | "type_disabled"
    | "template_missing"
    | "template_disabled"
    | "insert_failed";
  error?: string | null;
  notificationIds?: string[];
}

function mergeData(
  base: Json | null,
  overrides: Record<string, unknown> | undefined,
  templateKey: string
): Json | null {
  // We always stamp the template_key into the row so downstream idempotency
  // checks (achievement triggers, milestone gates) can identify "this user
  // already received template X" without parsing title/message strings.
  const stamped = { template_key: templateKey, ...(overrides ?? {}) };
  if (!base) return stamped as Json;
  if (typeof base !== "object" || Array.isArray(base)) {
    return stamped as Json;
  }
  return {
    ...(base as Record<string, Json>),
    ...(stamped as Record<string, Json>),
  } as Json;
}

function pickChannels(
  template: NotificationTemplate,
  override: Channel[] | undefined
): Channel[] {
  if (override && override.length > 0) return override;
  // Defensively narrow to known channel literals.
  const known = template.channels.filter(
    (c): c is Channel => c === "in_app" || c === "email"
  );
  return known.length > 0 ? known : ["in_app"];
}

/**
 * Replace `{varName}` placeholders in title/message with values from
 * dataOverrides. Unknown placeholders are left intact (so a missing var
 * shows as `{var}` instead of "undefined" — easier to spot in QA).
 *
 * Only top-level keys with primitive values are substituted; nested
 * objects are skipped.
 */
function substitute(
  text: string,
  overrides: Record<string, unknown> | undefined
): string {
  if (!overrides) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    const v = overrides[key];
    if (v === undefined || v === null) return match;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      return String(v);
    }
    return match;
  });
}

export async function insertFromTemplate(
  key: string,
  input: InsertFromTemplateInput
): Promise<InsertFromTemplateResult> {
  const template = await getTemplateByKey(key);
  if (!template) {
    console.warn(`insertFromTemplate('${key}'): template not found`);
    return { success: true, skipped: true, reason: "template_missing" };
  }

  if (!template.enabled) {
    return { success: true, skipped: true, reason: "template_disabled" };
  }

  const typeOk = await isTypeEnabled(template.type);
  if (!typeOk) {
    return { success: true, skipped: true, reason: "type_disabled" };
  }

  const supabase = createAdminClient();
  const channels = pickChannels(template, input.channelsOverride);
  const data = mergeData(template.default_data, input.dataOverrides, key);

  const result = await insertNotification(supabase, {
    userId: input.userId,
    type: template.type,
    title: substitute(template.title, input.dataOverrides),
    message: substitute(template.message, input.dataOverrides),
    data,
    channels,
    expiresAt: input.expiresAt ?? null,
  });

  if (!result.success) {
    return {
      success: false,
      skipped: false,
      reason: "insert_failed",
      error: result.error,
    };
  }

  return {
    success: true,
    skipped: false,
    notificationIds: result.notificationIds,
  };
}
