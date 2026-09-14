"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AdminFormField,
  AdminInput,
  AdminTextarea,
  AdminSelect,
} from "@/components/admin/AdminFormField";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { toast } from "@/lib/toast";
import { slugify } from "@/lib/utils/slugify";
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from "@/lib/mutations/admin/blog";
import { BlogImageField } from "./BlogImageField";
import type { BlogPost } from "@/types/database";
import type { BlogEditorRefs } from "@/lib/queries/admin/blog";

interface PostEditorProps {
  /** Null when creating a new post. */
  post: BlogPost | null;
  refs: BlogEditorRefs;
}

// Convert an ISO timestamp into the value a datetime-local input expects.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function PostEditor({ post, refs }: PostEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The post id drives cover upload + switches from create to update on save.
  const [postId, setPostId] = useState<string | null>(post?.id ?? null);

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [coverUrl, setCoverUrl] = useState<string | null>(post?.cover_image_url ?? null);
  const [authorId, setAuthorId] = useState(post?.author_id ?? "");
  const [categoryId, setCategoryId] = useState(post?.category_id ?? "");
  const [languageId, setLanguageId] = useState(post?.language_id ?? "");
  const [isPublished, setIsPublished] = useState(post?.is_published ?? false);
  const [isFeatured, setIsFeatured] = useState(post?.is_featured ?? false);
  const [publishedAt, setPublishedAt] = useState(toLocalInput(post?.published_at ?? null));
  const [error, setError] = useState<string | null>(null);

  const isNew = !postId;

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const buildPayload = () => ({
    title: title.trim(),
    slug: slug.trim() || null,
    excerpt: excerpt.trim() || null,
    body: body.trim() || null,
    cover_image_url: coverUrl,
    author_id: authorId,
    category_id: categoryId || null,
    language_id: languageId || null,
    is_published: isPublished,
    is_featured: isFeatured,
    published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
  });

  const handleSave = () => {
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!authorId) {
      setError("Please choose an author.");
      return;
    }

    startTransition(async () => {
      if (postId) {
        const res = await updateBlogPost(postId, buildPayload());
        if (!res.success) {
          setError(res.error ?? "Failed to save.");
          return;
        }
        toast.success("Post saved.");
        router.refresh();
      } else {
        // Draft-first: create, then swap the URL to the edit route so the
        // cover upload (which needs an id) becomes available.
        const res = await createBlogPost(buildPayload());
        if (!res.success || !res.id) {
          setError(res.error ?? "Failed to create post.");
          return;
        }
        setPostId(res.id);
        toast.success("Draft saved. You can now upload a cover image.");
        router.replace(`/admin/blog/${res.id}`);
      }
    });
  };

  const handleDelete = () => {
    if (!postId) return;
    startTransition(async () => {
      const res = await deleteBlogPost(postId);
      if (!res.success) {
        toast.error(res.error ?? "Couldn't delete post.");
        return;
      }
      toast.success("Post deleted.");
      router.push("/admin/blog");
    });
  };

  return (
    <div>
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/blog"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blog
        </Link>
        <div className="flex items-center gap-3">
          {!isNew && (
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={pending}>
            {pending ? "Saving…" : isNew ? "Save draft" : "Save"}
          </Button>
        </div>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {isNew ? "New post" : "Edit post"}
      </h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-5">
          <AdminFormField label="Title" name="post-title" required>
            <AdminInput
              id="post-title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              maxLength={200}
              placeholder="Post title"
            />
          </AdminFormField>

          <AdminFormField
            label="Slug"
            name="post-slug"
            hint="Auto-filled from the title; edit to override."
          >
            <AdminInput
              id="post-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="auto from title"
            />
          </AdminFormField>

          <AdminFormField
            label="Excerpt"
            name="post-excerpt"
            hint="Short summary shown on cards and previews."
          >
            <AdminTextarea
              id="post-excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </AdminFormField>

          <AdminFormField label="Body" name="post-body">
            <MarkdownEditor value={body} onChange={setBody} rows={20} />
          </AdminFormField>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              Cover image
            </span>
            <BlogImageField
              value={coverUrl}
              entityType="posts"
              entityId={postId}
              fileType="cover"
              shape="wide"
              onUploaded={async (url) => {
                setCoverUrl(url);
                if (postId) {
                  const res = await updateBlogPost(postId, { cover_image_url: url });
                  if (!res.success) {
                    toast.error(res.error ?? "Couldn't save cover.");
                    return;
                  }
                  toast.success("Cover updated.");
                }
              }}
              disabledHint="Save the draft first to upload a cover."
            />
          </div>

          <AdminFormField label="Author" name="post-author" required>
            <AdminSelect
              id="post-author"
              value={authorId}
              onChange={(e) => setAuthorId(e.target.value)}
              placeholder="Choose an author"
              options={refs.authors.map((a) => ({ value: a.id, label: a.name }))}
            />
          </AdminFormField>

          <AdminFormField label="Category" name="post-category">
            <AdminSelect
              id="post-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[
                { value: "", label: "None" },
                ...refs.categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </AdminFormField>

          <AdminFormField label="Language" name="post-language">
            <AdminSelect
              id="post-language"
              value={languageId}
              onChange={(e) => setLanguageId(e.target.value)}
              options={[
                { value: "", label: "None" },
                ...refs.languages.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
          </AdminFormField>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5">
            <div>
              <span className="block text-sm font-medium text-gray-900">Published</span>
              <span className="block text-xs text-gray-500">Visible on /blog</span>
            </div>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5">
            <div>
              <span className="block text-sm font-medium text-gray-900">Featured</span>
              <span className="block text-xs text-gray-500">
                Single hero post on the index
              </span>
            </div>
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
          </div>

          <AdminFormField
            label="Published date"
            name="post-published-at"
            hint="Leave blank to stamp automatically on first publish."
          >
            <AdminInput
              id="post-published-at"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
          </AdminFormField>
        </aside>
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete post"
        message={`Delete "${title || "this post"}"? This can't be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={pending}
      />
    </div>
  );
}
