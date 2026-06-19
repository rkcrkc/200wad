"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { LevelBadge } from "@/components/levels/LevelBadge";
import { LevelEditModal } from "@/components/admin/LevelEditModal";
import { deleteLevel, toggleLevelEnabled } from "@/lib/mutations/admin/levels";
import type { Level } from "@/types/aliases";

interface LevelsClientProps {
  levels: Level[];
}

export function LevelsClient({ levels: initialLevels }: LevelsClientProps) {
  const router = useRouter();
  const [levels, setLevels] = useState(initialLevels);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<Level | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync local state when server data refreshes
  useEffect(() => {
    setLevels(initialLevels);
  }, [initialLevels]);

  const handleToggleEnabled = async (levelId: string, enabled: boolean) => {
    // Optimistic update
    setLevels((prev) =>
      prev.map((l) => (l.id === levelId ? { ...l, enabled } : l))
    );
    const result = await toggleLevelEnabled(levelId, enabled);
    if (!result.success) {
      // Revert on error
      setLevels((prev) =>
        prev.map((l) => (l.id === levelId ? { ...l, enabled: !enabled } : l))
      );
    }
  };

  const handleDelete = async () => {
    if (!deletingLevel) return;
    setIsDeleting(true);
    const result = await deleteLevel(deletingLevel.id);
    if (result.success) {
      setLevels((prev) => prev.filter((l) => l.id !== deletingLevel.id));
    }
    setIsDeleting(false);
    setDeletingLevel(null);
  };

  const handleSuccess = () => {
    setShowCreateModal(false);
    setEditingLevel(null);
    router.refresh();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Levels</h1>
          <p className="mt-1 text-sm text-gray-500">
            The rank ladder — users climb by clearing both the XP and lessons-mastered gate of each tier
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Level
        </Button>
      </div>

      {/* Table */}
      {levels.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No levels yet. Create your first tier to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[60px_1.5fr_120px_120px_80px_80px] gap-4 px-6 py-3">
            <span className="text-xs-medium text-muted-foreground">#</span>
            <span className="text-xs-medium text-muted-foreground">Rank</span>
            <span className="text-xs-medium text-muted-foreground">XP gate</span>
            <span className="text-xs-medium text-muted-foreground">Lessons gate</span>
            <span className="text-xs-medium text-muted-foreground">Enabled</span>
            <span className="text-xs-medium text-muted-foreground">Actions</span>
          </div>

          {/* Body */}
          <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white">
            {levels.map((level) => (
              <div
                key={level.id}
                className="grid grid-cols-[60px_1.5fr_120px_120px_80px_80px] items-center gap-4 px-6 py-4 transition-colors hover:bg-[#FAF8F3]"
              >
                {/* Level number */}
                <div className="text-sm font-medium text-gray-900">
                  {level.level_number}
                </div>

                {/* Rank badge preview */}
                <div className="flex min-w-0 items-center gap-2">
                  <LevelBadge name={level.name} color={level.color} size="md" />
                  <span className="truncate text-xs text-gray-400">{level.slug}</span>
                </div>

                {/* XP threshold */}
                <div className="text-sm text-gray-500">
                  {level.xp_threshold.toLocaleString()}
                </div>

                {/* Lessons-mastered threshold */}
                <div className="text-sm text-gray-500">
                  {level.lessons_mastered_threshold.toLocaleString()}
                </div>

                {/* Enabled toggle */}
                <div>
                  <Switch
                    checked={level.enabled}
                    onCheckedChange={(checked) => handleToggleEnabled(level.id, checked)}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingLevel(level)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingLevel(level)}
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
      <LevelEditModal
        isOpen={showCreateModal || !!editingLevel}
        onClose={() => {
          setShowCreateModal(false);
          setEditingLevel(null);
        }}
        editingLevel={editingLevel}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingLevel}
        onClose={() => setDeletingLevel(null)}
        onConfirm={handleDelete}
        title="Delete level?"
        message={`This will permanently delete the "${deletingLevel?.name ?? "this"}" rank. Users cached at this level keep their pointer until their next promotion check.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
