import Link from "next/link";
import type { BlogAuthorRef } from "@/lib/queries/blog";
import { Avatar } from "./Avatar";
import { formatDate } from "./format";

/**
 * Byline — avatar + author name over the published date and (optional) reading time.
 * On cards the author isn't linked (the whole card is the link); on the article
 * header `linkAuthor` turns the name into a link to the author page.
 */
export function Byline({
  author,
  publishedAt,
  readingMinutes,
  linkAuthor = false,
}: {
  author: BlogAuthorRef | null;
  publishedAt: string | null;
  readingMinutes?: number;
  linkAuthor?: boolean;
}) {
  const date = formatDate(publishedAt);
  const meta = [date, readingMinutes ? `${readingMinutes} min read` : null]
    .filter(Boolean)
    .join(" · ");

  const name = author?.name ?? "200 Words a Day";

  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} src={author?.avatar_url ?? null} size={40} />
      <div className="flex flex-col">
        {linkAuthor && author ? (
          <Link
            href={`/blog/author/${author.slug}`}
            className="text-[14px] font-semibold text-[var(--ink)] !no-underline hover:opacity-70"
          >
            {name}
          </Link>
        ) : (
          <span className="text-[14px] font-semibold text-[var(--ink)]">{name}</span>
        )}
        {meta && <span className="text-[13px] text-[var(--grey-2)]">{meta}</span>}
      </div>
    </div>
  );
}
