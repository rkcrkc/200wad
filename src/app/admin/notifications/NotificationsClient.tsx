"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/helpers";
import {
  deleteBroadcast,
  sendBroadcastNow,
  cancelScheduledBroadcast,
} from "@/lib/mutations/admin/notifications";
import type { BroadcastWithStats } from "@/lib/queries/notifications";
import { BroadcastFormModal } from "./BroadcastFormModal";

interface NotificationsClientProps {
  broadcasts: BroadcastWithStats[];
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-bone text-muted-foreground",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const TYPE_STYLES: Record<string, string> = {
  system: "bg-gray-100 text-gray-700",
  billing: "bg-orange-100 text-orange-700",
  learning: "bg-green-100 text-green-700",
  reminder: "bg-blue-100 text-blue-700",
  achievement: "bg-yellow-100 text-yellow-700",
  content: "bg-purple-100 text-purple-700",
  admin: "bg-foreground/10 text-foreground",
};

function audienceLabel(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "—";
  const a = raw as Record<string, unknown>;
  if (a.all === true) return "All users";

  const parts: string[] = [];
  if (Array.isArray(a.plan)) parts.push(a.plan.join(" & "));
  if (Array.isArray(a.language)) parts.push(`lang: ${a.language.join(",")}`);
  if (typeof a.active_within_days === "number")
    parts.push(`active ≤${a.active_within_days}d`);
  if (typeof a.inactive_for_days === "number")
    parts.push(`idle ≥${a.inactive_for_days}d`);
  return parts.length > 0 ? parts.join(" · ") : "Custom";
}

export function NotificationsClient({
  broadcasts: initial,
}: NotificationsClientProps) {
  const router = useRouter();
  const [broadcasts, setBroadcasts] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<BroadcastWithStats | null>(null);
  const [deleting, setDeleting] = useState<BroadcastWithStats | null>(null);
  const [sending, setSending] = useState<BroadcastWithStats | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setBroadcasts(initial);
  }, [initial]);

  const handleSuccess = () => {
    setShowCreate(false);
    setEditing(null);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    const res = await deleteBroadcast(deleting.id);
    setBusyId(null);
    if (res.success) {
      setBroadcasts((prev) => prev.filter((b) => b.id !== deleting.id));
    }
    setDeleting(null);
  };

  const handleSendNow = async () => {
    if (!sending) return;
    setBusyId(sending.id);
    const res = await sendBroadcastNow(sending.id);
    setBusyId(null);
    setSending(null);
    if (res.success) {
      router.refresh();
    }
  };

  const handleCancel = async (id: string) => {
    setBusyId(id);
    const res = await cancelScheduledBroadcast(id);
    setBusyId(null);
    if (res.success) router.refresh();
  };

  return (
    <div>
      {/* Tab toolbar */}
      <div className="mb-4 flex items-center justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New broadcast
        </Button>
      </div>

      {broadcasts.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No broadcasts yet. Create one to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[2fr_120px_120px_140px_140px_120px_100px] gap-4 px-6 py-3">
            <span className="text-xs-medium text-muted-foreground">Title</span>
            <span className="text-xs-medium text-muted-foreground">Type</span>
            <span className="text-xs-medium text-muted-foreground">Status</span>
            <span className="text-xs-medium text-muted-foreground">Audience</span>
            <span className="text-xs-medium text-muted-foreground">Delivery</span>
            <span className="text-xs-medium text-muted-foreground">Stats</span>
            <span className="text-xs-medium text-muted-foreground">Actions</span>
          </div>

          {/* Body */}
          <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white">
            {broadcasts.map((b) => {
              const isEditable =
                b.status === "draft" || b.status === "scheduled";
              const isCancellable = b.status === "scheduled";
              const isSendable = isEditable;
              const isBusy = busyId === b.id;

              return (
                <div
                  key={b.id}
                  className="grid grid-cols-[2fr_120px_120px_140px_140px_120px_100px] items-center gap-4 px-6 py-4 transition-colors hover:bg-[#FAF8F3]"
                >
                  {/* Title + message preview */}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {b.title}
                    </div>
                    <div className="truncate text-xs text-gray-500">
                      {b.message}
                    </div>
                  </div>

                  {/* Type pill */}
                  <div>
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                        TYPE_STYLES[b.type] ?? "bg-gray-100 text-gray-700"
                      )}
                    >
                      {b.type}
                    </span>
                  </div>

                  {/* Status pill */}
                  <div>
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                        STATUS_STYLES[b.status] ?? "bg-gray-100 text-gray-700"
                      )}
                    >
                      {b.status}
                    </span>
                  </div>

                  {/* Audience */}
                  <div className="truncate text-xs text-gray-600" title={audienceLabel(b.audience)}>
                    {audienceLabel(b.audience)}
                  </div>

                  {/* Delivery */}
                  <div className="text-xs text-gray-600">
                    {b.status === "scheduled" && b.scheduled_for ? (
                      <>Scheduled<br />{formatRelativeTime(b.scheduled_for)}</>
                    ) : b.sent_at ? (
                      <>Sent<br />{formatRelativeTime(b.sent_at)}</>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="text-xs text-gray-600">
                    {b.delivered_count > 0 ? (
                      <>
                        {b.delivered_count} sent
                        <br />
                        {b.read_count} read
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {isSendable && (
                      <button
                        onClick={() => setSending(b)}
                        disabled={isBusy}
                        title="Send now"
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-primary disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                    {isCancellable && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={isBusy}
                        title="Cancel schedule"
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {isEditable && (
                      <button
                        onClick={() => setEditing(b)}
                        disabled={isBusy}
                        title="Edit"
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleting(b)}
                      disabled={isBusy}
                      title="Delete"
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
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

      {/* Create / Edit modal */}
      <BroadcastFormModal
        isOpen={showCreate || !!editing}
        onClose={() => {
          setShowCreate(false);
          setEditing(null);
        }}
        editing={editing}
        onSuccess={handleSuccess}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete broadcast?"
        message={`This will permanently delete "${deleting?.title ?? "this broadcast"}". Already-sent inbox rows will keep their content but lose the broadcast link.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={busyId !== null && busyId === deleting?.id}
      />

      {/* Send-now confirmation */}
      <ConfirmModal
        isOpen={!!sending}
        onClose={() => setSending(null)}
        onConfirm={handleSendNow}
        title="Send broadcast now?"
        message={`"${sending?.title ?? "This broadcast"}" will be queued for delivery to ${audienceLabel(sending?.audience).toLowerCase()}.`}
        confirmLabel="Send now"
        isLoading={busyId !== null && busyId === sending?.id}
      />
    </div>
  );
}
