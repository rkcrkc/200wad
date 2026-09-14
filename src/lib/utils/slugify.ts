/**
 * Turn arbitrary text into a URL-safe slug: lowercase, strip non-word
 * characters, collapse whitespace/hyphens into single hyphens, trim ends.
 * Reused across blog posts, authors, and categories when no slug is given.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // drop anything that isn't a word char, space, or hyphen
    .replace(/[\s_-]+/g, "-") // collapse runs of spaces/underscores/hyphens to one hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}
