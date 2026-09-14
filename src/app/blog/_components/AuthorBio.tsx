import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogAuthorRef } from "@/lib/queries/blog";
import { Avatar } from "./Avatar";

type BioAuthor = BlogAuthorRef & { role: string | null; bio: string | null };

/**
 * Author bio — an in-card section (below the article body) introducing the writer:
 * avatar, name (linked to their author page), role, short bio, and a "More from"
 * link. Separated from the body by a hairline; renders nothing without an author.
 */
export function AuthorBio({ author }: { author: BioAuthor | null }) {
  if (!author) return null;

  return (
    <section className="mt-12 border-t border-[var(--ink)]/10 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
        <Avatar name={author.name} src={author.avatar_url} size={64} />
        <div className="flex flex-col gap-2">
          {author.role && <p className="eyebrow">{author.role}</p>}
          <Link
            href={`/blog/author/${author.slug}`}
            className="heading-s text-[var(--ink)] !no-underline hover:opacity-70"
          >
            {author.name}
          </Link>
          {author.bio && (
            <p className="text-[15px] leading-[1.6] text-[var(--ink-soft)]">{author.bio}</p>
          )}
          <Link
            href={`/blog/author/${author.slug}`}
            className="label-heavy mt-1 inline-flex items-center gap-1 rounded-full px-3 py-2 text-black/[0.67] !no-underline transition-colors hover:bg-[var(--tan)] hover:text-black"
          >
            More from {author.name}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
