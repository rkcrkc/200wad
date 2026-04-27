"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminModal } from "@/components/admin/AdminModal";
import {
  AdminFormField,
  AdminInput,
  AdminTextarea,
  AdminSelect,
} from "@/components/admin/AdminFormField";
import {
  createNotificationTemplate,
  updateNotificationTemplate,
} from "@/lib/mutations/admin/notification-config";
import {
  NOTIFICATION_TYPES,
  type NotificationType,
} from "@/lib/validations/notifications";
import type {
  NotificationTemplate,
  NotificationTypeConfig,
} from "@/types/database";

type EditingTemplate = NotificationTemplate & {
  type_enabled?: boolean;
  type_label?: string;
};

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: EditingTemplate | null;
  types: NotificationTypeConfig[];
  onSuccess: () => void;
}

interface FormState {
  key: string;
  label: string;
  description: string;
  type: NotificationType;
  enabled: boolean;
  title: string;
  message: string;
  channelInApp: boolean;
  channelEmail: boolean;
  ctaLabel: string;
  ctaHref: string;
  severity: "" | "info" | "warning" | "critical";
}

const SEVERITY_OPTIONS = [
  { value: "", label: "Default" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
];

function emptyForm(defaultType: NotificationType = "system"): FormState {
  return {
    key: "",
    label: "",
    description: "",
    type: defaultType,
    enabled: true,
    title: "",
    message: "",
    channelInApp: true,
    channelEmail: false,
    ctaLabel: "",
    ctaHref: "",
    severity: "",
  };
}

interface NormalizedData {
  ctaLabel: string;
  ctaHref: string;
  severity: "" | "info" | "warning" | "critical";
}

function dataFromJson(raw: unknown): NormalizedData {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const cta =
    d.cta && typeof d.cta === "object"
      ? (d.cta as Record<string, unknown>)
      : null;
  const severity = d.severity;
  return {
    ctaLabel: cta && typeof cta.label === "string" ? cta.label : "",
    ctaHref: cta && typeof cta.href === "string" ? cta.href : "",
    severity:
      severity === "info" || severity === "warning" || severity === "critical"
        ? severity
        : "",
  };
}

export function TemplateFormModal({
  isOpen,
  onClose,
  editing,
  types,
  onSuccess,
}: TemplateFormModalProps) {
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate when opened.
  useEffect(() => {
    if (!isOpen) return;
    if (!editing) {
      setForm(emptyForm());
      setError(null);
      return;
    }
    const d = dataFromJson(editing.default_data);
    setForm({
      key: editing.key,
      label: editing.label,
      description: editing.description ?? "",
      type: editing.type as NotificationType,
      enabled: editing.enabled,
      title: editing.title,
      message: editing.message,
      channelInApp: editing.channels.includes("in_app"),
      channelEmail: editing.channels.includes("email"),
      ctaLabel: d.ctaLabel,
      ctaHref: d.ctaHref,
      severity: d.severity,
    });
    setError(null);
  }, [isOpen, editing]);

  // Type options come from configured types so admins can't pick a type that
  // doesn't exist server-side. Fall back to the validation enum if list is empty.
  const typeOptions = useMemo(() => {
    const fromDb = types.map((t) => ({
      value: t.type,
      label: t.enabled ? t.label : `${t.label} (disabled)`,
    }));
    if (fromDb.length > 0) return fromDb;
    return NOTIFICATION_TYPES.map((t) => ({
      value: t,
      label: t.charAt(0).toUpperCase() + t.slice(1),
    }));
  }, [types]);

  const isValid = useMemo(() => {
    if (!editing && !form.key.trim()) return false;
    if (!form.label.trim()) return false;
    if (!form.title.trim() || !form.message.trim()) return false;
    if (!form.channelInApp && !form.channelEmail) return false;
    return true;
  }, [form, editing]);

  const handleSave = async () => {
    setError(null);

    const channels: ("in_app" | "email")[] = [];
    if (form.channelInApp) channels.push("in_app");
    if (form.channelEmail) channels.push("email");

    const default_data: Record<string, unknown> = {};
    if (form.severity) default_data.severity = form.severity;
    if (form.ctaLabel.trim() && form.ctaHref.trim()) {
      default_data.cta = {
        label: form.ctaLabel.trim(),
        href: form.ctaHref.trim(),
      };
    }
    const data = Object.keys(default_data).length > 0 ? default_data : null;

    setIsSaving(true);
    try {
      if (editing) {
        const res = await updateNotificationTemplate(editing.id, {
          label: form.label.trim(),
          description: form.description.trim() ? form.description.trim() : null,
          type: form.type,
          enabled: form.enabled,
          title: form.title.trim(),
          message: form.message.trim(),
          channels,
          default_data: data,
        });
        if (!res.success) {
          setError(res.error ?? "Failed to save template");
          return;
        }
      } else {
        const res = await createNotificationTemplate({
          key: form.key.trim(),
          label: form.label.trim(),
          description: form.description.trim() ? form.description.trim() : null,
          type: form.type,
          enabled: form.enabled,
          title: form.title.trim(),
          message: form.message.trim(),
          channels,
          default_data: data,
        });
        if (!res.success) {
          setError(res.error ?? "Failed to create template");
          return;
        }
      }
      onSuccess();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Edit template" : "Create template"}
      description={
        editing
          ? "Edit content and channels for this system template. The key is immutable."
          : "Define a reusable notification template that code paths look up by key (e.g. billing.payment_failed)."
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? "Saving…" : editing ? "Save changes" : "Create"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Key (immutable on edit) */}
        <AdminFormField
          label="Key"
          name="key"
          required={!editing}
          hint={
            editing
              ? "Immutable. Code paths look up this template by key."
              : "Stable identifier. Use dot-namespacing: <type>.<event>. Lowercase, with dots/hyphens/underscores only."
          }
        >
          <AdminInput
            id="key"
            value={form.key}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            disabled={!!editing}
            placeholder="billing.payment_failed"
            maxLength={120}
          />
        </AdminFormField>

        <div className="grid grid-cols-2 gap-3">
          <AdminFormField label="Label" name="label" required>
            <AdminInput
              id="label"
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
              maxLength={120}
              placeholder="Payment failed"
            />
          </AdminFormField>

          <AdminFormField label="Type" name="type" required>
            <AdminSelect
              id="type"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as NotificationType,
                }))
              }
              options={typeOptions}
            />
          </AdminFormField>
        </div>

        <AdminFormField
          label="Description"
          name="description"
          hint="Internal note shown to admins only."
        >
          <AdminTextarea
            id="description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            maxLength={500}
            rows={2}
          />
        </AdminFormField>

        {/* Content */}
        <div className="space-y-3 rounded-lg border border-gray-200 p-3">
          <span className="block text-sm font-medium text-gray-700">
            Default content
          </span>

          <AdminFormField
            label="Title"
            name="title"
            required
            hint="Shown as the bold headline. Plain text only."
          >
            <AdminInput
              id="title"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              maxLength={200}
              placeholder="Payment failed"
            />
          </AdminFormField>

          <AdminFormField
            label="Message"
            name="message"
            required
            hint="Body copy. Up to 2000 characters."
          >
            <AdminTextarea
              id="message"
              value={form.message}
              onChange={(e) =>
                setForm((f) => ({ ...f, message: e.target.value }))
              }
              maxLength={2000}
              rows={4}
              placeholder="We couldn't process your payment. Please update your payment method to keep your subscription active."
            />
          </AdminFormField>
        </div>

        {/* Channels */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Channels
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.channelInApp}
                onChange={(e) =>
                  setForm((f) => ({ ...f, channelInApp: e.target.checked }))
                }
              />
              In-app (bell dropdown)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-500">
              <input
                type="checkbox"
                checked={form.channelEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, channelEmail: e.target.checked }))
                }
              />
              Email
              <span className="rounded-full bg-bone px-2 py-0.5 text-xs text-muted-foreground">
                scaffolded — not yet delivered
              </span>
            </label>
          </div>
        </div>

        {/* Optional default data */}
        <div className="space-y-3 rounded-lg border border-gray-200 p-3">
          <span className="block text-sm font-medium text-gray-700">
            Default data (optional)
          </span>
          <p className="text-xs text-muted-foreground">
            Merged into each generated notification&apos;s data payload. Code
            paths can override these per-call.
          </p>

          <AdminFormField label="Severity" name="severity">
            <AdminSelect
              id="severity"
              value={form.severity}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  severity: e.target.value as FormState["severity"],
                }))
              }
              options={SEVERITY_OPTIONS}
            />
          </AdminFormField>

          <div className="grid grid-cols-2 gap-3">
            <AdminFormField label="CTA label" name="cta_label">
              <AdminInput
                id="cta_label"
                value={form.ctaLabel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ctaLabel: e.target.value }))
                }
                placeholder="Update payment"
              />
            </AdminFormField>
            <AdminFormField label="CTA link" name="cta_href">
              <AdminInput
                id="cta_href"
                value={form.ctaHref}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ctaHref: e.target.value }))
                }
                placeholder="/account/billing"
              />
            </AdminFormField>
          </div>
        </div>

        {/* Trigger — placeholder for future admin-configurable scheduling.
            Today, the "when" of every notification is hardcoded at the call
            site (Stripe webhook, test completion, auth callback, etc.). This
            stub stays in the modal as a reminder to build out a real rules
            engine later (cron schedules, inactivity windows, threshold
            triggers). Controls are disabled to make it obvious it's not
            wired. */}
        <div className="space-y-3 rounded-lg border border-dashed border-gray-300 bg-bone/40 p-3">
          <div className="flex items-center justify-between">
            <span className="block text-sm font-medium text-gray-700">
              Trigger
            </span>
            <span className="rounded-full bg-bone px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              coming soon — currently hardcoded
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            When this notification fires is set in code today (e.g. Stripe
            webhooks, test completion, signup). A future admin-configurable
            trigger system will live here — e.g. cron schedules, inactivity
            windows, threshold conditions.
          </p>

          <AdminFormField label="Trigger mode" name="trigger_mode">
            <AdminSelect
              id="trigger_mode"
              value="code"
              onChange={() => {
                /* placeholder */
              }}
              disabled
              options={[
                { value: "code", label: "Hardcoded in code (current)" },
                { value: "schedule", label: "On a schedule (planned)" },
                { value: "event", label: "On a user event (planned)" },
                { value: "condition", label: "When a condition is met (planned)" },
              ]}
            />
          </AdminFormField>

          <div className="grid grid-cols-2 gap-3">
            <AdminFormField label="Schedule (cron)" name="trigger_cron">
              <AdminInput
                id="trigger_cron"
                value=""
                onChange={() => {
                  /* placeholder */
                }}
                disabled
                placeholder="0 9 * * *  (daily at 9am)"
              />
            </AdminFormField>
            <AdminFormField label="Condition expression" name="trigger_condition">
              <AdminInput
                id="trigger_condition"
                value=""
                onChange={() => {
                  /* placeholder */
                }}
                disabled
                placeholder="streak_days >= 3 AND last_active < now() - 24h"
              />
            </AdminFormField>
          </div>
        </div>

        {/* Enabled */}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, enabled: e.target.checked }))
            }
          />
          Enabled — code paths that look up this key will write notifications.
        </label>
      </div>
    </AdminModal>
  );
}
