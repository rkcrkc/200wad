import { createClient } from "@/lib/supabase/server";
import type { BlogPost } from "@/types/database";

// These run under the admin read-all RLS policy, so they see drafts too.

export interface AdminBlogPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  author: { name: string } | null;
  category: { name: string } | null;
  language: { name: string; code: string } | null;
}

export interface AdminAuthorRow {
  id: string;
  name: string;
  slug: string;
  role: string | null;
  avatar_url: string | null;
  bio: string | null;
  postCount: number;
}

export interface AdminCategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  postCount: number;
}

export interface BlogEditorRefs {
  authors: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  languages: { id: string; name: string; code: string }[];
}

const ADMIN_LIST_SELECT =
  "id, slug, title, excerpt, cover_image_url, is_published, is_featured, published_at, created_at, " +
  "author:blog_authors(name), " +
  "category:blog_categories(name), " +
  "language:languages(name, code)";

/** All posts (incl. drafts), newest-first with published posts ahead of drafts. */
export async function getAdminBlogPosts(): Promise<AdminBlogPostRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(ADMIN_LIST_SELECT)
    .order("published_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAdminBlogPosts error:", error);
    return [];
  }

  return (data as unknown as AdminBlogPostRow[] | null) ?? [];
}

/** Full row for the editor. Returns null for unknown ids. */
export async function getAdminBlogPost(id: string): Promise<BlogPost | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getAdminBlogPost error:", error);
    return null;
  }

  return (data as BlogPost | null) ?? null;
}

/** Authors with a post count, alphabetical. */
export async function getAdminAuthors(): Promise<AdminAuthorRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blog_authors")
    .select("id, name, slug, role, avatar_url, bio, posts:blog_posts(count)")
    .order("name", { ascending: true });

  if (error) {
    console.error("getAdminAuthors error:", error);
    return [];
  }

  type Raw = Omit<AdminAuthorRow, "postCount"> & {
    posts: { count: number }[] | null;
  };

  return ((data as unknown as Raw[] | null) ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    role: a.role,
    avatar_url: a.avatar_url,
    bio: a.bio,
    postCount: a.posts?.[0]?.count ?? 0,
  }));
}

/** Categories with a post count, by sort order then name. */
export async function getAdminCategories(): Promise<AdminCategoryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blog_categories")
    .select("id, name, slug, sort_order, posts:blog_posts(count)")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("getAdminCategories error:", error);
    return [];
  }

  type Raw = Omit<AdminCategoryRow, "postCount"> & {
    posts: { count: number }[] | null;
  };

  return ((data as unknown as Raw[] | null) ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    sort_order: c.sort_order,
    postCount: c.posts?.[0]?.count ?? 0,
  }));
}

/** Dropdown options for the post editor selects. */
export async function getBlogEditorRefs(): Promise<BlogEditorRefs> {
  const supabase = await createClient();

  const [authorsRes, categoriesRes, languagesRes] = await Promise.all([
    supabase.from("blog_authors").select("id, name").order("name"),
    supabase.from("blog_categories").select("id, name").order("sort_order").order("name"),
    supabase.from("languages").select("id, name, code").order("name"),
  ]);

  return {
    authors: (authorsRes.data as { id: string; name: string }[] | null) ?? [],
    categories: (categoriesRes.data as { id: string; name: string }[] | null) ?? [],
    languages:
      (languagesRes.data as { id: string; name: string; code: string }[] | null) ?? [],
  };
}
