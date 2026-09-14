import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAuthorBySlug } from "@/lib/queries/blog";
import { AuthorHeader } from "../../_components/AuthorHeader";
import { PostCard } from "../../_components/PostCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getAuthorBySlug(slug);
  if (!data) return { title: "Author not found" };

  const { author } = data;
  return {
    title: `${author.name} — 200 Words a Day`,
    description: author.bio ?? undefined,
    alternates: { canonical: `/blog/author/${author.slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function BlogAuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getAuthorBySlug(slug);
  if (!data) notFound();

  const { author, posts } = data;

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
    </div>
  );
}
