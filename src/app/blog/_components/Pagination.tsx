import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Page numbers to render: always first, last, current, and current ±1, with a
 * single ellipsis collapsing each remaining gap. Mirrors the windowing idea in
 * the admin AdminPagination, but as static markup (no ResizeObserver).
 */
function pageItems(current: number, total: number): (number | "ellipsis")[] {
  const show = new Set<number>([1, total]);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) show.add(i);
  }
  const sorted = [...show].sort((a, b) => a - b);

  const items: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) items.push("ellipsis");
    items.push(p);
    prev = p;
  }
  return items;
}

const pillBase = "pill !no-underline transition-opacity hover:opacity-70";
const pillActive = "pill !bg-[var(--ink)] !text-[var(--paper)]";
const pillMuted = "pill pointer-events-none opacity-40";

/**
 * Crawlable, server-rendered numbered pagination for the marketing blog (`.site`
 * brand pills, no client JS). Route-agnostic via `buildHref` so the index and
 * author archives share it. Renders nothing when there's a single page.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const items = pageItems(page, totalPages);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Blog pages"
      className="mt-12 flex flex-wrap items-center justify-center gap-2.5"
    >
      {hasPrev ? (
        <Link href={buildHref(page - 1)} rel="prev" aria-label="Previous page" className={pillBase}>
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Link>
      ) : (
        <span aria-hidden="true" className={pillMuted}>
          <ChevronLeft className="h-4 w-4" />
          Prev
        </span>
      )}

      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            aria-hidden="true"
            className="px-1 text-[var(--ink-soft)]"
          >
            &hellip;
          </span>
        ) : item === page ? (
          <span key={item} aria-current="page" className={pillActive}>
            {item}
          </span>
        ) : (
          <Link key={item} href={buildHref(item)} aria-label={`Page ${item}`} className={pillBase}>
            {item}
          </Link>
        )
      )}

      {hasNext ? (
        <Link href={buildHref(page + 1)} rel="next" aria-label="Next page" className={pillBase}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-hidden="true" className={pillMuted}>
          Next
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
