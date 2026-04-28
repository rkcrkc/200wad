"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  isCritical: boolean;
}

// Stored under data.severity in the DB as the literal string "critical" when
// flagged. Anything else (including legacy "info" / "warning" from earlier
// templates) renders as a normal notification — the picker is now binary so
// admins don't have to agonise over levels that have no visible difference.

type FormTab = "details" | "trigger";

const FORM_TABS: { key: FormTab; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "trigger", label: "Trigger" },
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
    isCritical: false,
  };
}

interface NormalizedData {
  ctaLabel: string;
  ctaHref: string;
  isCritical: boolean;
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
  // Only the literal "critical" trips the toggle. Legacy "info" / "warning"
  // values normalise to false here — saving will then drop them from the DB.
  return {
    ctaLabel: cta && typeof cta.label === "string" ? cta.label : "",
    ctaHref: cta && typeof cta.href === "string" ? cta.href : "",
    isCritical: d.severity === "critical",
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
  const [activeTab, setActiveTab] = useState<FormTab>("details");
  // Description is locked-by-default to keep the form quiet (it's just an
  // internal admin note). Click the pencil to expand into an editable
  // textarea. Reset on every open so we never land in edit mode by accident.
  const [editingDescription, setEditingDescription] = useState(false);

  // Hydrate when opened.
  useEffect(() => {
    if (!isOpen) return;
    // Always start on Details when (re)opening so users see the headline
    // metadata first, regardless of which tab the previous edit ended on.
    setActiveTab("details");
    setEditingDescription(false);
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
      isCritical: d.isCritical,
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

  // Per-tab "has unmet required fields" flags. Used to render a small dot
  // indicator on tabs that still need attention so admins know where to look
  // when the global Save button is disabled. All required gates (key, name,
  // title, message, at-least-one-channel) live in Details, so any unmet
  // requirement surfaces a dot there.
  const tabIssues = useMemo<Record<FormTab, boolean>>(() => {
    const detailsBad =
      (!editing && !form.key.trim()) ||
      !form.label.trim() ||
      !form.title.trim() ||
      !form.message.trim() ||
      (!form.channelInApp && !form.channelEmail);
    return {
      details: detailsBad,
      trigger: false,
    };
  }, [form, editing]);

  const handleSave = async () => {
    setError(null);

    const channels: ("in_app" | "email")[] = [];
    if (form.channelInApp) channels.push("in_app");
    if (form.channelEmail) channels.push("email");

    const default_data: Record<string, unknown> = {};
    if (form.isCritical) default_data.severity = "critical";
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

        {/* Tab nav. A small amber dot on a tab signals that tab still has
            unmet required fields, so admins know where to go when the global
            Save button is disabled. */}
        <div className="flex gap-1 border-b border-gray-200">
          {FORM_TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            const hasIssue = tabIssues[tab.key];
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative -mb-px inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-b-2 border-primary text-primary"
                    : "border-b-2 border-transparent text-gray-500 hover:text-gray-900"
                )}
              >
                <span>{tab.label}</span>
                {hasIssue && (
                  <span
                    title="This tab has required fields that need attention"
                    className="inline-block h-1.5 w-1.5 rounded-full bg-warning"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content. min-h prevents the modal from resizing as the user
            switches tabs — Details has the most fields, so we lock the panel
            to that height and let Trigger render its placeholder card inside. */}
        <div className="min-h-[560px]">

        {/* ---------------- Details tab ---------------- */}
        {activeTab === "details" && (
          <div className="space-y-5">
            {/* Name + Type row. On edit the immutable key lives in the
                metadata sub-section below, not under Name, so the input row
                is purely editable fields. On create the key sits next to
                Name as its own input. */}
            <div className="grid grid-cols-2 items-start gap-3">
              <AdminFormField label="Name" name="label" required>
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

              {!editing ? (
                <AdminFormField
                  label="Key"
                  name="key"
                  required
                  hint="<type>.<event>. Lowercase, dots/hyphens/underscores only."
                >
                  <AdminInput
                    id="key"
                    value={form.key}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, key: e.target.value }))
                    }
                    placeholder="billing.payment_failed"
                    maxLength={120}
                  />
                </AdminFormField>
              ) : (
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
              )}
            </div>

            {/* On create the Type select gets a row of its own since the
                first row holds Name + Key. */}
            {!editing && (
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
            )}

            {/* Metadata sub-section — quiet recessed lines that document the
                template without being editable. On edit: the immutable key
                sits as line 1, locked description as line 2. On create:
                only the description appears (the key is being entered above)
                and gets the collapsed-by-default pencil editor.
                Negative top-margin overrides the parent space-y-5 so the
                metadata reads as a tight extension of the Name+Type row. */}
            <div className="-mt-3">
            {!editing ? (
              editingDescription ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="description"
                      className="text-xs-medium text-muted-foreground"
                    >
                      Description
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditingDescription(false)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Done
                    </button>
                  </div>
                  <AdminTextarea
                    id="description"
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    maxLength={500}
                    rows={2}
                    placeholder="Internal note shown to admins only."
                  />
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p
                    className={cn(
                      "flex-1 text-xs",
                      form.description.trim()
                        ? "text-muted-foreground"
                        : "italic text-muted-foreground/70"
                    )}
                  >
                    {form.description.trim() || "No description"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditingDescription(true)}
                    title={
                      form.description.trim()
                        ? "Edit description"
                        : "Add description"
                    }
                    className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-bone hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-0.5">
                <p
                  className={cn(
                    "text-xs",
                    form.description.trim()
                      ? "text-muted-foreground"
                      : "italic text-muted-foreground/70"
                  )}
                >
                  {form.description.trim() || "No description"}
                </p>
                <p className="text-xs text-muted-foreground">
                  key:&nbsp;{form.key}
                </p>
              </div>
            )}
            </div>

            {/* Controls row — Enabled / channels / critical. Sits beneath
                the metadata sub-section so the form reads top-to-bottom as
                identity → behaviour → content. */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-gray-200 px-4 py-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, enabled: e.target.checked }))
                  }
                />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.channelInApp}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      channelInApp: e.target.checked,
                    }))
                  }
                />
                In-app
              </label>
              {/* Email channel is scaffolded server-side but not yet wired to a
                  provider — disable the toggle so admins can't opt templates
                  into a no-op delivery channel. */}
              <label className="flex cursor-not-allowed items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={form.channelEmail}
                  disabled
                  readOnly
                />
                Email
              </label>
              <label
                className="ml-auto flex items-center gap-2 text-sm text-gray-700"
                title="Shows a red dot (instead of blue) in the bell dropdown while unread. Reserve for genuinely urgent items: payment failures, security alerts, account-impacting events."
              >
                <input
                  type="checkbox"
                  checked={form.isCritical}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isCritical: e.target.checked }))
                  }
                />
                Mark as critical
              </label>
            </div>

            {/* Live preview — mirrors how this notification will render in the
                bell dropdown (NotificationRow). Updates as the admin edits
                title/message/cta/importance. {var} placeholders are left
                intact (matching real behaviour) so admins can spot missing
                substitutions in QA. */}
            <NotificationPreview form={form} />

            {/* Title + Message live here in Details (not a separate Content
                tab) so the headline metadata and the rendered copy are next
                to each other — they're what admins edit most often. */}
            <AdminFormField
              label="Title"
              name="title"
              required
              hint="Shown as the bold headline. Plain text only. Supports {var} placeholders."
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
              hint="Body copy. Up to 2000 characters. Supports {var} placeholders."
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

            {/* Optional CTA — both fields must be set for the button to render
                in the bell dropdown. Sits directly under Message since it's
                tied to the rendered notification copy. */}
            <div className="grid grid-cols-2 gap-3">
              <AdminFormField
                label="CTA label"
                name="cta_label"
                hint="Button text shown after the message."
              >
                <AdminInput
                  id="cta_label"
                  value={form.ctaLabel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ctaLabel: e.target.value }))
                  }
                  placeholder="Update payment"
                />
              </AdminFormField>
              <AdminFormField
                label="CTA link"
                name="cta_href"
                hint="Any in-app path: /account/billing, /lesson/<id>, /dictionary/<wordId>. For per-instance dynamic ids, the trigger code overrides this at fire time."
              >
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
        )}

        {/* ---------------- Trigger tab (placeholder) ---------------- */}
        {/* Today, the "when" of every notification is hardcoded at the call
            site (Stripe webhook, test completion, auth callback, etc.). This
            stub stays as a reminder to build out a real rules engine later
            (cron schedules, inactivity windows, threshold triggers).
            Controls are disabled to make it obvious it's not wired. */}
        {activeTab === "trigger" && (
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
                  {
                    value: "condition",
                    label: "When a condition is met (planned)",
                  },
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
              <AdminFormField
                label="Condition expression"
                name="trigger_condition"
              >
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
        )}
        </div>
      </div>
    </AdminModal>
  );
}

