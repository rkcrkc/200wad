# Landing G at apex + app on `app.` subdomain — Plan

Make **Landing G** the live marketing homepage at the apex domain, move the
authenticated app to `app.` on the same domain, share the login session across
both, and archive the other landing concepts out of the published build.

> **Apex domain:** `200words-a-day.com` (confirmed live domain, hosted on SiteSell /
> Solo Build It). Production launch host TBD (`200words-a-day.com` vs a shorter
> `200wad.com`); the plan text below still uses `200wad.com` as a placeholder in
> places — treat `200words-a-day.com` as authoritative.
>
> **Staging (current):** the app runs on Vercel behind two SiteSell "Infin It!"
> subdomains pointed at the Vercel project's **Production** environment:
> `staging.200words-a-day.com` (apex → Landing G) and
> `app-staging.200words-a-day.com` (app). The SiteSell site on the apex is left live
> and untouched. Cookie domain `.200words-a-day.com` shares the session across both.

### Sign-off answers (locked)

1. Apex = `200wad.com`, `www` → apex redirect.
2. Retire the current `(marketing)/home` landing — `/home` 301s to `/`.
3. Logged-in visitor to apex `/` sees Landing G with a "Go to your course" button —
   **no auto-forward** into the app.
4. Auth pages live on the **app host only** (`app.200wad.com/login` etc.); apex auth
   paths 307 to the app.

## Decisions locked in

- **Subdomain:** `app.200wad.com` for the app; apex `200wad.com` serves Landing G.
- **Auth/session:** shared across both hosts via cookie `domain=.200wad.com`.
- **Archive:** other concepts moved out of the build (kept in git, not routed).
- **Hosting:** Vercel — one project, two domains, host-based routing in middleware.
- **Design system:** G's tokens/utilities become the canonical **marketing** design
  system, flattened into one stylesheet scoped under a single **`.site`** class,
  with the `g-` prefix dropped (unprefixed under scope: `.site .card`,
  `.site .heading-s`). Structured as a **skin over shared atoms** (see §9).
- **Rollout of the design system:** applied to **Landing G now**; existing marketing
  pages (pricing, how-it-works, learn, legal) migrate onto `.site` **one by one as a
  separate, structured migration project** (see §10).

## 1. User goal & entry points

- **Visitor (logged out)** hits `200wad.com` → sees Landing G. CTAs ("Start free",
  "Log in") deep-link to `app.200wad.com/signup` and `/login`.
- **Learner (logged in)** hits `200wad.com` → because the session is shared, Landing G
  renders with a "Go to your course" button (no auto-forward — per sign-off).
- **Learner** hits `app.200wad.com` → today's app behaviour (root redirects to their
  `/course/{id}/schedule`; guests get the default-course preview + onboarding modal).
- **Old deep links** to `/home/g`, `/home`, `/home/c…f` etc. must not 404 — see §7.

## 2. Architecture: host-based routing (one deployment)

Single Next app; `src/proxy.ts` → `updateSession` already runs on every request.
Add host awareness there plus a host-aware root page.

**Host classification helper** (new `src/lib/host.ts`):
- `APEX_HOST` / `APP_HOST` come from env (`NEXT_PUBLIC_MARKETING_URL`,
  `NEXT_PUBLIC_APP_URL`).
- `classifyHost(host)` → `"apex" | "app" | "combined"`.
- **`"combined"`** = localhost and `*.vercel.app` previews, where the split doesn't
  exist. In combined mode we keep **today's behaviour** (all routes served, no host
  redirects) so dev and previews keep working. Gating only activates on the real
  production hosts.

**Middleware (`src/lib/supabase/middleware.ts`) additions** — after the existing
`getUser()` call, branch on host:

