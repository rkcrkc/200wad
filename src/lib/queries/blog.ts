import { createClient } from "@/lib/supabase/server";
import type { BlogAuthor } from "@/types/database";

// ── Shared view models ───────────────────────────────────────────────────────
// The DB rows are projected into these lean shapes for the UI. Embedded
// author/category/language are many-to-one, so Supabase returns them as single
// objects (or null when the FK is null).

export interface BlogAuthorRef {
  name: string;
  slug: string;
  avatar_url: string | null;
}
export interface BlogCategoryRef {
  name: string;
  slug: string;
}
export interface BlogLanguageRef {
  name: string;
  code: string;
}

/** Card shape for the index grid, related posts, and author pages. No body. */
export interface BlogPostCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  author: BlogAuthorRef | null;
  category: BlogCategoryRef | null;
  language: BlogLanguageRef | null;
}

/** Full article shape for `/blog/[slug]`. */
export interface BlogPostDetail extends BlogPostCard {
  body: string | null;
  readingMinutes: number;
  categoryId: string | null;
  languageId: string | null;
  author: (BlogAuthorRef & { role: string | null; bio: string | null }) | null;
}

export interface BlogFilters {
  categories: BlogCategoryRef[];
  languages: BlogLanguageRef[];
}

export interface BlogIndexData {
  featured: BlogPostCard | null;
  posts: BlogPostCard[];
  /** Newest posts in the "product" category — powers the index sidebar list. */
  productUpdates: BlogPostCard[];
  filters: BlogFilters;
  activeCategory: string | null;
  activeLang: string | null;
}

/** Category slug whose posts surface in the "Product updates" sidebar. */
export const PRODUCT_CATEGORY_SLUG = "product";
/** Max rows shown in the "Product updates" sidebar list. */
const PRODUCT_UPDATES_LIMIT = 5;

export interface BlogAuthorPage {
  author: BlogAuthor;
  posts: BlogPostCard[];
}

// ── Selects ──────────────────────────────────────────────────────────────────
const CARD_SELECT =
  "id, slug, title, excerpt, cover_image_url, published_at, " +
  "author:blog_authors(name, slug, avatar_url), " +
  "category:blog_categories(name, slug), " +
  "language:languages(name, code)";

const DETAIL_SELECT =
  "id, slug, title, excerpt, body, cover_image_url, published_at, category_id, language_id, " +
  "author:blog_authors(name, slug, avatar_url, role, bio), " +
  "category:blog_categories(name, slug), " +
  "language:languages(name, code)";

// Loose row shapes for casting the embedded joins (mirrors the tips.ts pattern).
type RawCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  author: BlogAuthorRef | null;
  category: BlogCategoryRef | null;
  language: BlogLanguageRef | null;
};
type RawDetail = RawCard & {
  body: string | null;
  category_id: string | null;
  language_id: string | null;
  author: (BlogAuthorRef & { role: string | null; bio: string | null }) | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
/** Estimated reading time from body word count (~200 wpm), floored at 1 min. */
export function readingMinutes(body: string | null): number {
  if (!body) return 1;
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function toCard(row: RawCard): BlogPostCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    cover_image_url: row.cover_image_url,
    published_at: row.published_at,
    author: row.author,
    category: row.category,
    language: row.language,
  };
}

function toCards(data: unknown): BlogPostCard[] {
  return ((data as RawCard[] | null) ?? []).map(toCard);
}

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Categories and languages that have at least one published post — powers the
 * index FilterBar so we never offer an empty filter. RLS already limits the
 * posts scan to published rows.
 */
export async function getBlogFilters(): Promise<BlogFilters> {
  const supabase = await createClient();

  const { data } = await supabase.from("blog_posts").select("category_id, language_id");
  const rows = (data as { category_id: string | null; language_id: string | null }[] | null) ?? [];

  const categoryIds = [...new Set(rows.map((r) => r.category_id).filter(Boolean))] as string[];
  const languageIds = [...new Set(rows.map((r) => r.language_id).filter(Boolean))] as string[];

  const [categoriesRes, languagesRes] = await Promise.all([
    categoryIds.length
      ? supabase.from("blog_categories").select("name, slug").in("id", categoryIds).order("sort_order")
      : Promise.resolve({ data: [] }),
    languageIds.length
      ? supabase.from("languages").select("name, code").in("id", languageIds).order("name")
      : Promise.resolve({ data: [] }),
  ]);

  return {
    categories: (categoriesRes.data as BlogCategoryRef[] | null) ?? [],
    languages: (languagesRes.data as BlogLanguageRef[] | null) ?? [],
  };
}

