/**
 * Build a `/blog?…` URL preserving the active filters and page. A null filter
 * drops that param; page 1 is omitted so the first page stays a clean `/blog?…`.
 * Single-sourced here so FilterBar and Pagination can't drift apart.
 */
export function blogHref({
  category,
  lang,
  page,
}: {
  category?: string | null;
  lang?: string | null;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (lang) params.set("lang", lang);
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/blog?${qs}` : "/blog";
}
