# Verb-conjugation template — build spec (Phase 2.1)

The engine of the migration: **766 pages, 48.7% of entry traffic, +42% YoY**. Build this
template first. Governing rule (PLAN.md Phase 2.1 / advisor #6): **preserve the SEO signal per
page** — carry over title, H1, explanatory copy, full conjugation content, canonical URL,
internal links, image `alt` text, metadata. Modernise *presentation*; do **not** change the
*content* (Google must see the same product at the same URL).

## What a legacy verb page contains (from crawl cache, e.g. `french-verb-aller.html`)

- `<title>`: `French Verb ALLER - to go. Learn ALL the Tenses Fast`
- meta description (bespoke per verb)
- `H1`: `French Verb ALLER - to go`
- `H2` subtitle: `A Top Ten French Verb` (a "rank/badge" line; not every verb has it)
- **Mnemonic / memory-trigger**: short imagery sentence ("imagine you GO down the ALLEY to
  ALLAY his fears") — a signature of this site, must be preserved.
- **Conjugation table**: two blocks — *Simple Tenses* and *Compound Tenses*. Columns:
  `je/j' · tu · il · nous · vous · ils`. Rows are tenses, each with an English name, a French
  name, and an English gloss (e.g. `Present / Présent / "go"`). Imperative row has gaps.
  ~13 tenses total.
- **Explanatory prose**: "MORE on the FRENCH VERB …" + "HOW TO CONQUER … CONJUGATION" sections
  (usage notes, examples, irregular-verb guidance).
- **Images**: a lead `.gif` (`alt` present) + PagePeed-mangled duplicate variants (dedupe).
- Share widget + SBI comment form → **drop** (not content).

## User goal & entry points

A learner (usually arriving from Google for "french verb aller" / "conjugate aller") lands
directly on the verb page. Entry points: organic search (primary), the ES/FR **daily-lesson
rotators** (which SSR-embed a verb page as "today"), and internal links from verb hubs /
other verb pages. No auth required — public marketing (`.site`) page on the apex host.

## URL strategy (preserve exact legacy URLs)

Serve at the **literal legacy path incl. `.html`**: `/french-verb-aller.html`,
`/spanish-verb-ir.html`, etc. This is the migration's core principle. The blog's clean
`/blog/[slug]` convention is **not** copied here — changing URLs would forfeit the ranking.
Route approach decided below (fork A).

## States

- **Success** — full page: header (H1, subtitle badge, mnemonic), conjugation table(s),
  explanatory prose, lead image, internal links, app CTA.
- **Unknown slug** — `notFound()` → 404 (a real 404, not a soft redirect).
- **Partial data** — a verb missing the subtitle/mnemonic/prose still renders cleanly
  (sections are individually optional); the conjugation table is the one required block.
- **"Too much data"** — long verb names / long tense glosses must not break the table;
  table scrolls horizontally on mobile rather than overflowing.
- **Loading** — server-rendered; no client loading state.

## Template design (`.site` brand layer, reuse blog chrome)

- Layout mirrors `src/app/blog/layout.tsx`: `<div className="site …">` + `SiteNav` + `Footer`.
- Article in a brand `.card`, `container` width, `.heading-xl` H1, `.eyebrow` for the
  subtitle badge, existing `.site` tokens (`--ink`, `--tan`, etc.). No new brand utilities.
- **Conjugation table**: a dedicated presentational component with a small scoped CSS block
  (`verb.css`, like `blog.css`) — colour-coded columns per person, sticky first column,
  horizontal scroll wrapper on mobile. This is the one genuinely new piece of markup.
- Mnemonic rendered as a highlighted callout (reuse `.mark` / callout tokens).
- Prose rendered via a `.verb-prose` block (same idea as `BlogProse`), sanitised.
- App CTA reused (`AppCta`) at the foot.

## Data model — fork B (see below)

Recommended: a new **`verb_conjugations`** table, structured so the page is re-templatable
and re-skinnable rather than a frozen HTML blob:

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `language_id` | fk → `languages` | reuse existing table (has name, code) |
| `slug` | text | the infinitive slug, e.g. `aller` (unique per language) |
| `legacy_path` | text unique | `/french-verb-aller.html` — the canonical served URL |
| `infinitive` | text | `aller` |
| `translation` | text | `to go` |
| `title` | text | exact legacy `<title>` |
| `meta_description` | text | exact legacy meta description |
| `h1` | text | exact legacy H1 |
| `subtitle` | text null | `A Top Ten French Verb` (badge) |
| `mnemonic` | text null | memory-trigger sentence |
| `conjugation` | jsonb | `{ simple: [...], compound: [...] }`, each row `{en, fr, gloss, forms:{je,tu,il,nous,vous,ils}}` |
| `intro_html` | text null | sanitised "MORE on…" prose |
| `notes_html` | text null | sanitised "HOW TO CONQUER…" prose |
| `lead_image_url` | text null | re-hosted image (Supabase Storage) |
| `lead_image_alt` | text null | exact legacy `alt` |
| `is_published` | bool default true | RLS: public read of published only |

RLS: public `select` where `is_published`, matching `blog_posts`. Types regenerated into
`database-generated.ts` per CLAUDE.md.

## Import pipeline

A one-off script parses the **766 cached HTML files** already in `docs/seo-migration/cache/`
into `verb_conjugations` rows (structured extraction: title/desc/h1/subtitle/mnemonic +
table→JSONB + prose sections + lead image). Images re-hosted to Supabase Storage; `alt`
carried verbatim. Ambiguous parses are logged for review, not silently dropped. (This mirrors
`scripts/import-lessons.ts`.) Content fidelity fork C below.

## Metadata / SEO preservation

`generateMetadata` per page: exact legacy `title` + `meta_description`;
`alternates.canonical` = the legacy path; `robots: index,follow`; OpenGraph article with the
lead image. `metadataBase` already set in `src/app/layout.tsx`. Add verb pages to
`app/sitemap.ts` (to be created). Internal links between verb pages preserved.

## Reuse checklist

- Chrome: `SiteNav`, `Footer`, `.site` wrapper (blog layout precedent).
- Queries/mutations: new `src/lib/queries/verbs.ts` following `blog.ts` shape.
- Styling: `.site` tokens + one scoped `verb.css`; no invented utilities.
- Images: `unoptimized` + Supabase Storage remotePattern (already configured).

## Quality checklist (run before done)

States (success/404/partial/overflow) · mobile table scroll · keyboard/focus · RLS public-read
· reuses `.site` tokens · `npm run lint` clean · canonical + title + H1 match legacy exactly.

## Open forks for sign-off

- **A — Route mechanism.** How to serve literal `.html` in the App Router:
  (recommended) a **dedicated catch pattern** for the verb family only, e.g. a route segment
  that matches `/{lang}-verb-{slug}.html`, keeping it isolated from other families; vs a
  single site-wide `[...slug]` catch-all that dispatches every legacy `.html` (bigger blast
  radius, decided later). Recommend scoping to the verb family now, generalise later.
- **B — Data model.** Structured `verb_conjugations` table (recommended, re-skinnable) vs
  reuse `blog_posts` + HTML body vs store a sanitised full-HTML blob (fastest, least faithful
  to "modernise presentation").
- **C — Content fidelity vs re-skin.** Faithful content + modern `.site` skin (recommended);
  vs verbatim HTML passthrough (safest for "same product" but keeps legacy markup); vs
  content cleanup now (risks Google seeing a changed page — against Core Principle).