/**
 * Index data: the filter options, the (optional) featured post, and the post
 * grid. A featured post is only surfaced when no filter is active, so filtered
 * results read as a clean grid. Unknown category/lang params yield an empty grid.
 */
export async function getBlogIndex({
  category,
  lang,
}: {
  category?: string;
  lang?: string;
}): Promise<BlogIndexData> {
  const supabase = await createClient();
  const filters = await getBlogFilters();

  const activeCategory = category ?? null;
  const activeLang = lang ?? null;
  const filterActive = Boolean(activeCategory || activeLang);
  const empty = (): BlogIndexData => ({
    featured: null,
    posts: [],
    productUpdates: [],
    filters,
    activeCategory,
    activeLang,
  });

  let postsQuery = supabase.from("blog_posts").select(CARD_SELECT).eq("is_published", true);

  if (activeCategory) {
    const { data: cat } = await supabase
      .from("blog_categories")
      .select("id")
      .eq("slug", activeCategory)
      .maybeSingle();
    if (!cat) return empty();
    postsQuery = postsQuery.eq("category_id", cat.id);
  }
  if (activeLang) {
    const { data: language } = await supabase
      .from("languages")
      .select("id")
      .eq("code", activeLang)
      .maybeSingle();
    if (!language) return empty();
    postsQuery = postsQuery.eq("language_id", language.id);
  }

  const { data } = await postsQuery.order("published_at", { ascending: false });
  const all = toCards(data);

  let featured: BlogPostCard | null = null;
  let posts = all;
  let productUpdates: BlogPostCard[] = [];

  if (!filterActive) {
    const { data: featData } = await supabase
      .from("blog_posts")
      .select(CARD_SELECT)
      .eq("is_published", true)
      .eq("is_featured", true)
      .order("published_at", { ascending: false })
      .limit(1);
    featured = toCards(featData)[0] ?? null;

    const featuredId = featured?.id ?? null;
    // Product posts surface in their own sidebar list, so keep them out of the
    // featured slot and the main editorial grid to avoid duplication.
    productUpdates = all
      .filter((p) => p.category?.slug === PRODUCT_CATEGORY_SLUG && p.id !== featuredId)
      .slice(0, PRODUCT_UPDATES_LIMIT);
    posts = all.filter(
      (p) => p.id !== featuredId && p.category?.slug !== PRODUCT_CATEGORY_SLUG
    );
  }

  return { featured, posts, productUpdates, filters, activeCategory, activeLang };
}

/** Full article by slug. Returns null for unknown or unpublished slugs (→ 404). */
export async function getPostBySlug(slug: string): Promise<BlogPostDetail | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("blog_posts")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as RawDetail;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    cover_image_url: row.cover_image_url,
    published_at: row.published_at,
    readingMinutes: readingMinutes(row.body),
    categoryId: row.category_id,
    languageId: row.language_id,
    author: row.author,
    category: row.category,
    language: row.language,
  };
}

/**
 * Up to `limit` published posts sharing the post's category or language
 * (self excluded). Falls back to the newest posts when there are no matches.
 */
export async function getRelatedPosts(
  post: { id: string; categoryId: string | null; languageId: string | null },
  limit = 3
): Promise<BlogPostCard[]> {
  const supabase = await createClient();

  const orParts: string[] = [];
  if (post.categoryId) orParts.push(`category_id.eq.${post.categoryId}`);
  if (post.languageId) orParts.push(`language_id.eq.${post.languageId}`);

  if (orParts.length > 0) {
    const { data } = await supabase
      .from("blog_posts")
      .select(CARD_SELECT)
      .eq("is_published", true)
      .neq("id", post.id)
      .or(orParts.join(","))
      .order("published_at", { ascending: false })
      .limit(limit);
    const related = toCards(data);
    if (related.length > 0) return related;
  }

  // Fallback: newest posts other than the current one.
  const { data } = await supabase
    .from("blog_posts")
    .select(CARD_SELECT)
    .eq("is_published", true)
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(limit);
  return toCards(data);
}

/** Author profile + their published posts. Returns null for unknown slugs (→ 404). */
export async function getAuthorBySlug(slug: string): Promise<BlogAuthorPage | null> {
  const supabase = await createClient();

  const { data: author } = await supabase
    .from("blog_authors")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!author) return null;

  const { data } = await supabase
    .from("blog_posts")
    .select(CARD_SELECT)
    .eq("is_published", true)
    .eq("author_id", author.id)
    .order("published_at", { ascending: false });

  return { author: author as BlogAuthor, posts: toCards(data) };
}
