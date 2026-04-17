"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { AdminTipEditModal } from "@/components/admin/AdminTipEditModal";
import { deleteTip, toggleTipActive } from "@/lib/mutations/admin/tips";
import type { TipWithWordCount } from "@/lib/queries/tips";

interface TipsClientProps {
  tips: TipWithWordCount[];
}

export function TipsClient({ tips: initialTips }: TipsClientProps) {
  const router = useRouter();
  const [tips, setTips] = useState(initialTips);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Sync local state when server data refreshes
  useEffect(() => {
    setTips(initialTips);
  }, [initialTips]);
  const [editingTip, setEditingTip] = useState<TipWithWordCount | null>(null);
  const [deletingTip, setDeletingTip] = useState<TipWithWordCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleActive = async (tipId: string, isActive: boolean) => {
    // Optimistic update
    setTips((prev) =>
      prev.map((t) => (t.id === tipId ? { ...t, is_active: isActive } : t))
    );
    const result = await toggleTipActive(tipId, isActive);
    if (!result.success) {
      // Revert on error
      setTips((prev) =>
        prev.map((t) => (t.id === tipId ? { ...t, is_active: !isActive } : t))
      );
    }
  };

  const handleDelete = async () => {
    if (!deletingTip) return;
    setIsDeleting(true);
    const result = await deleteTip(deletingTip.id);
    if (result.success) {
      setTips((prev) => prev.filter((t) => t.id !== deletingTip.id));
    }
    setIsDeleting(false);
    setDeletingTip(null);
  };

  const handleSuccess = () => {
    setShowCreateModal(false);
    setEditingTip(null);
    router.refresh();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tips</h1>
          <p className="mt-1 text-sm text-gray-500">
            Contextual explainer cards that appear in study mode sidebar
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Tip
        </Button>
      </div>

      {/* Table */}
      {tips.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">No tips yet. Create your first tip to get started.</p>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[1fr_2fr_120px_80px_80px] gap-4 px-6 py-3">
            <span className="text-xs-medium text-muted-foreground">Title</span>
            <span className="text-xs-medium text-muted-foreground">Body</span>
            <span className="text-xs-medium text-muted-foreground">Words</span>
            <span className="text-xs-medium text-muted-foreground">Active</span>
            <span className="text-xs-medium text-muted-foreground">Actions</span>
          </div>

          {/* Body */}
          <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white">
            {tips.map((tip) => (
              <div
                key={tip.id}
                className="grid grid-cols-[1fr_2fr_120px_80px_80px] items-center gap-4 px-6 py-4 transition-colors hover:bg-[#FAF8F3]"
              >
                {/* Title */}
                <div className="truncate text-sm font-medium text-gray-900">
                  {tip.title || <span className="text-gray-400 italic">Untitled</span>}
                </div>

                {/* Body preview */}
                <div className="truncate text-sm text-gray-500">
                  {tip.body.length > 100 ? `${tip.body.slice(0, 100)}...` : tip.body}
                </div>

                {/* Word count + badges */}
                <div className="flex flex-wrap gap-1">
                  {tip.linkedWords.length > 0 ? (
                    tip.linkedWords.slice(0, 3).map((w) => (
                      <span
                        key={w.id}
                        className="inline-block max-w-[100px] truncate rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                        title={`${w.headword} (${w.english})`}
                      >
                        {w.headword}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">None</span>
                  )}
                  {tip.linkedWords.length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{tip.linkedWords.length - 3}
                    </span>
                  )}
                </div>

                {/* Active toggle */}
                <div>
                  <Switch
                    checked={tip.is_active}
                    onCheckedChange={(checked) => handleToggleActive(tip.id, checked)}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingTip(tip)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingTip(tip)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      <AdminTipEditModal
        isOpen={showCreateModal || !!editingTip}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTip(null);
        }}
        editingTip={editingTip}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingTip}
        onClose={() => setDeletingTip(null)}
        onConfirm={handleDelete}
        title="Delete tip?"
        message={`This will permanently delete "${deletingTip?.title || "this tip"}" and remove it from all linked words.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
