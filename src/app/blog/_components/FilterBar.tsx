import Link from "next/link";
import type { BlogFilters } from "@/lib/queries/blog";

/** Build `/blog?…` preserving the other active filter; a null value drops that param. */
function href({ category, lang }: { category: string | null; lang: string | null }): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (lang) params.set("lang", lang);
  const qs = params.toString();
  return qs ? `/blog?${qs}` : "/blog";
}

function Pill({
  label,
  active,
  to,
}: {
  label: string;
  active: boolean;
  to: string;
}) {
  return (
    <Link
      href={to}
      aria-current={active ? "true" : undefined}
      className={
        "pill !no-underline transition-opacity hover:opacity-70 " +
        (active ? "!bg-[var(--ink)] !text-[var(--paper)]" : "")
      }
    >
      {label}
    </Link>
  );
}

/**
 * Index filter bar — category and language chips that navigate via query params.
 * The active chip inverts to solid ink; "All" clears each dimension. Rendered
 * server-side (plain links), so no client JS is shipped.
 */
export function FilterBar({
  filters,
  activeCategory,
  activeLang,
}: {
  filters: BlogFilters;
  activeCategory: string | null;
  activeLang: string | null;
}) {
  const hasLanguages = filters.languages.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {filters.categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5">
          <Pill
            label="All topics"
            active={!activeCategory}
            to={href({ category: null, lang: activeLang })}
          />
          {filters.categories.map((c) => (
            <Pill
              key={c.slug}
              label={c.name}
              active={activeCategory === c.slug}
              to={href({
                category: activeCategory === c.slug ? null : c.slug,
                lang: activeLang,
              })}
            />
          ))}
        </div>
      )}

      {hasLanguages && (
        <div className="flex flex-wrap items-center gap-2.5">
          <Pill
            label="All languages"
            active={!activeLang}
            to={href({ category: activeCategory, lang: null })}
          />
          {filters.languages.map((l) => (
            <Pill
              key={l.code}
              label={l.name}
              active={activeLang === l.code}
              to={href({
                category: activeCategory,
                lang: activeLang === l.code ? null : l.code,
              })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
