"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminModal, ConfirmModal } from "@/components/admin/AdminModal";
import {
  AdminFormField,
  AdminInput,
  AdminTextarea,
} from "@/components/admin/AdminFormField";
import { toast } from "@/lib/toast";
import {
  createBlogAuthor,
  updateBlogAuthor,
  deleteBlogAuthor,
} from "@/lib/mutations/admin/blog";
import { BlogImageField } from "./BlogImageField";
import type { AdminAuthorRow } from "@/lib/queries/admin/blog";

interface AuthorsTabProps {
  authors: AdminAuthorRow[];
}

export function AuthorsTab({ authors }: AuthorsTabProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminAuthorRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminAuthorRow | null>(null);
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const res = await deleteBlogAuthor(target.id);
      if (!res.success) {
        toast.error(res.error ?? "Couldn't delete author.");
        return;
      }
      toast.success("Author deleted.");
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" />
          New Author
        </Button>
      </div>

      {authors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-sm text-gray-500">
          No authors yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[56px_1fr_1fr_90px_90px] items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-xs font-medium text-gray-500">Avatar</span>
            <span className="text-xs font-medium text-gray-500">Name</span>
            <span className="text-xs font-medium text-gray-500">Role</span>
            <span className="text-xs font-medium text-gray-500">Posts</span>
            <span className="text-right text-xs font-medium text-gray-500">Actions</span>
          </div>
          <div className="divide-y divide-gray-100">
            {authors.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-[56px_1fr_1fr_90px_90px] items-center gap-4 px-4 py-3 transition-colors hover:bg-[#FAF8F3]"
              >
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                  {a.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.avatar_url}
                      alt={a.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <span className="truncate text-sm font-medium text-gray-900">
                  {a.name}
                </span>
                <span className="truncate text-sm text-gray-600">
                  {a.role ?? <span className="text-gray-400">—</span>}
                </span>
                <span className="text-sm text-gray-600">{a.postCount}</span>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(a)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(a)}
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
        <AuthorModal
          key={editing === "new" ? "new" : editing.id}
          author={editing === "new" ? null : editing}
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
        title="Delete author"
        message={
          deleting && deleting.postCount > 0
            ? `"${deleting.name}" has ${deleting.postCount} post(s). Reassign or delete their posts first.`
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

function AuthorModal({
  author,
  onClose,
  onSaved,
}: {
  author: AdminAuthorRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const isNew = !author;
  const [name, setName] = useState(author?.name ?? "");
  const [slug, setSlug] = useState(author?.slug ?? "");
  const [role, setRole] = useState(author?.role ?? "");
  const [bio, setBio] = useState(author?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(author?.avatar_url ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || null,
        role: role.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      };
      const res = isNew
        ? await createBlogAuthor(payload)
        : await updateBlogAuthor(author.id, payload);
      if (!res.success) {
        setError(res.error ?? "Failed to save.");
        return;
      }
      toast.success(isNew ? "Author created." : "Author saved.");
      onSaved();
    });
  };

  // Avatar upload persists immediately via updateBlogAuthor, since the field
  // only works once the author exists (needs an id for the storage path).
  const handleAvatarUploaded = async (url: string) => {
    setAvatarUrl(url);
    if (author) {
      const res = await updateBlogAuthor(author.id, { avatar_url: url });
      if (!res.success) {
        toast.error(res.error ?? "Couldn't save avatar.");
        return;
      }
      toast.success("Avatar updated.");
      router.refresh();
    }
  };

  return (
    <AdminModal
      isOpen
      onClose={onClose}
      title={isNew ? "New author" : "Edit author"}
      size="lg"
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

        <div className="flex gap-5">
          <div className="shrink-0">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Avatar
            </span>
            <BlogImageField
              value={avatarUrl}
              entityType="authors"
              entityId={author?.id ?? null}
              fileType="avatar"
              shape="square"
              onUploaded={handleAvatarUploaded}
              disabledHint="Save the author first to upload an avatar."
            />
          </div>

          <div className="flex-1 space-y-4">
            <AdminFormField label="Name" name="author-name" required>
              <AdminInput
                id="author-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
              />
            </AdminFormField>
            <AdminFormField
              label="Slug"
              name="author-slug"
              hint="Lowercase letters, numbers, hyphens."
            >
              <AdminInput
                id="author-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto from name"
              />
            </AdminFormField>
            <AdminFormField label="Role" name="author-role">
              <AdminInput
                id="author-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                maxLength={200}
                placeholder="e.g. Founder, Language coach"
              />
            </AdminFormField>
          </div>
        </div>

        <AdminFormField label="Bio" name="author-bio">
          <AdminTextarea
            id="author-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={2000}
            rows={4}
          />
        </AdminFormField>
      </div>
    </AdminModal>
  );
}