// ---------------------------------------------------------------------------
// NotificationPreview — faithful render of how this template will look in
// the bell dropdown (mirrors NotificationRow). Updates live as the admin
// edits Title, Message, CTA, and the Mark-as-critical toggle.
// ---------------------------------------------------------------------------

function NotificationPreview({ form }: { form: FormState }) {
  const hasCta = form.ctaLabel.trim() !== "" && form.ctaHref.trim() !== "";
  // Default to unread so admins see the at-arrival look first; flip to
  // preview the post-click state (greyed dot, no tint).
  const [isRead, setIsRead] = useState(false);

  const dotClass = isRead
    ? "bg-gray-300"
    : form.isCritical
      ? "bg-destructive"
      : "bg-primary";

  return (
    <div className="rounded-xl border border-dashed border-primary/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs-medium text-muted-foreground">Preview</span>
        {/* Segmented toggle between unread/read so admins can see how the
            same notification looks in both states without leaving the modal. */}
        <div className="inline-flex rounded-full bg-white p-0.5 ring-1 ring-gray-200">
          {(
            [
              { key: false, label: "Unread" },
              { key: true, label: "Read" },
            ] as const
          ).map((opt) => {
            const active = isRead === opt.key;
            return (
              <button
                key={String(opt.key)}
                type="button"
                onClick={() => setIsRead(opt.key)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                  active
                    ? "bg-foreground text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-gray-200 shadow-sm",
          isRead ? "bg-white" : "bg-bone"
        )}
      >
        {/* Mirrors NotificationRow exactly: red dot when critical+unread,
            blue when normal+unread, grey when read. */}
        <div className="flex gap-3 px-4 py-3">
          <div className="mt-1.5 w-2 shrink-0">
            <div
              className={cn("h-2 w-2 rounded-full", dotClass)}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <span className="text-small-semibold line-clamp-2 text-foreground">
                {form.title.trim() || (
                  <span className="text-muted-foreground italic">
                    Title preview…
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                now
              </span>
            </div>
            <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">
              {form.message.trim() || (
                <span className="italic">Message preview…</span>
              )}
            </p>
            {hasCta && (
              <span className="mt-1 inline-block text-xs font-medium text-primary">
                {form.ctaLabel} →
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
