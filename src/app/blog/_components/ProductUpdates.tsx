import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BlogPostCard } from "@/lib/queries/blog";
import { PRODUCT_CATEGORY_SLUG } from "@/lib/queries/blog";

/**
 * Sidebar list of the newest "product" posts, shown beside the featured card on
 * the blog index. Same bordered/hard-shadow card as the post cards, but the body
 * is a compact list of title rows split by hairline dividers, each with a trailing
 * chevron. A "See all" link at the foot deep-links to the product category filter.
 * Renders nothing when there are no product posts.
 */
export function ProductUpdates({ posts }: { posts: BlogPostCard[] }) {
  if (posts.length === 0) return null;

  return (
    <section aria-label="Product updates" className="flex h-full flex-col p-6">
      <p className="eyebrow">Product updates</p>

      <ul className="mt-2 flex flex-col">
        {posts.map((post, i) => (
          <li
            key={post.id}
            className={i > 0 ? "border-t border-[var(--ink)]/10" : ""}
          >
            <Link
              href={`/blog/${post.slug}`}
              className="group flex items-center gap-3 py-3.5 pl-0 !no-underline transition-[padding] duration-[80ms] ease-out hover:pl-1"
            >
              <span className="heading-xs min-w-0 flex-1 truncate text-[var(--ink)]">
                {post.title}
              </span>
              <ChevronRight
                aria-hidden
                className="size-5 shrink-0 text-[var(--grey-2)] transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={`/blog?category=${PRODUCT_CATEGORY_SLUG}`}
        className="eyebrow mt-auto inline-flex items-center gap-1.5 pt-4 !no-underline transition-opacity hover:opacity-70"
      >
        See all
        <ChevronRight aria-hidden className="size-3.5" />
      </Link>
    </section>
  );
}
