"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { LeagueEditModal } from "@/components/admin/LeagueEditModal";
import { deleteLeague, toggleLeagueEnabled } from "@/lib/mutations/admin/leagues";
import type { League } from "@/types/aliases";

interface LeaguesClientProps {
  leagues: League[];
}

export function LeaguesClient({ leagues: initialLeagues }: LeaguesClientProps) {
  const router = useRouter();
  const [leagues, setLeagues] = useState(initialLeagues);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [deletingLeague, setDeletingLeague] = useState<League | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync local state when server data refreshes
  useEffect(() => {
    setLeagues(initialLeagues);
  }, [initialLeagues]);

  const handleToggleEnabled = async (leagueId: string, enabled: boolean) => {
    // Optimistic update
    setLeagues((prev) =>
      prev.map((l) => (l.id === leagueId ? { ...l, enabled } : l))
    );
    const result = await toggleLeagueEnabled(leagueId, enabled);
    if (!result.success) {
      // Revert on error
      setLeagues((prev) =>
        prev.map((l) => (l.id === leagueId ? { ...l, enabled: !enabled } : l))
      );
    }
  };

  const handleDelete = async () => {
    if (!deletingLeague) return;
    setIsDeleting(true);
    const result = await deleteLeague(deletingLeague.id);
    if (result.success) {
      setLeagues((prev) => prev.filter((l) => l.id !== deletingLeague.id));
    }
    setIsDeleting(false);
    setDeletingLeague(null);
  };

  const handleSuccess = () => {
    setShowCreateModal(false);
    setEditingLeague(null);
    router.refresh();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leagues</h1>
          <p className="mt-1 text-sm text-gray-500">
            The weekly XP competition ladder — members are promoted and relegated between tiers each week
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create League
        </Button>
      </div>

      {/* Table */}
      {leagues.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No leagues yet. Create your first tier to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[60px_1.5fr_100px_100px_120px_80px_80px] gap-4 px-6 py-3">
            <span className="text-xs-medium text-muted-foreground">#</span>
            <span className="text-xs-medium text-muted-foreground">Tier</span>
            <span className="text-xs-medium text-muted-foreground">Colour</span>
            <span className="text-xs-medium text-muted-foreground">Division</span>
            <span className="text-xs-medium text-muted-foreground">Promote / Relegate</span>
            <span className="text-xs-medium text-muted-foreground">Enabled</span>
            <span className="text-xs-medium text-muted-foreground">Actions</span>
          </div>

          {/* Body */}
          <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white">
            {leagues.map((league) => (
              <div
                key={league.id}
                className="grid grid-cols-[60px_1.5fr_100px_100px_120px_80px_80px] items-center gap-4 px-6 py-4 transition-colors hover:bg-[#FAF8F3]"
              >
                {/* Tier order */}
                <div className="text-sm font-medium text-gray-900">
                  {league.tier_order}
                </div>

                {/* Emoji + name + slug */}
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-xl leading-none">{league.icon}</span>
                  <span className="truncate text-sm font-medium text-gray-900">
                    {league.name}
                  </span>
                  <span className="truncate text-xs text-gray-400">{league.slug}</span>
                </div>

                {/* Colour swatch */}
                <div className="flex items-center gap-2">
                  <span
                    className="h-5 w-5 shrink-0 rounded-full border border-gray-200"
                    style={{ backgroundColor: league.color }}
                  />
                  <span className="font-mono text-xs text-gray-400">{league.color}</span>
                </div>

                {/* Division size */}
                <div className="text-sm text-gray-500">{league.division_size}</div>

                {/* Promote / Relegate */}
                <div className="text-sm text-gray-500">
                  {league.promote_count} / {league.relegate_count}
                </div>

                {/* Enabled toggle */}
                <div>
                  <Switch
                    checked={league.enabled}
                    onCheckedChange={(checked) => handleToggleEnabled(league.id, checked)}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingLeague(league)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingLeague(league)}
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
      <LeagueEditModal
        isOpen={showCreateModal || !!editingLeague}
        onClose={() => {
          setShowCreateModal(false);
          setEditingLeague(null);
        }}
        editingLeague={editingLeague}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingLeague}
        onClose={() => setDeletingLeague(null)}
        onConfirm={handleDelete}
        title="Delete league?"
        message={`This will permanently delete the "${deletingLeague?.name ?? "this"}" tier. Members in this tier this week keep their membership until the next weekly close.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
