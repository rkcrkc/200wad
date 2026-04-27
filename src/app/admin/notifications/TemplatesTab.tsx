"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { cn } from "@/lib/utils";
import {
  updateNotificationTemplate,
  deleteNotificationTemplate,
} from "@/lib/mutations/admin/notification-config";
import type {
  NotificationTemplate,
  NotificationTypeConfig,
} from "@/types/database";
import { TemplateFormModal } from "./TemplateFormModal";

type TemplateRow = NotificationTemplate & {
  type_enabled: boolean;
  type_label: string;
};

interface TemplatesTabProps {
  templates: TemplateRow[];
  types: NotificationTypeConfig[];
}

const TYPE_STYLES: Record<string, string> = {
  system: "bg-gray-100 text-gray-700",
  billing: "bg-orange-100 text-orange-700",
  learning: "bg-green-100 text-green-700",
  reminder: "bg-blue-100 text-blue-700",
  achievement: "bg-yellow-100 text-yellow-700",
  content: "bg-purple-100 text-purple-700",
  admin: "bg-foreground/10 text-foreground",
};

type TypeFilter = "all" | string;

export function TemplatesTab({ templates: initial, types }: TemplatesTabProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [deleting, setDeleting] = useState<TemplateRow | null>(null);
  const [activeType, setActiveType] = useState<TypeFilter>("all");

  useEffect(() => {
    setTemplates(initial);
  }, [initial]);

  // Build sub-tab list from configured types, with per-type counts so admins
  // can see at a glance which categories are populated. "All" first.
  const subTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of templates) {
      counts.set(t.type, (counts.get(t.type) ?? 0) + 1);
    }
    return [
      { key: "all" as TypeFilter, label: "All", count: templates.length },
      ...types.map((t) => ({
        key: t.type as TypeFilter,
        label: t.label,
        count: counts.get(t.type) ?? 0,
      })),
    ];
  }, [templates, types]);

  // If the active sub-tab is removed (e.g. type deleted), fall back to "all".
  useEffect(() => {
    if (activeType === "all") return;
    if (!subTabs.some((s) => s.key === activeType)) {
      setActiveType("all");
    }
  }, [subTabs, activeType]);

  const visibleTemplates = useMemo(
    () =>
      activeType === "all"
        ? templates
        : templates.filter((t) => t.type === activeType),
    [templates, activeType]
  );

  const handleToggle = async (row: TemplateRow, enabled: boolean) => {
    setBusyId(row.id);
    // Optimistic
    setTemplates((prev) =>
      prev.map((t) => (t.id === row.id ? { ...t, enabled } : t))
    );
    const res = await updateNotificationTemplate(row.id, { enabled });
    setBusyId(null);
    if (!res.success) {
      // Revert
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === row.id ? { ...t, enabled: !enabled } : t
        )
      );
    } else {
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    const res = await deleteNotificationTemplate(deleting.id);
    setBusyId(null);
    if (res.success) {
      setTemplates((prev) => prev.filter((t) => t.id !== deleting.id));
      router.refresh();
    }
    setDeleting(null);
  };

  const handleSuccess = () => {
    setShowCreate(false);
    setEditing(null);
    router.refresh();
  };

  return (
    <div>
      {/* Sub-tab nav — one chip per notification type, plus "All". */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {subTabs.map((tab) => {
          const isActive = tab.key === activeType;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveType(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "bg-bone text-gray-700 hover:bg-beige"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-white text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab toolbar */}
      <div className="mb-4 flex items-center justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No templates yet. Create one to define system-generated notification
            content.
          </p>
        </div>
      ) : visibleTemplates.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No templates in this category yet.
          </p>
          <button
            type="button"
            onClick={() => setActiveType("all")}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Show all
          </button>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[1fr_180px_120px_140px_120px_100px] gap-4 px-6 py-3">
            <span className="text-xs-medium text-muted-foreground">
              Template
            </span>
            <span className="text-xs-medium text-muted-foreground">Type</span>
            <span className="text-xs-medium text-muted-foreground">
              Channels
            </span>
            <span className="text-xs-medium text-muted-foreground">
              Title preview
            </span>
            <span className="text-xs-medium text-muted-foreground">
              Enabled
            </span>
            <span className="text-xs-medium text-muted-foreground">
              Actions
            </span>
          </div>

          {/* Body */}
          <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white">
            {visibleTemplates.map((t) => {
              const isBusy = busyId === t.id;
              const typeDisabled = !t.type_enabled;

              return (
                <div
                  key={t.id}
                  className="grid grid-cols-[1fr_180px_120px_140px_120px_100px] items-center gap-4 px-6 py-4 transition-colors hover:bg-[#FAF8F3]"
                >
                  {/* Label + key */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {t.label}
                      </div>
                      {t.is_system && (
                        <span
                          title="System template — registered by code, cannot be deleted"
                          className="inline-flex items-center gap-1 rounded-full bg-bone px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          <Lock className="h-3 w-3" />
                          system
                        </span>
                      )}
                    </div>
                    <div className="truncate font-mono text-xs text-gray-500">
                      {t.key}
                    </div>
                  </div>

                  {/* Type pill + master-disabled hint */}
                  <div className="flex flex-col gap-1">
                    <span
                      className={cn(
                        "inline-block w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                        TYPE_STYLES[t.type] ?? "bg-gray-100 text-gray-700"
                      )}
                    >
                      {t.type_label}
                    </span>
                    {typeDisabled && (
                      <span
                        className="text-[10px] text-amber-600"
                        title="The parent type is disabled — this template will be skipped at runtime regardless of its own toggle."
                      >
                        type disabled
                      </span>
                    )}
                  </div>

                  {/* Channels */}
                  <div className="flex flex-wrap gap-1">
                    {t.channels.map((c) => (
                      <span
                        key={c}
                        className="inline-block rounded-full bg-bone px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        {c === "in_app" ? "in-app" : c}
                      </span>
                    ))}
                  </div>

                  {/* Title preview */}
                  <div className="truncate text-xs text-gray-600" title={t.title}>
                    {t.title}
                  </div>

                  {/* Enabled toggle */}
                  <div>
                    <ToggleSwitch
                      checked={t.enabled}
                      disabled={isBusy}
                      onChange={(v) => handleToggle(t, v)}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing(t)}
                      disabled={isBusy}
                      title="Edit"
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(t)}
                      disabled={isBusy || t.is_system}
                      title={
                        t.is_system
                          ? "System templates cannot be deleted — disable instead"
                          : "Delete"
                      }
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create / edit modal */}
      <TemplateFormModal
        isOpen={showCreate || !!editing}
        onClose={() => {
          setShowCreate(false);
          setEditing(null);
        }}
        editing={editing}
        types={types}
        onSuccess={handleSuccess}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete template?"
        message={`This will permanently delete "${
          deleting?.label ?? "this template"
        }". Code paths that look up "${
          deleting?.key ?? ""
        }" will fail silently (skipped). To temporarily stop sends instead, disable the template.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={busyId !== null && busyId === deleting?.id}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle switch primitive (mirrors TypesTab)
// ---------------------------------------------------------------------------

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-gray-300"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
