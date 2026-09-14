import Link from "next/link";
import type { BlogPostCard } from "@/lib/queries/blog";
import { Byline } from "./Byline";
import { LanguageTag } from "./LanguageTag";

/**
 * Grid card for one post. Reuses the landing blog card visual (bordered white card
 * that presses into its shadow on hover). Cover image falls back to a tan panel;
 * title/excerpt clamp so uneven copy lengths keep the grid tidy.
 */
export function PostCard({ post }: { post: BlogPostCard }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="flex flex-col items-start gap-4 rounded-[30px] border-[3px] border-[var(--ink)] bg-white p-6 !no-underline shadow-[5px_5px_0_var(--ink)] transition duration-[80ms] ease-out will-change-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_var(--ink)]"
    >
      {post.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_image_url}
          alt=""
          className="h-[148px] w-full rounded-[10px] border-2 border-[var(--ink)] object-cover"
        />
      ) : (
        <div className="h-[148px] w-full rounded-[10px] bg-[var(--tan)]" aria-hidden />
      )}

      {(post.category || post.language) && (
        <div className="flex flex-wrap items-center gap-2">
          <LanguageTag language={post.language} />
          {post.language && post.category && (
            <span aria-hidden className="text-[var(--grey-2)]">·</span>
          )}
          {post.category && <p className="eyebrow">{post.category.name}</p>}
        </div>
      )}

      <h3 className="heading-s line-clamp-2 text-[var(--ink)]">{post.title}</h3>

      {post.excerpt && (
        <p className="line-clamp-3 text-[15px] leading-[1.6] text-[var(--ink-soft)]">
          {post.excerpt}
        </p>
      )}

      <div className="mt-auto pt-2">
        <Byline author={post.author} publishedAt={post.published_at} />
      </div>
    </Link>
  );
}
