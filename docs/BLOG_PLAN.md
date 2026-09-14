# Blog — Index, Article & Author pages (`.site` brand skin)

Supabase-backed public blog, styled with the marketing **`.site` brand layer**
(`src/styles/site.css` tokens + unprefixed `.heading-*` / `.body` / `.eyebrow` utilities +
bordered white `.card`s with hard offset shadows). New top-level `/blog` route tree,
indexable, served from the **apex marketing domain** (`200wad.com/blog`).

> **Architecture note (updated post-plan):** This plan originally targeted the old
> `concept-d/f/g.css` cascade and `.g-*` utilities under a `.concept-d .concept-f .concept-g`
> wrapper, with `EmailCapture`/`Footer` living in `src/app/(concepts)/home/g/`. Both have since
> changed: the concept cascade was flattened into `src/styles/site.css` scoped under a single
> `.site` wrapper (utilities are now **unprefixed** — `.heading-xl`, `.body`, `.eyebrow`,
> `.container`, `.card`, `.btn`, `.pill`), and the landing components moved to
> `src/components/landing/`. The domain was also split (apex marketing + `app.` subdomain).
> This doc reflects the current architecture.

## Domain placement (apex marketing)

The blog is marketing content, so it lives on the **apex** domain and must be treated like the
other marketing routes:

- Add `/blog` to `MARKETING_ONLY_PREFIXES` in `src/lib/supabase/middleware.ts` so requests to
  `app.200wad.com/blog` 307-redirect to the apex domain. (Host classification lives in
  `src/lib/host.ts` via `classifyHost()`; `combined` mode on localhost/previews serves everything
  from one host, so `/blog` just works in dev.)
- Any cross-boundary CTA in the blog (e.g. "Start free", "Login") must build its URL with
  `appUrl(path)` from `@/lib/host` so it points at `app.200wad.com` in production. Internal blog
  links stay relative.
- `Footer` already uses `appUrl()` for its auth links, so reusing it needs no changes here.

## User goal & entry points
- **Reader** browses articles, filters by category/language, reads a post, and clicks an
  author to see everything that author has written.
- **Entry points:** landing `Blog` section cards (link to real slugs), footer "Blog" link,
  direct `/blog` URL, and internal links between posts/authors.
- **Routes**
  - `/blog` — index: featured post + card grid + category & language filters.
  - `/blog/[slug]` — article page.
  - `/blog/author/[slug]` — author page. (`author` is a static segment, so it always wins
    over `[slug]`; no post may use the slug `author`.)

## Data & permissions (Supabase)

Three new tables. Public **read of published rows only**; all writes via service role
(seeded by migration now — an admin CRUD UI is a follow-up, out of scope here).

**`blog_authors`**
- `id uuid pk default gen_random_uuid()`
- `slug text unique not null`
- `name text not null`
- `role text` — e.g. "Founder", "Language coach"
- `avatar_url text`
- `bio text`
- `created_at timestamptz default now()`

**`blog_categories`**
- `id uuid pk`, `slug text unique not null`, `name text not null`, `sort_order int default 0`

