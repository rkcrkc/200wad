"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminModal, ConfirmModal } from "@/components/admin/AdminModal";
import {
  AdminFormField,
  AdminInput,
} from "@/components/admin/AdminFormField";
import { toast } from "@/lib/toast";
import {
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
} from "@/lib/mutations/admin/blog";
import type { AdminCategoryRow } from "@/lib/queries/admin/blog";

interface CategoriesTabProps {
  categories: AdminCategoryRow[];
}

export function CategoriesTab({ categories }: CategoriesTabProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminCategoryRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminCategoryRow | null>(null);
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const res = await deleteBlogCategory(target.id);
      if (!res.success) {
        toast.error(res.error ?? "Couldn't delete category.");
        return;
      }
      toast.success("Category deleted.");
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" />
          New Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-sm text-gray-500">
          No categories yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[1fr_1fr_120px_90px_90px] items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-xs font-medium text-gray-500">Name</span>
            <span className="text-xs font-medium text-gray-500">Slug</span>
            <span className="text-xs font-medium text-gray-500">Sort order</span>
            <span className="text-xs font-medium text-gray-500">Posts</span>
            <span className="text-right text-xs font-medium text-gray-500">Actions</span>
          </div>
          <div className="divide-y divide-gray-100">
            {categories.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-[1fr_1fr_120px_90px_90px] items-center gap-4 px-4 py-3 transition-colors hover:bg-[#FAF8F3]"
              >
                <span className="truncate text-sm font-medium text-gray-900">
                  {c.name}
                </span>
                <span className="truncate text-sm text-gray-500">/{c.slug}</span>
                <span className="text-sm text-gray-600">{c.sort_order}</span>
                <span className="text-sm text-gray-600">{c.postCount}</span>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(c)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <CategoryModal
          key={editing === "new" ? "new" : editing.id}
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete category"
        message={
          deleting && deleting.postCount > 0
            ? `Delete "${deleting.name}"? ${deleting.postCount} post(s) will lose this category.`
            : `Delete "${deleting?.name}"?`
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={pending}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Create / edit modal
// ---------------------------------------------------------------------------

function CategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category: AdminCategoryRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !category;
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || null,
        sort_order: Number(sortOrder) || 0,
      };
      const res = isNew
        ? await createBlogCategory(payload)
        : await updateBlogCategory(category.id, payload);
      if (!res.success) {
        setError(res.error ?? "Failed to save.");
        return;
      }
      toast.success(isNew ? "Category created." : "Category saved.");
      onSaved();
    });
  };

  return (
    <AdminModal
      isOpen
      onClose={onClose}
      title={isNew ? "New category" : "Edit category"}
      description="Slug is optional — it's derived from the name when left blank."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={pending || !name.trim()}>
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
        <AdminFormField label="Name" name="cat-name" required>
          <AdminInput
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
          />
        </AdminFormField>
        <AdminFormField label="Slug" name="cat-slug" hint="Lowercase letters, numbers, hyphens.">
          <AdminInput
            id="cat-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto from name"
          />
        </AdminFormField>
        <AdminFormField label="Sort order" name="cat-sort">
          <AdminInput
            id="cat-sort"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </AdminFormField>
      </div>
    </AdminModal>
  );
}