- **apex host:**
  - Allow: `/` (Landing G), marketing/legal prefixes (`/home` legacy, `/pricing`,
    `/how-it-works`, `/learn`, `/terms`, `/privacy`, `/refunds`, `/about`, etc.),
    `/auth/*` callbacks, static.
  - App paths (`/course`, `/dashboard`, `/admin`, `/account`, `/tests`, `/dictionary`,
    `/schedule`, `/profile`, `/settings`, `/shop`, `/streak`, `/trophies`, `/community`,
    `/referrals`, `/help`) → **307 to `https://app.200wad.com{path}`**.
  - Auth pages (`/login`, `/signup`, `/forgot-password`, `/reset-password`,
    `/onboarding`, `/join`) → **307 to app subdomain** (auth lives on the app).
- **app host:** current logic unchanged. Optionally 307 marketing/`/home*` paths and
  the archived concept URLs → apex, so the app host stays "app only".
- **combined host:** current logic unchanged.

**Root page (`src/app/page.tsx`) becomes host-aware** via `headers()`:
- apex → render `<LandingG />` (the component, not a redirect).
- app / combined → existing redirect logic (unchanged).
- `generateMetadata()` returns Landing G's SEO metadata on apex, nothing special
  otherwise.

## 3. Promote Landing G into a real page

- **Implemented:** moved `src/app/(concepts)/home/g/` → `src/components/landing/`. It
  does **not** use the `(marketing)` layout — Landing G ships its own navbar/footer.
  The concept-E-only hero trigger **types** it imported (`HeroTriggerCard`,
  `HeroLanguageTab`) were relocated to `src/components/landing/heroTriggerTypes.ts` so
  the component no longer depends on the soon-to-be-archived `../e/` folder.
- **Preview route:** `(concepts)/home/g/page.tsx` is now a thin, **noindexed** preview
  that renders `<LandingG />`, kept for local QA (on localhost the apex `/` still
  redirects). It is removed when the concepts are archived (§6).
- **SEO:** metadata lives on the *route*, so `LandingG` exports a `landingMetadata`
  constant (canonical `/`, `robots.index: true`, OG/Twitter) that the apex root page
  (§2, Task 5) spreads into its own `metadata`. OG/Twitter text is set; a 1200×630 OG
  banner image is still TODO (no asset exists yet).
- **CSS deps are handled by §9**, not carried as-is: G currently imports
  `../d/concept-d.css` + `../f/concept-f.css` + `./concept-g.css` and wraps everything
  in `.concept-d.concept-f.concept-g`. Those three files get **flattened into one
  `site.css` under `.site`**, and the wrapper becomes a single `.site`.
- Export `LandingG` as a component; the current `export default function ConceptG()`
  body becomes that component (wrapper class → `.site`). Root `page.tsx` imports and
  renders it on apex.
- **SEO flip:** `robots.index` `false → true`; `alternates.canonical` `/home/g → /`;
  add OG/Twitter image + real title/description (reuse existing `metadata` copy).
- **Prerequisite (DONE):** Landing G compiles clean and lints green. The earlier
  `triggerLit`/`parseFormattedText` `ReferenceError`s were transient mid-edit states
  and no longer exist (the file uses `triggerActive` + `renderTrigger`). Still worth a
  visual pass on the hero demo before go-live.

## 4. Shared session across subdomains

Set an explicit cookie domain on all three Supabase client creators so the auth
cookies are visible on both `200wad.com` and `app.200wad.com`.

