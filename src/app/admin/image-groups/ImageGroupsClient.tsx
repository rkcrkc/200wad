"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { ImageGroupEditModal } from "@/components/admin/ImageGroupEditModal";
import { Tabs } from "@/components/ui/tabs";
import { deleteImageGroup } from "@/lib/mutations/admin/imageGroups";
import type { ImageGroupWithStats } from "@/lib/queries/imageGroups";

interface ImageGroupsClientProps {
  groups: ImageGroupWithStats[];
}

type SortKey = "label" | "key" | "members";
type SortDir = "asc" | "desc";

export function ImageGroupsClient({
  groups: initialGroups,
}: ImageGroupsClientProps) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [activeCourse, setActiveCourse] = useState<string>("all");
  const [editingGroup, setEditingGroup] = useState<ImageGroupWithStats | null>(
    null
  );
  const [deletingGroup, setDeletingGroup] =
    useState<ImageGroupWithStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync local state when server data refreshes
  useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);

  const handleDelete = async () => {
    if (!deletingGroup) return;
    setIsDeleting(true);
    const result = await deleteImageGroup(deletingGroup.id);
    if (result.success) {
      setGroups((prev) => prev.filter((g) => g.id !== deletingGroup.id));
    }
    setIsDeleting(false);
    setDeletingGroup(null);
  };

  const handleSuccess = () => {
    setEditingGroup(null);
    router.refresh();
  };

  // Clicking a header sorts by that column; clicking the active column flips dir.
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Course tabs, derived from the groups present. "All" first, then one per
  // course (ordered by course name), each annotated with its group count.
  const courseTabs = useMemo(() => {
    const byCourse = new Map<string, { name: string; count: number }>();
    for (const g of groups) {
      const entry = byCourse.get(g.course_id);
      if (entry) {
        entry.count += 1;
      } else {
        byCourse.set(g.course_id, { name: g.courseName ?? "—", count: 1 });
      }
    }
    const courses = [...byCourse.entries()]
      .map(([id, { name, count }]) => ({ id, label: name, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ id: "all", label: "All", count: groups.length }, ...courses];
  }, [groups]);

  // Filter by the selected course tab, then apply the active sort. Sorting
  // falls back to the server order until a header is clicked.
  const visibleGroups = useMemo(() => {
    const filtered =
      activeCourse === "all"
        ? groups
        : groups.filter((g) => g.course_id === activeCourse);
    if (!sortKey) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "label":
          cmp = (a.label ?? "").localeCompare(b.label ?? "");
          break;
        case "key":
          cmp = (a.key ?? "").localeCompare(b.key ?? "");
          break;
        case "members":
          cmp = a.memberCount - b.memberCount;
          break;
      }
      return cmp * dir;
    });
  }, [groups, activeCourse, sortKey, sortDir]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Concept Pics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Course-scoped picture groups. Each group owns a master image that its
          member words inherit, unless a word sets its own override.
        </p>
      </div>

      {/* Table */}
      {groups.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">No image groups yet.</p>
        </div>
      ) : (
        <>
          {/* Course tabs */}
          <Tabs
            tabs={courseTabs}
            activeTab={activeCourse}
            onChange={setActiveCourse}
            className="mb-4"
          />

          {/* Header row */}
          <div className="grid grid-cols-[64px_1.5fr_1.5fr_1fr_100px_80px] gap-4 px-6 py-3">
            <span className="text-xs-medium text-muted-foreground">Master</span>
            <SortHeader label="Label" column="label" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Key" column="key" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <span className="text-xs-medium text-muted-foreground">Course</span>
            <SortHeader label="Members" column="members" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <span className="text-xs-medium text-muted-foreground">Actions</span>
          </div>

          {/* Body */}
          <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white">
            {visibleGroups.map((group) => (
              <div
                key={group.id}
                className="grid grid-cols-[64px_1.5fr_1.5fr_1fr_100px_80px] items-center gap-4 px-6 py-4 transition-colors hover:bg-[#FAF8F3]"
              >
                {/* Master thumbnail */}
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                  {group.master_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={group.master_image_url}
                      alt={group.label}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-gray-300" />
                  )}
                </div>

                {/* Label + exception badge */}
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-gray-900">
                    {group.label}
                  </span>
                  {group.is_exception && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Exception
                    </span>
                  )}
                </div>

                {/* Key */}
                <div className="min-w-0">
                  <span className="truncate font-mono text-xs text-gray-400">
                    {group.key}
                  </span>
                </div>

                {/* Course */}
                <div className="min-w-0 truncate text-sm text-gray-500">
                  {group.courseName ?? "—"}
                </div>

                {/* Member count (+ overrides) */}
                <div className="text-sm text-gray-500">
                  {group.memberCount.toLocaleString()}
                  {group.overrideCount > 0 && (
                    <span className="ml-1 text-xs text-gray-400">
                      ({group.overrideCount} override
                      {group.overrideCount === 1 ? "" : "s"})
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingGroup(group)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingGroup(group)}
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

      {/* Edit Modal */}
      <ImageGroupEditModal
        isOpen={!!editingGroup}
        onClose={() => setEditingGroup(null)}
        editingGroup={editingGroup}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingGroup}
        onClose={() => setDeletingGroup(null)}
        onConfirm={handleDelete}
        title="Delete image group?"
        message={`This will delete the "${
          deletingGroup?.label ?? "this"
        }" group. Its ${
          deletingGroup?.memberCount ?? 0
        } member word(s) will be detached; inheriting members lose their image unless they have their own override.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}

interface SortHeaderProps {
  label: string;
  column: SortKey;
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}

function SortHeader({ label, column, sortKey, sortDir, onSort }: SortHeaderProps) {
  const isActive = sortKey === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-left text-xs-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
      {isActive ? (
        sortDir === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}
