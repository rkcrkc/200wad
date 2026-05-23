/**
 * Fire-and-forget image preloader. Creates `Image` objects for the given URLs
 * so the browser warms its HTTP cache; the same URLs will then resolve from
 * cache when next/image renders them.
 *
 * Safe to call repeatedly — the browser dedupes in-flight + cached requests.
 * No-op on the server.
 */
export function preloadImages(urls: (string | null | undefined)[]): void {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    if (!url) continue;
    const img = new window.Image();
    img.src = url;
  }
}
