# Blog Numbered Pagination — Plan

## User goal & entry points
A reader browsing `/blog` (or a filtered view like `/blog?category=method`) and an author
archive (`/blog/author/[slug]`) can move through the full set of posts in ordered,
numbered pages instead of one ever-growing grid. Navigation is via crawlable
`/blog?page=N` links rendered below the grid.

**Locked decisions (from planning):**
- Featured card + "Product updates" sidebar appear on **page 1 only**.
- **12** posts per grid page (`PAGE_SIZE`).
- **Numbered controls with Prev/Next** and ellipsis truncation.
- **Author pages are in scope** and reuse the same `Pagination` component.

## Why a new component and not `AdminPagination`

We already have `src/components/admin/AdminPagination.tsx`. It is deliberately **not**
reused here:

| | `AdminPagination` (existing) | Blog needs |
|---|---|---|
| Rendering | `"use client"`, imperative `onPageChange` → `router.push` | Server component, no JS (matches `FilterBar`) |
| Navigation | `<button onClick>` | `<a href="/blog?page=N">` — crawlable, the SEO rationale |
| Styling | App `:root` tokens: `text-gray-600`, `bg-primary`, lucide icons | `.site` brand pills |
| Truncation | Sliding window + `ResizeObserver`, no ellipsis | `1 … 5 6 7 … 20` ellipsis |

The blocking mismatches are **client-vs-server** and **button-vs-anchor**: the blog index
ships zero JS and depends on crawlable `<a href>` links (the whole point of numbered
pages for SEO). There is also the hard two-layer constraint in `CLAUDE.md` — `AdminPagination`
uses the app `:root` layer while the marketing blog is the `.site` brand layer; a shared
component would leak the layers into each other. We borrow only the *page-range windowing
idea* from `AdminPagination.getVisiblePages()`, rendered as `.site` anchors with true ellipsis.

## Data & query changes (`src/lib/queries/blog.ts`)

Add `const PAGE_SIZE = 12;`.

**`getBlogIndex({ category, lang, page })`** returns, in addition to today's fields:
`page`, `totalPages`, `totalPosts`.

- Parse `page` to a positive int (default 1).
- Run the grid query with `{ count: "exact" }` and
  `.range(from, from + PAGE_SIZE - 1)` where `from = (page - 1) * PAGE_SIZE`.
- **Page 1, no filter** must still exclude the featured post and product-category posts
  from the grid (current behaviour). Do this in the query, not in memory, so `count` and
  `range` stay correct:
  - Resolve the `product` category id and the featured post id first.
  - Apply `.neq("id", featuredId)` and `.neq("category_id", productCategoryId)` to the grid query.
  - Fetch `featured` and `productUpdates` as their own small queries — **page 1 only**;
    on page ≥ 2 both are `null` / `[]`.
- **Filter active:** no featured/sidebar (unchanged); grid = matching posts, paginated
  straight with count.
- `totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE))`.

**`getAuthorBySlug(slug, { page })`** gains the same treatment: `{ count: "exact" }` +
`.range()` over the author's published posts, returning `posts`, `page`, `totalPages`,
`totalPosts`. No featured/sidebar concept on author pages.

RLS already scopes to published rows — no permission change. Guest mode unaffected
(public pages).

## New component: `Pagination` (`src/app/blog/_components/Pagination.tsx`)

Server component, plain `<Link>`s (no client JS), styled with `.site` pills to match
`FilterBar`.

- Wrap in `<nav aria-label="Blog pages">`.
- Layout: `‹ Prev  1 2 … 5 6 7 … 20  Next ›`.
  - Always show first, last, current, and current ±1; collapse gaps with a
    non-interactive ellipsis `<span>`.
  - Current page: solid-ink pill, `aria-current="page"`.
  - Prev/Next at the ends render as muted non-links (not dead anchors).
- Takes `page`, `totalPages`, and a `buildHref(page) => string` so it stays route-agnostic
  (index vs author).

## Shared href helper (`src/app/blog/_components/blogHref.ts`)

Extract `FilterBar`'s inline `href({ category, lang })` into a shared
`blogHref({ category, lang, page })`, dropping `page` when it is 1 so page 1 stays a clean
`/blog?…`. Reused by `FilterBar` and the index `Pagination`. Author pages pass their own
`buildHref` closure (`/blog/author/${slug}?page=N`).

## Page components

**`src/app/blog/page.tsx`**
- Add `page?: string` to `searchParams`; parse to positive int (`NaN`/`<1` → 1).
- Pass `page` to `getBlogIndex`.
- **Out-of-range guard:** if `page > totalPages && totalPosts > 0` → `notFound()`
  (avoids soft-404 / thin duplicate pages). Page 1 with zero posts keeps the empty state.
- Render featured/sidebar blocks only when `page === 1`.
- Render `<Pagination>` below the grid when `totalPages > 1`.
- Convert the static `metadata` export to `generateMetadata` to set the canonical from
  `page` + active filters (page 1 → `/blog` with no `page`; page N → self-referential).

**`src/app/blog/author/[slug]/page.tsx`**
- Add `searchParams` with `page?: string`; parse as above.
- Pass `page` to `getAuthorBySlug`; same out-of-range `notFound()` guard.
- Render `<Pagination>` with a `buildHref` targeting the author route.
- Update `generateMetadata` canonical to include `page` when > 1.

## States
- **First-time / empty:** existing "No posts here yet" / "No published posts yet";
  pagination not rendered (`totalPages === 1`).
- **Loading:** server-rendered; no spinner.
- **Error:** query failure falls through to empty grid (null-safe `toCards`).
- **Success, one page:** no control shown.
- **Too much data:** long ranges truncate with ellipses; grid capped at 12 keeps payload small.

## SEO
- **Canonical per page:** page 1 → `/blog` (or `/blog?category=…`, no `page`); page N →
  self-referential incl. active filters. Prevents `/blog` vs `/blog?page=1` duplication.
- Keep `robots: index, follow`. Numbered `<a href>` links are crawlable (current Google
  paginated-series guidance; `rel=next/prev` deprecated, not needed).

## Responsive
- Control wraps with `flex-wrap`, centered, comfortable tap targets (reuse `.pill` sizing).
  Ellipsis truncation keeps the row short on mobile; Prev/Next stay reachable.

## Reuse
- `.site` `.pill` styling + `aria-current` pattern from `FilterBar.tsx`.
- Supabase `.range()` + `count: "exact"` (same pattern as `src/app/admin/words/page.tsx`).
- `next/link`, existing `PostCard` / `FeaturedCard` / `ProductUpdates`.
- Page-range windowing idea from `AdminPagination.getVisiblePages()`.

## Quality checklist (verify before done)
- [ ] States: empty / one-page / multi-page / out-of-range (404).
- [ ] Long ranges don't overflow; mobile wrap verified.
- [ ] Keyboard focus on page links; `aria-current` on active page.
- [ ] Canonical correct per page & filter; filters preserved across page turns.
- [ ] Featured + sidebar only on page 1; grid count excludes them correctly.
- [ ] `npm run lint` clean; no dead code.
