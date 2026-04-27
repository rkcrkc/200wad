"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AdminModal } from "@/components/admin/AdminModal";
import {
  AdminFormField,
  AdminInput,
  AdminTextarea,
  AdminSelect,
} from "@/components/admin/AdminFormField";
import {
  createBroadcast,
  updateBroadcast,
} from "@/lib/mutations/admin/notifications";
import {
  NOTIFICATION_TYPES,
  type Audience,
  type NotificationType,
} from "@/lib/validations/notifications";
import type { NotificationBroadcast } from "@/types/database";

interface BroadcastFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: NotificationBroadcast | null;
  onSuccess: () => void;
}

type AudienceMode = "all" | "cohort";
type ScheduleMode = "draft" | "now" | "later";

interface FormState {
  title: string;
  message: string;
  type: NotificationType;
  audienceMode: AudienceMode;
  cohortPlanFree: boolean;
  cohortPlanPaid: boolean;
  cohortLanguages: string;
  cohortActiveWithinDays: string;
  cohortInactiveForDays: string;
  channelInApp: boolean;
  channelEmail: boolean;
  scheduleMode: ScheduleMode;
  scheduledFor: string;
  ctaLabel: string;
  ctaHref: string;
  severity: "" | "info" | "warning" | "critical";
}

const TYPE_OPTIONS = NOTIFICATION_TYPES.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));

