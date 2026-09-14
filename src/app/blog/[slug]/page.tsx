import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getPostBySlug, getRelatedPosts } from "@/lib/queries/blog";
import { Byline } from "../_components/Byline";
import { BlogProse } from "../_components/BlogProse";
import { AuthorBio } from "../_components/AuthorBio";
import { AppCta } from "../_components/AppCta";
import { PostCard } from "../_components/PostCard";
import { LanguageTag } from "../_components/LanguageTag";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found" };

  const description = post.excerpt ?? undefined;
  return {
    title: `${post.title} — 200 Words a Day`,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: `/blog/${post.slug}`,
      ...(post.cover_image_url ? { images: [{ url: post.cover_image_url }] } : {}),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const related = await getRelatedPosts(
    { id: post.id, categoryId: post.categoryId, languageId: post.languageId },
    3
  );

  return (
    <article className="container pb-14 pt-16 sm:pb-20">
      {/* Sidebar back-nav sits in the left gutter, aligned to the top of the card
          on desktop; on smaller screens it stacks above the card. */}
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,820px)_1fr] lg:gap-8">
        <aside className="lg:self-start">
          <Link
            href="/blog"
            className="label-heavy inline-flex items-center gap-1 rounded-full px-3 py-2 text-black/[0.67] !no-underline transition-colors hover:bg-[var(--tan)] hover:text-black"
          >
            <ChevronLeft className="h-4 w-4" />
            All posts
          </Link>
        </aside>

        {/* The whole article sits in one white brand card. */}
        <div className="card p-6 sm:p-10 lg:p-12">
          {/* Header */}
        <div className="flex flex-col gap-5">
          {(post.category || post.language) && (
            <div className="flex flex-wrap items-center gap-2">
              <LanguageTag language={post.language} />
              {post.language && post.category && (
                <span aria-hidden className="text-[var(--grey-2)]">·</span>
              )}
              {post.category && <p className="eyebrow">{post.category.name}</p>}
            </div>
          )}
          <h1 className="heading-xl text-[var(--ink)]">{post.title}</h1>
          {post.excerpt && (
            <p className="text-[18px] leading-[1.6] text-[var(--ink-soft)]">{post.excerpt}</p>
          )}
          <Byline
            author={post.author}
            publishedAt={post.published_at}
            readingMinutes={post.readingMinutes}
            linkAuthor
          />
        </div>

        {/* Cover — full card width between header and body. Falls back to a tan
            panel when the post has no cover image. */}
        {post.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-[20px] border-[3px] border-[var(--ink)] object-cover"
          />
        ) : (
          <div
            className="mt-8 aspect-[16/9] w-full rounded-[20px] bg-[var(--tan)]"
            aria-hidden
          />
        )}

        {/* Body */}
        {post.body && (
          <div className="mt-10">
            <BlogProse body={post.body} />
          </div>
        )}

        {/* Author bio, then the app CTA — both inside the article card. */}
        <AuthorBio author={post.author} />
        <AppCta />
        </div>

        {/* Right filler — balances the left back-nav so the card stays centred. */}
        <div aria-hidden className="hidden lg:block" />
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="heading-m !text-[var(--ink)]">Keep reading</h2>
          <div className="mt-8 grid grid-cols-1 items-stretch gap-[30px] md:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <PostCard key={r.id} post={r} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
