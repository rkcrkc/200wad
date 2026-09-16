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
  /** 1-based current page of the main grid. */
  page: number;
  /** Total pages for the current filter set (min 1). */
  totalPages: number;
  /** Total grid posts across all pages (excludes featured + product on page 1). */
  totalPosts: number;
}

/** Category slug whose posts surface in the "Product updates" sidebar. */
export const PRODUCT_CATEGORY_SLUG = "product";
/** Max rows shown in the "Product updates" sidebar list. */
const PRODUCT_UPDATES_LIMIT = 5;
/** Posts per page in the main index grid and author archives. */
export const PAGE_SIZE = 12;

/** Coerce a raw `?page=` value to a 1-based positive int; anything invalid → 1. */
export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export interface BlogAuthorPage {
  author: BlogAuthor;
  posts: BlogPostCard[];
  page: number;
  totalPages: number;
  totalPosts: number;
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
  page: rawPage = 1,
}: {
  category?: string;
  lang?: string;
  page?: number;
}): Promise<BlogIndexData> {
  const supabase = await createClient();
  const filters = await getBlogFilters();

  const activeCategory = category ?? null;
  const activeLang = lang ?? null;
  const filterActive = Boolean(activeCategory || activeLang);
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const empty = (): BlogIndexData => ({
    featured: null,
    posts: [],
    productUpdates: [],
    filters,
    activeCategory,
    activeLang,
    page,
    totalPages: 1,
    totalPosts: 0,
  });

  // Resolve filter slugs → ids up front; an unknown slug/code yields an empty grid.
  let categoryId: string | null = null;
  if (activeCategory) {
    const { data: cat } = await supabase
      .from("blog_categories")
      .select("id")
      .eq("slug", activeCategory)
      .maybeSingle();
    if (!cat) return empty();
    categoryId = cat.id;
  }
  let languageId: string | null = null;
  if (activeLang) {
    const { data: language } = await supabase
      .from("languages")
      .select("id")
      .eq("code", activeLang)
      .maybeSingle();
    if (!language) return empty();
    languageId = language.id;
  }

  // Featured post + "Product updates" only exist on the unfiltered index. They are
  // fetched first so the grid query can exclude them (on every page) and keep its
  // range/count correct; they are only *returned* for page 1.
  let featured: BlogPostCard | null = null;
  let productUpdates: BlogPostCard[] = [];
  let productCategoryId: string | null = null;

  if (!filterActive) {
    const { data: featData } = await supabase
      .from("blog_posts")
      .select(CARD_SELECT)
      .eq("is_published", true)
      .eq("is_featured", true)
      .order("published_at", { ascending: false })
      .limit(1);
    featured = toCards(featData)[0] ?? null;

    const { data: prodCat } = await supabase
      .from("blog_categories")
      .select("id")
      .eq("slug", PRODUCT_CATEGORY_SLUG)
      .maybeSingle();
    productCategoryId = prodCat?.id ?? null;

    if (page === 1 && productCategoryId) {
      const { data: puData } = await supabase
        .from("blog_posts")
        .select(CARD_SELECT)
        .eq("is_published", true)
        .eq("category_id", productCategoryId)
        .order("published_at", { ascending: false })
        .limit(PRODUCT_UPDATES_LIMIT + 1); // +1 headroom to drop the featured post
      productUpdates = toCards(puData)
        .filter((p) => p.id !== featured?.id)
        .slice(0, PRODUCT_UPDATES_LIMIT);
    }
  }

  // Main editorial grid — paginated at the DB with an exact count. When unfiltered
  // it excludes the featured post and the product category (they have their own slots).
  let gridQuery = supabase
    .from("blog_posts")
    .select(CARD_SELECT, { count: "exact" })
    .eq("is_published", true);
  if (categoryId) gridQuery = gridQuery.eq("category_id", categoryId);
  if (languageId) gridQuery = gridQuery.eq("language_id", languageId);
  if (!filterActive) {
    if (featured) gridQuery = gridQuery.neq("id", featured.id);
    if (productCategoryId) gridQuery = gridQuery.neq("category_id", productCategoryId);
  }

  const { data, count } = await gridQuery
    .order("published_at", { ascending: false })
    .range(from, to);

  const totalPosts = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));

  return {
    featured: page === 1 ? featured : null,
    posts: toCards(data),
    productUpdates: page === 1 ? productUpdates : [],
    filters,
    activeCategory,
    activeLang,
    page,
    totalPages,
    totalPosts,
  };
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

/** Author profile + their published posts (paginated). Returns null for unknown slugs (→ 404). */
export async function getAuthorBySlug(
  slug: string,
  { page: rawPage = 1 }: { page?: number } = {}
): Promise<BlogAuthorPage | null> {
  const supabase = await createClient();

  const { data: author } = await supabase
    .from("blog_authors")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!author) return null;

  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count } = await supabase
    .from("blog_posts")
    .select(CARD_SELECT, { count: "exact" })
    .eq("is_published", true)
    .eq("author_id", author.id)
    .order("published_at", { ascending: false })
    .range(from, to);

  const totalPosts = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));

  return { author: author as BlogAuthor, posts: toCards(data), page, totalPages, totalPosts };
}
