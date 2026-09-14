import Link from "next/link";
import type { BlogPostCard } from "@/lib/queries/blog";
import { Byline } from "./Byline";
import { LanguageTag } from "./LanguageTag";

/**
 * Hero card for the featured post — the same bordered/press-into-shadow card as
 * PostCard, but full width with a two-column split (cover left, copy right) on
 * desktop. Stacks to a single column on mobile.
 */
export function FeaturedCard({ post }: { post: BlogPostCard }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="grid grid-cols-1 items-stretch gap-6 rounded-[30px] border-[3px] border-[var(--ink)] bg-white p-6 !no-underline shadow-[6px_6px_0_var(--ink)] transition duration-[80ms] ease-out will-change-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_var(--ink)] md:grid-cols-2 md:p-8"
    >
      {post.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_image_url}
          alt=""
          className="h-[220px] w-full rounded-[16px] border-2 border-[var(--ink)] object-cover md:h-full md:min-h-[360px]"
        />
      ) : (
        <div
          className="h-[220px] w-full rounded-[16px] bg-[var(--tan)] md:h-full md:min-h-[360px]"
          aria-hidden
        />
      )}

      <div className="flex flex-col items-start gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <LanguageTag language={post.language} />
          {post.language && (
            <span aria-hidden className="text-[var(--grey-2)]">·</span>
          )}
          <p className="eyebrow">
            New{post.category ? ` · ${post.category.name}` : ""}
          </p>
        </div>
        <h2 className="heading-l text-[var(--ink)]">{post.title}</h2>
        {post.excerpt && (
          <p className="text-[16px] leading-[1.6] text-[var(--ink-soft)]">
            {post.excerpt}
          </p>
        )}
        <div className="mt-auto pt-2">
          <Byline author={post.author} publishedAt={post.published_at} />
        </div>
      </div>
    </Link>
  );
}
