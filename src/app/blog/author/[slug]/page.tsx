import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAuthorBySlug, parsePage } from "@/lib/queries/blog";
import { AuthorHeader } from "../../_components/AuthorHeader";
import { PostCard } from "../../_components/PostCard";
import { Pagination } from "../../_components/Pagination";

/** Author archive URL, omitting `page` for the first page. */
function authorHref(slug: string, page: number): string {
  return page > 1 ? `/blog/author/${slug}?page=${page}` : `/blog/author/${slug}`;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await searchParams;
  const data = await getAuthorBySlug(slug, { page: parsePage(page) });
  if (!data) return { title: "Author not found" };

  const { author } = data;
  return {
    title: `${author.name} — 200 Words a Day`,
    description: author.bio ?? undefined,
    alternates: { canonical: authorHref(author.slug, data.page) },
    robots: { index: true, follow: true },
  };
}

export default async function BlogAuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page } = await searchParams;
  const currentPage = parsePage(page);
  const data = await getAuthorBySlug(slug, { page: currentPage });
  if (!data) notFound();

  const { author, posts, totalPages, totalPosts } = data;

  // Out-of-range pages 404 rather than render an empty archive (see index page).
  if (currentPage > totalPages && totalPosts > 0) notFound();

  return (
    <div className="container pb-14 pt-16 sm:pb-20">
      <Link
        href="/blog"
        className="label-heavy inline-flex items-center gap-1 rounded-full px-3 py-2 text-black/[0.67] !no-underline transition-colors hover:bg-[var(--tan)] hover:text-black"
      >
        <ChevronLeft className="h-4 w-4" />
        All posts
      </Link>

      <div className="mt-6">
        <AuthorHeader author={author} />
      </div>

      {posts.length > 0 ? (
        <div className="mt-12 grid grid-cols-1 items-stretch gap-[30px] md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p className="mt-12 text-[16px] text-[var(--ink-soft)]">
          No published posts yet.
        </p>
      )}

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        buildHref={(p) => authorHref(author.slug, p)}
      />
    </div>
  );
}
