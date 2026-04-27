"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { AdminModal } from "@/components/admin/AdminModal";
import {
  AdminFormField,
  AdminInput,
  AdminTextarea,
} from "@/components/admin/AdminFormField";
import { Button } from "@/components/ui/button";
import { updateNotificationType } from "@/lib/mutations/admin/notification-config";
import type { NotificationTypeConfig } from "@/types/database";

interface TypesTabProps {
  types: NotificationTypeConfig[];
}

export function TypesTab({ types: initial }: TypesTabProps) {
  const router = useRouter();
  const [types, setTypes] = useState(initial);
  const [editing, setEditing] = useState<NotificationTypeConfig | null>(null);
  const [busyType, setBusyType] = useState<string | null>(null);

  useEffect(() => {
    setTypes(initial);
  }, [initial]);

  const handleToggle = async (
    type: NotificationTypeConfig,
    enabled: boolean
  ) => {
    setBusyType(type.type);
    // Optimistic
    setTypes((prev) =>
      prev.map((t) => (t.type === type.type ? { ...t, enabled } : t))
    );
    const res = await updateNotificationType(type.type, { enabled });
    setBusyType(null);
    if (!res.success) {
      // Revert
      setTypes((prev) =>
        prev.map((t) =>
          t.type === type.type ? { ...t, enabled: !enabled } : t
        )
      );
    } else {
      router.refresh();
    }
  };

  return (
    <>
      {/* Header row */}
      <div className="grid grid-cols-[160px_1fr_120px_80px] gap-4 px-6 py-3">
        <span className="text-xs-medium text-muted-foreground">Type</span>
        <span className="text-xs-medium text-muted-foreground">Description</span>
        <span className="text-xs-medium text-muted-foreground">Enabled</span>
        <span className="text-xs-medium text-muted-foreground">Edit</span>
      </div>

      {/* Body */}
      <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white">
        {types.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No types configured.
          </div>
        ) : (
          types.map((t) => {
            const isBusy = busyType === t.type;
            return (
              <div
                key={t.type}
                className="grid grid-cols-[160px_1fr_120px_80px] items-center gap-4 px-6 py-4 transition-colors hover:bg-[#FAF8F3]"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {t.label}
                  </div>
                  <div className="text-xs text-gray-500">{t.type}</div>
                </div>
                <div className="text-sm text-gray-600">
                  {t.description ?? (
                    <span className="text-gray-400">No description</span>
                  )}
                </div>
                <div>
                  <ToggleSwitch
                    checked={t.enabled}
                    disabled={isBusy}
                    onChange={(v) => handleToggle(t, v)}
                  />
                </div>
                <div>
                  <button
                    onClick={() => setEditing(t)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Edit label & description"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <TypeEditModal
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setTypes((prev) =>
            prev.map((t) => (t.type === updated.type ? updated : t))
          );
          setEditing(null);
          router.refresh();
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Toggle switch primitive
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

// ---------------------------------------------------------------------------
// Edit modal
// ---------------------------------------------------------------------------

function TypeEditModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: NotificationTypeConfig | null;
  onClose: () => void;
  onSaved: (updated: NotificationTypeConfig) => void;
}) {
  if (!editing) return null;
  return (
    <TypeEditModalInner
      // Remount whenever the target type changes — initialises form via
      // useState initialiser instead of a setState-in-effect dance.
      key={editing.type}
      editing={editing}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function TypeEditModalInner({
  editing,
  onClose,
  onSaved,
}: {
  editing: NotificationTypeConfig;
  onClose: () => void;
  onSaved: (updated: NotificationTypeConfig) => void;
}) {
  const [label, setLabel] = useState(editing.label);
  const [description, setDescription] = useState(editing.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateNotificationType(editing.type, {
        label: label.trim(),
        description: description.trim() ? description.trim() : null,
      });
      if (!res.success) {
        setError(res.error ?? "Failed to save");
        return;
      }
      onSaved({
        ...editing,
        label: label.trim(),
        description: description.trim() ? description.trim() : null,
      });
    });
  };

  return (
    <AdminModal
      isOpen={!!editing}
      onClose={onClose}
      title={`Edit type: ${editing.type}`}
      description="Adjust the human-readable label and description shown in the admin UI."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={pending || !label.trim()}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <AdminFormField label="Label" name="label" required>
          <AdminInput
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
          />
        </AdminFormField>
        <AdminFormField label="Description" name="description">
          <AdminTextarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </AdminFormField>
      </div>
    </AdminModal>
  );
}