- New env `NEXT_PUBLIC_COOKIE_DOMAIN` = `.200wad.com` in prod, **unset** locally
  (localhost can't use that domain) and on `*.vercel.app` previews.
- Pass `cookieOptions: { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN }` (only when
  set) to:
  - `src/lib/supabase/server.ts` (`createServerClient`)
  - `src/lib/supabase/client.ts` (`createBrowserClient`)
  - `src/lib/supabase/middleware.ts` (`createServerClient`)
- **Supabase Auth config (dashboard):** add `https://app.200wad.com` as Site URL and
  to the redirect allowlist; keep `http://localhost:3000` for dev. Email
  confirmation / OAuth callbacks resolve against the app host.
- **Cutover caveat:** existing sessions were set on the old host without a domain.
  After deploy some users may need to log in once so the cookie is re-issued at
  `.200wad.com`. Acceptable; note it.

## 5. Cross-boundary links

Same-origin links stay relative. Only links that cross the apex⇄app boundary need
absolute URLs, built from env:

- Helpers `appUrl(path)` / `marketingUrl(path)` in `src/lib/host.ts`.
- **Landing G** CTAs → `appUrl("/signup")`, `appUrl("/login")`, guest-preview →
  `appUrl("/course/{DEFAULT_COURSE_ID}/schedule")`.
- **App** "home/logo" and marketing footer links → `marketingUrl("/")` etc.
- In combined/dev mode the helpers return relative paths so nothing breaks locally.

## 6. Archive the other concepts

Move out of the route tree (still in git, no longer built):

- `(concepts)/home/`: `c`, `c-cheeky`, `d`, `d-cheeky`, `e`, `f` → `src/_archive/concepts/`
  (a private, non-routed location). **G is extracted first** (§3); the three
  `concept-*.css` files are **flattened into `site.css` (§9)**, not archived.
- The archived `c`/`d`/`e`/`f` pages import `concept-d.css`/`concept-f.css` relatively
  — those imports break once the files are consolidated. That's **fine**: archived
  pages live in a private (`_`) folder, are not compiled/built, so broken imports never
  reach the bundle. (If we ever want them to build again, they'd need re-pointing.)
- Old marketing landing `(marketing)/home` (retired per sign-off) and `(marketing)/home/b`
  → archive; `/home` 301s to `/` (§7).
- Remove/redirect their entries so no archived concept ships in the production bundle.

**Implemented:** `c`, `c-cheeky`, `d`, `d-cheeky`, `e`, `f` moved to `src/_archive/concepts/`
(sibling layout preserved so their intra-set relative imports stay intact); `(marketing)/home`
+ `home/b` moved to `src/_archive/marketing-home/`. The `(concepts)/home/g` preview was removed
(the empty `(concepts)` group was deleted with it). The consolidated `concept-d/e/f.css` were
deleted (their styles now live in `site.css`), so the archived pages' CSS imports are now broken
— accepted, since `src/_archive/**` is excluded from both `tsconfig` and `eslint` and sits outside
`src/app`, so it is never type-checked, linted, or built. `tsc` and `npm run lint` are green
(0 errors). `/home`, `/home/b…f`, `/home/g` now 404 until the §7 redirects land (Task 10).

## 7. Redirects & SEO cleanup

- `/home/g` (apex) → 301 `/` (it's now the homepage).
- Legacy `/home`, `/home/b…f` → 301 to `/` (or archive-appropriate target).
- `robots.txt` / sitemap: ensure `/` is indexable; drop the old noindexed concept URLs.
- Canonicals across marketing pages point at apex host.

**Implemented:**
- `next.config.ts` `redirects()` 308-permanents `/home` and `/home/:path*` → `/` (covers
  the old `(marketing)/home`, `/home/b`, and every `/home/{c…g}` concept preview). Next
  issues 308 for `permanent: true` — SEO-equivalent to 301, treated identically by Google.
  Verified in dev: all seven legacy paths redirect to `/`.
- **robots/sitemap:** none exist in the repo, so `/` is indexable by default (and `LandingG`
  sets `robots.index: true`); there is no sitemap enumerating the old concept URLs to prune,
  and the concept routes are gone from the tree + 308-redirected, so they can't be indexed.
  No robots/sitemap file was introduced (out of scope; a future marketing-SEO task can add one).
- **Canonicals:** the root layout now sets `metadataBase` from `NEXT_PUBLIC_MARKETING_URL`
  (falling back to `NEXT_PUBLIC_APP_URL`, else undefined in dev), so every page's relative
  `canonical`/OG URL (all of them — `/`, `/pricing`, `/privacy`, …) resolves against the apex
  host in production.
- **www → apex** is left to the Vercel/DNS layer (Task 11), which handles it natively as a
  domain-redirect setting; no brittle hard-coded host redirect added to `next.config.ts`.

## 8. Vercel / DNS config (manual, outside the code)

- Add `app.200wad.com` as a domain on the same Vercel project (CNAME per Vercel).
- Keep `200wad.com` + `www.200wad.com` (www → apex redirect) on the project.
- Set env vars per environment: `NEXT_PUBLIC_MARKETING_URL`, `NEXT_PUBLIC_APP_URL`,
  `NEXT_PUBLIC_COOKIE_DOMAIN` (prod only).
- `next.config.ts`: add `www → apex` redirect if not handled at DNS.

## 9. Marketing design system — standardize as `.site`

Turn Landing G's tokens/utilities into the canonical **marketing/brand** design
system, distinct from the app's flat shadcn UI. Today it's three scoped, layered
files (`concept-d.css` base → `concept-f.css` skin → `concept-g.css` final) whose
combined effect only exists when the wrapper carries all three classes
(`.concept-d.concept-f.concept-g`) and they load in order.

### 9a. Hard constraint — stay scoped, never global

The app's `globals.css :root` defines `--accent: #f2ead9` (tan). The marketing skin
defines `--accent: #0b6cff` (blue). Promoting marketing tokens to `:root` would
corrupt the app. **All marketing tokens/utilities remain scoped under one wrapper
class, `.site`.** The app UI (globals `.text-*` + shadcn) is untouched.

### 9b. Flatten three files → one `site.css`

Compute the final cascade (D base, F overrides, G overrides) into a single
`src/app/(marketing)/site.css` (or `src/styles/site.css`), imported by the marketing
layout **and** by the apex root page that renders Landing G.

- Rewrite every selector from `.concept-g …` / `.concept-d.concept-f.concept-g …`
  to `.site …`.
- Drop the `g-` prefix on utilities: `.g-heading-s → .heading-s`, `.g-body → .body`,
  `.g-label-lg → .label-lg`, `.g-arrow → .arrow`, `.g-callout → .callout`,
  `.g-container → .container`, `.g-marquee* → .marquee*`, `.g-progress-fill →
  .progress-fill`, `.g-card-deal → .card-deal`. (Unprefixed; the `.site` scope is the
  namespace — the app has no global `.card`/`.btn` classes to collide with.)
- **Prune** D/F classes that G doesn't use and no marketing page needs yet (pruned:
  `.panel`, `.sweep`, `.wordcard`, `.stepcard`, `.chart-line`, `.card-sm`,
  `.pill.line/.yellow/.pink`, `.h-sec`, `.ink-soft` class, `.text-le/.text-la`).
  **Kept** after auditing actual G usage: `.mark` (highlight, used 3×), `.btn.ghost`,
  and the `--ink-soft` token.

### 9c. Skin over shared atoms (DRY the crossover)

Single-source the values that are provably identical between app and brand; let
`.site` own only the divergence.

- **Reference shared atoms** in `.site`: `--accent: var(--primary)` (both `#0b6cff`);
  success → `var(--success)` (replaces G's hardcoded `#34C759`); beige `#f2ead9`
  reuses the shared token; fonts (`--font-bricolage`/`--font-inter`) already global.
- **`.site` owns brand-divergent tokens:** warm `--ink #191510`, `--paper #f6f1e6`,
  `--paper-2`, `--tan #ecdfc3`, `--marker #ffe14d`, `--mono-soft`, `--grey-2`.
- **`.site` owns divergent surfaces + type** (the brand signature the app deliberately
  lacks): bordered + hard-offset-shadow `.card`/`.pill`/`.btn`/`.arrow` with
  press-into-shadow hover, and the heavy display ramp (Bricolage ExtraBold/800, -2%
  tracking, 24–56px) — no equivalent exists in the app's `.text-*` set, so these do
  not fold into it.

### 9d. Fonts move up

Spline Sans Mono is loaded in `g/page.tsx` as `--font-mono-d`. As a standard it is
renamed `--font-mono`. **Implemented:** loaded in the **root layout** (`app/layout.tsx`)
on `<html>` alongside `--font-inter`/`--font-bricolage`, rather than the marketing
layout — `LandingG` renders at the apex root (`/`), which is **outside** the
`(marketing)` route group, so it needs the variable globally; this also keeps parity
with the other two brand fonts and makes it available to every marketing page. It is
only *used* under `.site`. The unused Newsreader / `--font-quote-d` face is dropped
(G already resets `.quote` to upright Inter).

### 9e. Component churn

~134 class references, all inside the G folder (96 `g-*` + 38 inherited
`.card`/`.btn`/`.pill`/`.eyebrow`/`.h-hero`), plus the single wrapper in `page.tsx`.
Mechanical rename once `site.css` is authored; verify with a visual pass, not just lint.

### 9f. Governance — update `CLAUDE.md`

The Design System section states the globals `.text-*` utilities are "the ONLY ones;
do not invent new ones." That must be amended to document **two layers**: (1) the app
UI system (globals tokens + `.text-*` + shadcn, flat surfaces); (2) the **marketing
`.site`** brand layer (scoped tokens + `.heading-*`/`.body`/`.label-*`/`.card`/… with
bordered/hard-shadow surfaces), referencing shared atoms. Note the scoping rule so
neither leaks into the other.

## 10. Existing-marketing migration — separate structured project

Out of scope for this change; tracked as its own project. The existing marketing pages
(`/pricing`, `/how-it-works`, `/learn`, legal) use the app's globals tokens +
`MarketingNav`/`MarketingFooter`, **not** `.site`. Migrating them means, per page:
re-skin onto `.site` tokens/utilities and reconcile the shared nav/footer with Landing
G's own navbar/footer (eventually one set). Do it page-by-page after `site.css` is the
established source of truth.

## States (routing behaviours to verify)

- **apex, logged out:** Landing G renders; CTAs go to app host.
- **apex, logged in (shared cookie):** Landing G renders with "go to course" path
  working; app deep links 307 to app host and land authenticated.
- **app, logged in:** unchanged (schedule/dashboard).
- **app, guest:** default-course preview + onboarding modal unchanged.
- **combined (localhost / preview):** everything served from one host, no redirects.
- **legacy concept URL:** 301s to `/` (apex) — no 404, no duplicate-content indexing.
- **auth callback / email confirm:** resolves on app host, session valid on both.

## Reuse

- Existing `proxy.ts` + `updateSession` (extend, don't replace).
- Existing Supabase SSR clients (add `cookieOptions` only).
- Existing Landing G components/assets (`public/marketing/g/`, `public/marketing/demo/`);
  its CSS is consolidated into `site.css` (§9), not reused as-is.
- Existing marketing route group/layout for secondary pages.

## Data & permissions

- No schema changes. RLS unchanged.
- Admin gating (`/admin`, role check) unchanged — still enforced on the app host.
- Guest mode unchanged (lives on app host).
- Only external config: Supabase Auth Site URL / redirect allowlist (§4), Vercel
  domains + env (§8).

## Out of scope

- Migrating existing marketing pages onto `.site` (separate project — §10).
- Redesign of Landing G or the app beyond the routing/link/CSS-rename changes above.
- Fixing Landing G runtime errors — already resolved; compiles clean (§3).

## Design-system confirmations (locked)

1. **Naming:** unprefixed under scope — `.site .card`, `.site .heading-s`, `.site .btn`.
2. **Shared atoms:** `.site` references the app's `--primary` (brand blue is always
   consistent across web + app), `--success`, and the shared beige token — no redefined
   copies.
3. **Prune:** drop the unused D/F classes (`.panel`, `.sweep`, `.wordcard`,
   `.stepcard`, `.chart-line`, `.card-sm`, `.pill.line/.yellow/.pink`, `.h-sec`,
   `.ink-soft` class, `.text-le/.text-la`) from `site.css`. **`.mark` is kept** — it is
   used 3× in Landing G, so it stays as a standard brand utility.