**`blog_posts`**
- `id uuid pk`
- `slug text unique not null`
- `title text not null`
- `excerpt text` — card + meta description
- `body text` — Markdown (rendered with the already-installed `react-markdown` + `remark-breaks`)
- `cover_image_url text`
- `author_id uuid not null → blog_authors(id)`
- `category_id uuid → blog_categories(id)` (nullable)
- `language_id uuid → languages(id)` (nullable — the language the article is about; `null` = general)
- `is_published boolean default false`
- `is_featured boolean default false`
- `published_at timestamptz`
- `created_at`, `updated_at timestamptz` (updated_at via the repo's existing moddatetime trigger convention)
- Indexes: `slug`, `(is_published, published_at desc)`, `author_id`, `category_id`, `language_id`.

**RLS**
- `blog_posts`: `SELECT` where `is_published = true` (anon + authed). No public writes.
- `blog_authors`, `blog_categories`: `SELECT true`. No public writes.
- Reading time is **computed** from body word count (~200 wpm) in the query layer — no column to keep in sync.

**Migration & seed:** one migration creates the tables, indexes, RLS, then seeds ~2 authors,
~4 categories, and 4–5 posts (including the three titles the landing already teases, one marked
`is_featured`) with real Markdown bodies so `/blog` is never empty. Applied per CLAUDE.md
migration rules (filename version == applied ledger version).

## Files

```
src/app/blog/
  layout.tsx              # <div className="site"> wrapper + CSS imports; renders BlogNav,
                          #   {children}, EmailCapture, Footer. (Fonts are global from the
                          #   root layout — Bricolage/Inter/Spline-mono via --font-* vars —
                          #   so no per-layout font wiring is needed.)
  blog.css                # .site .blog-prose long-form article body styling (site tokens)
  page.tsx                # index (reads searchParams { category?, lang? })
  loading.tsx             # index skeleton
  [slug]/page.tsx         # article (generateMetadata, notFound on miss)
  author/[slug]/page.tsx  # author page (generateMetadata, notFound on miss)
  _components/
    BlogNav.tsx           # logo + nav + "Start free" (modeled on the LandingG navbar; uses appUrl())
    FilterBar.tsx         # "use client" category + language pills → updates searchParams
    FeaturedCard.tsx      # large 2-col card (cover + content) for the featured post
    PostCard.tsx          # bordered white card: cover, category eyebrow, title, excerpt, mini-byline
    Byline.tsx            # author avatar + link, date, reading time
    AuthorHeader.tsx      # avatar, name, role, bio
    BlogProse.tsx         # ReactMarkdown wrapper (link hardening, .blog-prose)
src/lib/queries/blog.ts   # getBlogIndex, getPostBySlug, getRelatedPosts,
                          #   getAuthorBySlug, getBlogFilters (+ typed interfaces)
```

**Reuse (no new versions of these):** `EmailCapture` and `Footer` from
`src/components/landing/` are imported directly (EmailCapture is self-contained; Footer's
landing-anchor links are repointed to real blog/site routes as needed, and it already uses
`appUrl()` for auth links). All type styles come from the existing `.eyebrow`, `.heading-xl`/`-l`/`-s`,
`.body`, `.label-heavy` utilities and the `.btn`/`.pill` classes in `site.css` — **no new
typography utilities, no off-palette hexes**.

## Screens & states

### `/blog` index
- **Header:** `.eyebrow` "200 WAD Blog" + `.heading-xl` heading + one-line `.body` intro, in `.container`.
- **FilterBar:** two pill rows — Category ("All" + each category) and Language ("All" + each
  language that has published posts). Active pill = ink fill / white text; inactive = `--tan`
  chip. Selecting updates `?category=` / `?lang=` (shallow nav); pills wrap on mobile.
- **Featured:** newest `is_featured` post as a large 2-col `FeaturedCard` — shown **only when
  no filter is active** (so filtered results read as a clean grid).
- **Grid:** remaining posts as `PostCard`s — `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `gap-[30px]`.
- **States**
  - *Empty (no posts at all):* centered card — "No articles yet. Check back soon." + "Start learning" CTA.
  - *Empty (filter matches nothing):* "No articles in this filter." + "Clear filters" link.
  - *Loading:* `loading.tsx` skeleton (grey cover boxes + text bars in the card shape).
  - *Too much data:* titles `line-clamp-2`, excerpts `line-clamp-3`; long filter lists wrap.

### `/blog/[slug]` article
- Back link "← All articles"; category + language `.eyebrow`; `.heading-xl` title (max-w for measure).
- **Byline:** clickable author (avatar + name → `/blog/author/[slug]`), `·` publish date, `·` N min read.
- **Cover:** full-width bordered image block (grey placeholder box if `cover_image_url` is null).
- **Body:** Markdown via `BlogProse` — `.blog-prose` styles h2/h3/p/ul/ol/li/blockquote/a/img/code
  with site tokens (Bricolage headings, Inter body, `--accent` links, `--tan` blockquote rule).
- **Related:** "Keep reading" — up to 3 `PostCard`s sharing category or language (self excluded;
  falls back to newest). Hidden if none.
- Then the shared `EmailCapture` + `Footer` (from layout).
- **States:** unknown/unpublished slug → `notFound()` (404). Missing cover/category/language all degrade gracefully.

### `/blog/author/[slug]` author
- `AuthorHeader`: large avatar, `.heading-l` name, `.eyebrow` role, `.body` bio.
- Their published posts as a `PostCard` grid (same layout as index). Empty → "No articles yet."
- Unknown slug → `notFound()`.

## Interactions & copy
- Cards & CTAs use the shared press-into-shadow hover (`translate(2px,2px)`, shadow `5px→3px`, 80ms).
- Filter pills: click to toggle; active state reflected from `searchParams` (server-rendered, so
  it's shareable/bookmarkable and back-button friendly).
- Buttons: `.btn` / `.btn big` / `.btn ghost`; newsletter reuses `EmailCapture`'s own states.

## Responsive
- `.container` gutters (20/40/80px). Featured card stacks to 1-col below `lg`; grids collapse
  1→2→3 up. Filter rows wrap (no horizontal scroll trap). Byline wraps under title on mobile.

## Reuse summary (design-system-first)
- **Tokens/type:** `--ink/--paper/--tan/--accent/--marker`, `.eyebrow`, `.heading-*`, `.body`, `.label-heavy` (all under `.site`).
- **Components:** `.btn`/`.pill`, bordered-white-`.card` + offset-shadow pattern, `EmailCapture`, `Footer`, the landing `Blog.tsx` card shape (generalized into `PostCard`).
- **Libs:** `react-markdown` + `remark-breaks` (already used by `TipCard`), `@tailwindcss/typography` for prose base.
- **Domain:** `appUrl()` / `marketingUrl()` from `@/lib/host` for any cross-domain links.

## Not in scope (flagged)
- Admin authoring UI (seed via migration for now).
- Comments, search, pagination/infinite scroll (add later if post count grows).
- Wiring the landing `Blog.tsx` cards to live data — small optional follow-up once posts exist.

## Quality checklist (run before done)
- [ ] All states: empty/first-time, loading, error/404, success, long-title/large-list.
- [ ] Mobile layout verified (featured stack, grids, filter wrap, byline wrap).
- [ ] Keyboard/focus: card & pill focus rings, tab order, author-link focus.
- [ ] RLS: only published posts readable by anon; authors/categories public; no public writes.
- [ ] Reuses `.site` tokens/components; no invented utilities or off-palette colors.
- [ ] `/blog` added to `MARKETING_ONLY_PREFIXES`; app-subdomain requests redirect to apex; cross-domain CTAs use `appUrl()`.
- [ ] `npm run lint` passes; migration filename == ledger version; no dead code.

## Build order
1. Add `/blog` to `MARKETING_ONLY_PREFIXES` (middleware) so it's apex-only.
2. Migration: tables + indexes + RLS + seed. Regenerate `src/types/database-generated.ts`.
3. `src/lib/queries/blog.ts` + typed interfaces (reading-time helper).
4. `blog/layout.tsx` + `blog.css` (`.site` wrapper, nav, newsletter+footer).
5. `_components/*` (PostCard, FeaturedCard, FilterBar, Byline, AuthorHeader, BlogProse).
6. `blog/page.tsx` (+ `loading.tsx`), `[slug]/page.tsx`, `author/[slug]/page.tsx` with metadata.
7. Repoint footer/landing links; responsive + reduced-motion pass; lint + checklist.
