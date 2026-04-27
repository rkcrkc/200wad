import { z } from "zod";

/**
 * Allowed notification types. Mirrors the DB CHECK constraint on
 * notifications.type and notification_broadcasts.type.
 */
export const NOTIFICATION_TYPES = [
  "system",
  "billing",
  "learning",
  "reminder",
  "achievement",
  "content",
  "admin",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Audience cohort selector. Resolved at dispatch time.
 *
 * Examples:
 *   { all: true }
 *   { plan: ["paid"] }
 *   { language: ["it", "es"], active_within_days: 14 }
 *   { inactive_for_days: 30 }
 *
 * Filters compose with AND. `all: true` overrides the others.
 */
export const audienceSchema = z
  .object({
    all: z.boolean().optional(),
    plan: z.array(z.enum(["free", "paid"])).optional(),
    language: z.array(z.string().min(2).max(10)).optional(),
    active_within_days: z.number().int().min(1).max(365).optional(),
    inactive_for_days: z.number().int().min(1).max(365).optional(),
    user_ids: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (a) =>
      a.all === true ||
      (a.plan && a.plan.length > 0) ||
      (a.language && a.language.length > 0) ||
      a.active_within_days !== undefined ||
      a.inactive_for_days !== undefined ||
      (a.user_ids && a.user_ids.length > 0),
    { message: "Audience must include at least one filter" }
  );

export type Audience = z.infer<typeof audienceSchema>;

/**
 * Optional payload attached to a notification or broadcast.
 *
 * Shape is intentionally loose so future fields can be added without
 * a migration. Known keys today:
 *   subtype  — e.g. "payment_failed"
 *   severity — "info" | "warning" | "critical"
 *   cta      — { label, href }
 */
export const notificationDataSchema = z
  .object({
    subtype: z.string().optional(),
    severity: z.enum(["info", "warning", "critical"]).optional(),
    cta: z
      .object({
        label: z.string().min(1).max(80),
        href: z.string().min(1).max(500),
      })
      .optional(),
  })
  .passthrough();

export type NotificationData = z.infer<typeof notificationDataSchema>;

/** Channels supported by the dispatcher. Email is scaffolded but not wired. */
export const channelSchema = z.enum(["in_app", "email"]);
export type NotificationChannel = z.infer<typeof channelSchema>;

// ============================================================================
// Admin: create / update broadcast
// ============================================================================

export const createBroadcastSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(2000),
  type: z.enum(NOTIFICATION_TYPES),
  data: notificationDataSchema.optional().nullable(),
  audience: audienceSchema,
  channels: z.array(channelSchema).min(1, "Pick at least one channel"),
  scheduled_for: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable(),
});

export type CreateBroadcastInput = z.input<typeof createBroadcastSchema>;

export const updateBroadcastSchema = createBroadcastSchema.partial();
export type UpdateBroadcastInput = z.input<typeof updateBroadcastSchema>;

// ============================================================================
// Admin: notification types (master enable/disable per type)
// ============================================================================

export const updateNotificationTypeSchema = z.object({
  label: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
  enabled: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});
export type UpdateNotificationTypeInput = z.input<
  typeof updateNotificationTypeSchema
>;

// ============================================================================
// Admin: notification templates (system-generated content definitions)
// ============================================================================

/**
 * Template `key` is the stable identifier code paths use to look up content.
 * Use dot-namespacing: "<type>.<event>" — e.g. "billing.payment_failed".
 */
const templateKeyRegex = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

export const createTemplateSchema = z.object({
  key: z
    .string()
    .min(3)
    .max(120)
    .regex(
      templateKeyRegex,
      "Key must be lowercase, dot/underscore/hyphen separated"
    ),
  label: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  type: z.enum(NOTIFICATION_TYPES),
  enabled: z.boolean().default(true),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  channels: z.array(channelSchema).min(1),
  default_data: notificationDataSchema.optional().nullable(),
});
export type CreateTemplateInput = z.input<typeof createTemplateSchema>;

export const updateTemplateSchema = createTemplateSchema
  .omit({ key: true }) // key is immutable once created
  .partial();
export type UpdateTemplateInput = z.input<typeof updateTemplateSchema>;
