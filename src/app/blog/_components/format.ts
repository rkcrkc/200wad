// Shared date formatting for the blog. Published dates render as "5 September 2026"
// in en-GB. Nulls (drafts without a published_at) collapse to an empty string.

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATE_FMT.format(d);
}
