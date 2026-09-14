"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { toast } from "@/lib/toast";
import {
  setBlogPostPublished,
  setBlogPostFeatured,
  deleteBlogPost,
} from "@/lib/mutations/admin/blog";
import type { AdminBlogPostRow } from "@/lib/queries/admin/blog";
import { cn } from "@/lib/utils";

interface PostsTabProps {
  posts: AdminBlogPostRow[];
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PostsTab({ posts }: PostsTabProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<AdminBlogPostRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handlePublish = async (post: AdminBlogPostRow, next: boolean) => {
    setBusyId(post.id);
    const res = await setBlogPostPublished(post.id, next);
    setBusyId(null);
    if (!res.success) {
      toast.error(res.error ?? "Couldn't update publish state.");
      return;
    }
    toast.success(next ? "Published." : "Moved to draft.");
    router.refresh();
  };

  const handleFeature = async (post: AdminBlogPostRow) => {
    const next = !post.is_featured;
    setBusyId(post.id);
    const res = await setBlogPostFeatured(post.id, next);
    setBusyId(null);
    if (!res.success) {
      toast.error(res.error ?? "Couldn't update featured state.");
      return;
    }
    toast.success(next ? "Set as featured post." : "Removed from featured.");
    router.refresh();
  };

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const res = await deleteBlogPost(target.id);
      if (!res.success) {
        toast.error(res.error ?? "Couldn't delete post.");
        return;
      }
      toast.success("Post deleted.");
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button asChild>
          <Link href="/admin/blog/new">
            <Plus className="h-4 w-4" />
            New Post
          </Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <p className="text-sm text-gray-500">No posts yet.</p>
          <Button asChild className="mt-4">
            <Link href="/admin/blog/new">
              <Plus className="h-4 w-4" />
              Create your first post
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_140px_120px_90px_110px_110px_90px] items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-xs font-medium text-gray-500">Title</span>
            <span className="text-xs font-medium text-gray-500">Author</span>
            <span className="text-xs font-medium text-gray-500">Category</span>
            <span className="text-xs font-medium text-gray-500">Lang</span>
            <span className="text-xs font-medium text-gray-500">Status</span>
            <span className="text-xs font-medium text-gray-500">Published</span>
            <span className="text-right text-xs font-medium text-gray-500">Actions</span>
          </div>

          <div className="divide-y divide-gray-100">
            {posts.map((post) => {
              const isBusy = busyId === post.id;
              return (
                <div
                  key={post.id}
                  className="grid grid-cols-[1fr_140px_120px_90px_110px_110px_90px] items-center gap-4 px-4 py-3 transition-colors hover:bg-[#FAF8F3]"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/blog/${post.id}`}
                      className="block truncate text-sm font-medium text-gray-900 hover:text-primary"
                      title={post.title}
                    >
                      {post.title}
                    </Link>
                    <span className="block truncate text-xs text-gray-400">
                      /{post.slug}
                    </span>
                  </div>

                  <span className="truncate text-sm text-gray-600">
                    {post.author?.name ?? "—"}
                  </span>

                  <span className="truncate text-sm text-gray-600">
                    {post.category?.name ?? (
                      <span className="text-gray-400">None</span>
                    )}
                  </span>

                  <span className="text-sm text-gray-600">
                    {post.language ? (
                      <span className="uppercase">{post.language.code}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </span>

                  <AdminStatusBadge isPublished={post.is_published} />

                  <span className="text-sm text-gray-600">
                    {formatDate(post.published_at)}
                  </span>

                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleFeature(post)}
                      title={post.is_featured ? "Featured post" : "Set as featured"}
                      className={cn(
                        "rounded-lg p-1.5 transition-colors hover:bg-gray-100 disabled:opacity-50",
                        post.is_featured
                          ? "text-amber-500"
                          : "text-gray-300 hover:text-gray-500"
                      )}
                    >
                      <Star
                        className="h-4 w-4"
                        fill={post.is_featured ? "currentColor" : "none"}
                      />
                    </button>

                    <div title={post.is_published ? "Published" : "Draft"}>
                      <Switch
                        checked={post.is_published}
                        disabled={isBusy}
                        onCheckedChange={(v) => handlePublish(post, v)}
                      />
                    </div>

                    <Link
                      href={`/admin/blog/${post.id}`}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => setDeleting(post)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete post"
        message={`Delete "${deleting?.title}"? This can't be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={pending}
      />
    </>
  );
}