const SEVERITY_OPTIONS = [
  { value: "", label: "Default" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
];

function emptyForm(): FormState {
  return {
    title: "",
    message: "",
    type: "system",
    audienceMode: "all",
    cohortPlanFree: false,
    cohortPlanPaid: false,
    cohortLanguages: "",
    cohortActiveWithinDays: "",
    cohortInactiveForDays: "",
    channelInApp: true,
    channelEmail: false,
    scheduleMode: "draft",
    scheduledFor: "",
    ctaLabel: "",
    ctaHref: "",
    severity: "",
  };
}

/** Convert ISO timestamp to the local "YYYY-MM-DDTHH:mm" string the input expects. */
function isoToInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function inputToIso(input: string): string | null {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

interface NormalizedAudience {
  mode: AudienceMode;
  planFree: boolean;
  planPaid: boolean;
  languages: string;
  activeWithinDays: string;
  inactiveForDays: string;
}

function audienceFromJson(raw: unknown): NormalizedAudience {
  const a = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (a.all === true) {
    return {
      mode: "all",
      planFree: false,
      planPaid: false,
      languages: "",
      activeWithinDays: "",
      inactiveForDays: "",
    };
  }
  const plans = Array.isArray(a.plan) ? (a.plan as string[]) : [];
  const langs = Array.isArray(a.language) ? (a.language as string[]) : [];
  return {
    mode: "cohort",
    planFree: plans.includes("free"),
    planPaid: plans.includes("paid"),
    languages: langs.join(", "),
    activeWithinDays:
      typeof a.active_within_days === "number" ? String(a.active_within_days) : "",
    inactiveForDays:
      typeof a.inactive_for_days === "number" ? String(a.inactive_for_days) : "",
  };
}

interface NormalizedData {
  ctaLabel: string;
  ctaHref: string;
  severity: "" | "info" | "warning" | "critical";
}

function dataFromJson(raw: unknown): NormalizedData {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const cta = d.cta && typeof d.cta === "object" ? (d.cta as Record<string, unknown>) : null;
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

function buildAudience(form: FormState): Audience | null {
  if (form.audienceMode === "all") return { all: true };

  const audience: Audience = {};
  const plans: ("free" | "paid")[] = [];
  if (form.cohortPlanFree) plans.push("free");
  if (form.cohortPlanPaid) plans.push("paid");
  if (plans.length > 0) audience.plan = plans;

  const langs = form.cohortLanguages
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (langs.length > 0) audience.language = langs;

  const activeDays = parseInt(form.cohortActiveWithinDays, 10);
  if (Number.isFinite(activeDays) && activeDays > 0) {
    audience.active_within_days = activeDays;
  }
  const inactiveDays = parseInt(form.cohortInactiveForDays, 10);
  if (Number.isFinite(inactiveDays) && inactiveDays > 0) {
    audience.inactive_for_days = inactiveDays;
  }

  // Must have at least one filter
  if (Object.keys(audience).length === 0) return null;
  return audience;
}

export function BroadcastFormModal({
  isOpen,
  onClose,
  editing,
  onSuccess,
}: BroadcastFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate form when opened in edit mode.
  useEffect(() => {
    if (!isOpen) return;
    if (!editing) {
      setForm(emptyForm());
      setError(null);
      return;
    }

    const a = audienceFromJson(editing.audience);
    const d = dataFromJson(editing.data);
    setForm({
      title: editing.title,
      message: editing.message,
      type: editing.type as NotificationType,
      audienceMode: a.mode,
      cohortPlanFree: a.planFree,
      cohortPlanPaid: a.planPaid,
      cohortLanguages: a.languages,
      cohortActiveWithinDays: a.activeWithinDays,
      cohortInactiveForDays: a.inactiveForDays,
      channelInApp: editing.channels.includes("in_app"),
      channelEmail: editing.channels.includes("email"),
      scheduleMode: editing.scheduled_for ? "later" : "draft",
      scheduledFor: isoToInput(editing.scheduled_for),
      ctaLabel: d.ctaLabel,
      ctaHref: d.ctaHref,
      severity: d.severity,
    });
    setError(null);
  }, [isOpen, editing]);

  const isValid = useMemo(() => {
    if (!form.title.trim() || !form.message.trim()) return false;
    if (!form.channelInApp && !form.channelEmail) return false;
    if (form.scheduleMode === "later" && !form.scheduledFor) return false;
    return true;
  }, [form]);

  const handleSave = async () => {
    setError(null);

    const audience = buildAudience(form);
    if (!audience) {
      setError("Custom cohort needs at least one filter, or pick All users.");
      return;
    }

    const channels: ("in_app" | "email")[] = [];
    if (form.channelInApp) channels.push("in_app");
    if (form.channelEmail) channels.push("email");

    const data: Record<string, unknown> = {};
    if (form.severity) data.severity = form.severity;
    if (form.ctaLabel.trim() && form.ctaHref.trim()) {
      data.cta = { label: form.ctaLabel.trim(), href: form.ctaHref.trim() };
    }

    const scheduled_for =
      form.scheduleMode === "later" ? inputToIso(form.scheduledFor) : null;

    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      type: form.type,
      data: Object.keys(data).length > 0 ? data : null,
      audience,
      channels,
      scheduled_for,
    };

    setIsSaving(true);
    try {
      const res = editing
        ? await updateBroadcast(editing.id, payload)
        : await createBroadcast(payload);
      if (!res.success) {
        setError(res.error ?? "Failed to save broadcast");
        return;
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
      title={editing ? "Edit broadcast" : "Create broadcast"}
      description={
        editing
          ? "Edit broadcast details. Only draft and scheduled broadcasts can be edited."
          : "Author a notification to send now, schedule for later, or save as draft."
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving
              ? "Saving…"
              : editing
                ? "Save changes"
                : form.scheduleMode === "later"
                  ? "Schedule"
                  : "Save draft"}
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

        <AdminFormField
          label="Title"
          name="title"
          required
          hint="Shown as the bold headline in the notification card."
        >
          <AdminInput
            id="title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            maxLength={200}
            placeholder="e.g. New course available"
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
            placeholder="What you want users to know."
          />
        </AdminFormField>

        <AdminFormField label="Type" name="type" required>
          <AdminSelect
            id="type"
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({ ...f, type: e.target.value as NotificationType }))
            }
            options={TYPE_OPTIONS}
          />
        </AdminFormField>

        {/* Audience */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Audience
          </label>
          <div className="flex gap-2 rounded-lg border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, audienceMode: "all" }))}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                form.audienceMode === "all"
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              All users
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, audienceMode: "cohort" }))}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                form.audienceMode === "cohort"
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Custom cohort
            </button>
          </div>

          {form.audienceMode === "cohort" && (
            <div className="space-y-3 rounded-lg border border-gray-200 bg-bone/40 p-3">
              <div>
                <span className="block text-xs font-medium text-gray-700">
                  Plan
                </span>
                <div className="mt-1 flex gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.cohortPlanFree}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          cohortPlanFree: e.target.checked,
                        }))
                      }
                    />
                    Free
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.cohortPlanPaid}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          cohortPlanPaid: e.target.checked,
                        }))
                      }
                    />
                    Paid
                  </label>
                </div>
              </div>

              <AdminFormField
                label="Languages"
                name="cohort_languages"
                hint="Comma-separated language codes (e.g. it, es). Leave empty for any."
              >
                <AdminInput
                  id="cohort_languages"
                  value={form.cohortLanguages}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      cohortLanguages: e.target.value,
                    }))
                  }
                  placeholder="it, es, fr"
                />
              </AdminFormField>

              <div className="grid grid-cols-2 gap-3">
                <AdminFormField
                  label="Active within (days)"
                  name="cohort_active"
                  hint="Studied at least once in the last N days."
                >
                  <AdminInput
                    id="cohort_active"
                    type="number"
                    min="1"
                    max="365"
                    value={form.cohortActiveWithinDays}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        cohortActiveWithinDays: e.target.value,
                      }))
                    }
                    placeholder="14"
                  />
                </AdminFormField>
                <AdminFormField
                  label="Inactive for (days)"
                  name="cohort_inactive"
                  hint="No activity for at least N days."
                >
                  <AdminInput
                    id="cohort_inactive"
                    type="number"
                    min="1"
                    max="365"
                    value={form.cohortInactiveForDays}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        cohortInactiveForDays: e.target.value,
                      }))
                    }
                    placeholder="30"
                  />
                </AdminFormField>
              </div>
            </div>
          )}
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

        {/* Schedule */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Delivery
          </label>
          <div className="flex gap-2 rounded-lg border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, scheduleMode: "draft" }))}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                form.scheduleMode === "draft"
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, scheduleMode: "later" }))}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                form.scheduleMode === "later"
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Schedule
            </button>
          </div>
          {form.scheduleMode === "later" && (
            <AdminFormField
              label="Send at"
              name="scheduled_for"
              hint="Local time. Dispatcher polls minutely."
            >
              <AdminInput
                id="scheduled_for"
                type="datetime-local"
                value={form.scheduledFor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduledFor: e.target.value }))
                }
              />
            </AdminFormField>
          )}
          {form.scheduleMode === "draft" && (
            <p className="text-xs text-muted-foreground">
              Draft can be sent later from the list view via &quot;Send now&quot;.
            </p>
          )}
        </div>

        {/* Optional CTA + severity */}
        <div className="space-y-3 rounded-lg border border-gray-200 p-3">
          <span className="block text-sm font-medium text-gray-700">
            Optional details
          </span>

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
                placeholder="View course"
              />
            </AdminFormField>
            <AdminFormField label="CTA link" name="cta_href">
              <AdminInput
                id="cta_href"
                value={form.ctaHref}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ctaHref: e.target.value }))
                }
                placeholder="/courses/it"
              />
            </AdminFormField>
          </div>
        </div>
      </div>
    </AdminModal>
  );
}
