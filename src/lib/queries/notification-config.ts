/**
 * Queries for notification configuration:
 *   - notification_types     (master enable/disable per type)
 *   - notification_templates (system-generated notification definitions)
 *
 * All queries use the admin client because both tables are RLS-locked
 * (no policies = service-role-only access). The admin UI calls these
 * after `requireAdmin()`. Server-side gates (dispatcher, insertFromTemplate)
 * also use them.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  NotificationTypeConfig,
  NotificationTemplate,
} from "@/types/database";

/** All notification types, ordered by sort_order then label. Admin-only. */
export async function listNotificationTypes(): Promise<NotificationTypeConfig[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notification_types")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  if (error) {
    console.error("listNotificationTypes failed:", error.message);
    return [];
  }
  return data ?? [];
}

/** All templates with their type config joined for convenience. Admin-only. */
export async function listNotificationTemplates(): Promise<
  (NotificationTemplate & { type_enabled: boolean; type_label: string })[]
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notification_templates")
    .select("*, notification_types(enabled, label)")
    .order("type", { ascending: true })
    .order("label", { ascending: true });
  if (error) {
    console.error("listNotificationTemplates failed:", error.message);
    return [];
  }
  return (data ?? []).map((t) => {
    const typeRow = t.notification_types as
      | { enabled: boolean; label: string }
      | null;
    return {
      ...t,
      type_enabled: typeRow?.enabled ?? true,
      type_label: typeRow?.label ?? t.type,
    };
  });
}

/** Single template by key. Used by `insertFromTemplate`. */
export async function getTemplateByKey(
  key: string
): Promise<NotificationTemplate | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notification_templates")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error(`getTemplateByKey(${key}) failed:`, error.message);
    return null;
  }
  return data;
}

/**
 * Returns true when the given type is enabled at the master level.
 * Missing rows default to enabled (forward-compat for newly-introduced types).
 */
export async function isTypeEnabled(type: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notification_types")
    .select("enabled")
    .eq("type", type)
    .maybeSingle();
  if (error) {
    console.error(`isTypeEnabled(${type}) failed:`, error.message);
    return true; // fail open — better to send than to silently drop
  }
  return data?.enabled ?? true;
}
