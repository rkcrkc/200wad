# SBI → Vercel migration plan (SEO Phase B)

Spec for sign-off **before coding** (per CLAUDE.md Feature Workflow). Consolidates
`INVENTORY.md`, `ANALYSIS.md`, `DAILY_ROTATORS.md`, `TEMPLATES.md`,
`EXTERNAL_RECS_CROSSREF.md`, and `ADVISOR_REVIEW.md`. Goal: move the legacy SiteSell (SBI)
site at `200words-a-day.com` onto the new Next.js/Vercel app, **preserving exact URLs (incl.
literal `.html`), entry traffic, and backlinks**, re-skinned in the `.site` brand layer.

> **Terminology (per advisor):** our traffic figures are **Webalizer *entry visits*** — a
> server-log metric, **not confirmed Google organic**. "Entry visit" ≈ a session that *landed*
> on that page. Where this doc says "traffic" it means entry visits unless GSC data is cited.
> GSC/GA4 will give the true organic picture once running (see below).

## Core principle — migrate first, improve later (do NOT mix)

The migration phase and any SEO/content rewriting are **separate phases** and must not be
conflated:
- **Migration phase (this plan):** same URL, same search intent, *substantially the same
  content*, on new tech with new appearance. The objective is that Google sees the *same page*
  at the *same URL* — just modernised. Nothing that changes what the page is *about*.
- **Improvement phase (later, after Google has absorbed the move):** rewrite, expand,
  consolidate, re-optimise. Only once rankings are stable on the new stack.

Doing SEO rewrites during migration muddies cause/effect if rankings move and risks Google
treating a URL as a different product.

## Cutover model (decided)

**Staging-first, batched build, single delayed apex switch.**
- The apex DNS move (SiteSell → Vercel) is **gated separately** and happens later. Until then,
  **SBI stays the live production site** (satisfies Rec #10).
- We build the **entire** site on a Vercel **staging domain** (`*.vercel.app`) in
  **prioritized batches** (traffic order). Everything is ready before the switch.
- **Proxy fallback** (Vercel `rewrites` → SBI origin) covers any not-yet-built path on staging
  during the build, so nothing 404s while we work down the list.
- When the apex finally points at Vercel, the site is complete; proxy fallback remains as a
  safety net for the long tail until verified, then removed.

## Guardrails from the external recs (baked in)

- **Full crawl before anything ships** (Rec #1): capture per-URL status/title/description/
  canonical/internal-links/asset refs — the sitemap alone misses live URLs (29 trafficked
  pages aren't in it).
- **Preserve ALL assets, not just images** (Rec #6): PDFs/MP3s/audio/cartoons/downloads keep
  their **original URLs** (served or 301'd) — external sites & Google Images link direct.
- **Master `OLD → ACTION → NEW` CSV** (Rec #4): one row per URL, action ∈ {KEEP, 301, HOLD, REMOVE}.
- **Staging must be `noindex` + robots-blocked**, and that must **not** survive launch (Rec #8).
- **New `app/sitemap.ts`** + submit via GSC (Rec #9).
- **Connect GSC now** (Rec #3): in progress (connected 2026-09-17, still processing).
  **Backlinks are deferred, not blocking** — GSC keeps accruing while we build. The **backlink
  review checkpoint** happens later (once GSC has data and *before* the HOLD→REMOVE tail is
  finalised and before launch); it does **not** gate starting the verb template. Until then the
  `Backlinks`/`Indexed?` columns in `url-map.csv` stay empty and the tail stays **HOLD**.
- **Install GA4 on the *old* SBI site NOW** (advisor #4): the site has no analytics history.
  Add GA4 to the live SiteSell pages immediately and let it run for weeks *before* cutover, then
  **keep the same GA4 property** on the new site for before/after continuity. Target state:
  **Webalizer + GA4 + GSC all running on SBI before the switch.**
- **HOLD, don't delete** (advisor #2): the ~639 never-in-entry-logs pages are **not** auto-retired.
  They move to a **HOLD** bucket pending evidence (see Phase 0.3). Deleting cheap static pages has
  little upside and real downside if they hold links/impressions we can't yet see.
- **Migration ≠ rewrite** (advisor #13): enforce the Core Principle above at every batch.
- **Decommission gate** before cancelling SBI (Rec #10), and keep SBI live **≥ 2–3 months** after
  cutover (advisor #12).
- **Full content archive** of SBI HTML + assets before any decommission (Rec #2).

## Phase 0 — Capture & mapping (no rendering yet)

1. **Crawl** the live SBI site (Screaming Frog/Sitebulb or scripted) → CSV: URL, status, title,
   meta description, canonical, internal links, and **every asset reference** — not just HTML
   links but **CSS, JS, images, PDFs, MP3/audio, ZIP/downloads**, plus **redirects and
   canonicals followed** (advisor #9). Merge with `inventory.csv` + `traffic_by_page.csv`.
2. **Asset inventory**: full list of images (5,071 in sitemap) + non-image assets (PDF/MP3/
   audio/cartoon/ZIP/download). Flag externally-linkable assets (Google Images, backlinks).
3. **Master URL map CSV** (`url-map.csv`) — one row per **discovered** URL (2,034 sitemap +
   29 non-sitemap; advisor cites ~2,063 total), columns (advisor #8):
   `OLD URL | Action | NEW URL | Family | Template | Entry visits | GSC clicks | GSC impressions |
   Backlinks | Indexed? | Assets | QA status | Notes`. Action ∈ {KEEP, 301, **HOLD**, REMOVE}.
   Buckets seeded from ANALYSIS:
   - **KEEP/native**: ~600–770 (verb-conjugation, daily lessons, top bespoke, course landings).
   - **301**: the 29 non-sitemap URLs (e.g. `/privacy-policy.html` → `/privacy`), renamed pages,
     comment-form artifacts → parent.
   - **HOLD (pending evidence)**: the 639 never-in-entry-logs + near-zero families (proverb-a-day,
     travel-word, german-word-a-day dead pages). **Not deleted.** A URL only moves HOLD → REMOVE
     after the **pre-delete evidence check** below clears it. Default to KEEP when cheap/static.
   - **REMOVE**: only after the evidence check; expect this set to be small.
   **Pre-delete evidence check** (all must be clear before any REMOVE — advisor #2): (a) zero GSC
   impressions & clicks; (b) no external backlinks; (c) not indexed in Google (`site:` / GSC);
   (d) no SiteSell/server entry traffic; (e) no direct asset links from the page; (f) no internal
   links pointing to it; (g) not a member of a content family we're keeping.
4. **Archive** all page HTML + assets to cold storage.
5. **GSC**: confirm verification; export **Links (backlinks)** + performance baseline when
   ready → adjust KEEP/301/HOLD for any highly-linked page. *(Checkpoint tomorrow.)*
6. **GA4 on old SBI now** (advisor #4): ✅ **DONE.** GA4 property `G-CPWN94Q9E2` installed on
   the live SiteSell site and firing (verified in Realtime across home, verb, course-landing and
   daily-lesson pages); the same property will carry over to Vercel post-cutover for before/after
   continuity. Install mechanics & a migration-relevant finding:
   - **The site is a mix of BlockBuilder and classic SiteBuilder pages** — this split matters for
     the migration itself, not just the tag.
     - **BlockBuilder pages (BB1 + BB2)** carry the tag automatically via the BlockBuilder
       **Sitewide Head Section** (delivered as shared block `shared_blocks.108284902#end-of-head`,
       proper `<head>` placement). One paste covered the whole BlockBuilder set.
     - **Classic SiteBuilder pages** (the home page `/`, the `daily-italian-lesson.html` hub, and
       an unknown number of older pages) have **no Head field** and are *not* reached by the
       Sitewide block. These were covered one-by-one by pasting the snippet at the top of the
       page's **Page Text** (renders in `<body>`, which still fires gtag fine). Do **not** force
       classic→BB2 conversion — it errors on legacy `align="middle"` markup and risks mangling
       the page.
   - **Coverage is partial by design.** All BlockBuilder pages + key classic hubs are tracked;
     the long tail of classic pages is **not** hand-tagged. This is acceptable because **GSC**
     captures organic clicks/impressions for every indexed URL with no per-page tag — GSC, not
     GA4, is the SEO baseline of record; GA4 is the behavioural cross-check.
   - **EEA consent:** SBI's GDPR Cookie Consent Widget is **on** (notice bar, bottom). Note it is
     a *notice only* — it does not gate cookies or support Google Consent Mode. Full/granular
     Consent Mode is **deferred to the new Vercel site**; not worth wiring into the retiring SBI
     site for a short baseline window.
   - **Legacy artefact (ignore):** old pages also load `ssl.google-analytics.com/ga.js`
     (pre-2013 Universal Analytics, no account behind it) — harmless, does not conflict with GA4.

## Phase 1 — Infrastructure

- **Proxy fallback**: add `rewrites` in `next.config.ts` → SBI origin for unmatched
  `*.html` (currently no rewrites exist). Scoped so built routes win.
  - **Origin-reachability test (do BEFORE launch — advisor #5):** once the apex points at
    Vercel, `200words-a-day.com` resolves to *Vercel*, so the rewrite must target the SBI
    origin by a name that still reaches SiteSell — **not** the apex (that would loop
    Vercel→Vercel). Target the SBI origin IP/host directly (`173.247.218.244`, Host header
    preserved) or a SiteSell-provided origin hostname. **Prove it now on staging:** request an
    intentionally *unbuilt* legacy URL on the Vercel staging domain and confirm it returns
    **HTTP 200 with the correct legacy content** proxied from SBI. Document the exact origin
    target used. This must pass before any apex switch.
- **`.html` routing**: serve literal `.html` paths in the App Router.
- **`.site` layout**: one shared marketing chrome (header/nav/footer/search) replacing all SBI
  `document.write` chrome + Google CSE + `/ssjs/ldr.js` (all disposable — `TEMPLATES.md`).
- **Content model**: templated families → structured data (Supabase, mirroring the blog
  pattern) + template components; bespoke pages → MDX/React in-repo. Render **ISR/SSG** for
  static content; rotator hubs render dynamically (below).
- **Image/asset pipeline**: re-host originals to Supabase Storage; rewrite internal `<img>`;
  **preserve original asset URLs** via serve-or-301 so external/Google-Images links survive.
- **`app/sitemap.ts`** (host-aware, like `robots.ts`) + keep `robots.ts` correct per host.
- **Staging hygiene** (advisor #10 — reverse the priority): **Vercel deployment/password
  protection is the PRIMARY guard** (staging must not be crawlable or publicly reachable at
  all), with `noindex` + blocked `robots.txt` as secondary defence-in-depth. Explicit
  **launch-flip checklist** so none of it (password, noindex, block, staging canonicals) leaks
  to prod, and so prod ends up indexable with correct canonicals.
- **Internal-link capture** (advisor #14): from the crawl, record internal-link **counts** into
  each major landing page / family (French landing pages, verb hubs, vocabulary hubs, course
  pages, daily-lesson hubs) as a **pre-migration baseline** to compare against post-launch.

## Phase 2 — Batched migration (traffic-priority order)

Per ANALYSIS phasing. Each batch: build template → import content → re-host assets → QA
(states, mobile, metadata, redirects) → mark rows KEEP in `url-map.csv`.

1. **verb-conjugation** (766 pages, 48.7% of entry traffic, +42% YoY) — the engine. Build this
   template **first**. Consistent structure (conjugation tables + example sentences).
   **Preserve the SEO signal per page (advisor #6):** carry over the **title, H1, explanatory
   copy, full conjugation content, canonical URL, internal links, image `alt` text, and
   metadata**. Modernise *presentation* first; improve *content* only later (Core Principle) —
   don't redesign so drastically that Google sees a different product at the same URL.
2. **daily-italian-lesson** dated pages (+117% YoY) + the **rotator hubs** (see below).
   Apply the same signal-preservation rule as verb pages (title/H1/canonical/copy/alt/metadata).
3. **home + course landings** (brand/navigational; PayPal decision applies).
4. **top OTHER/bespoke + lesson(other)** — hand-migrated long-form.
5. **X-for-word lessons** (172, templated).
6. **Fading-but-real**: word-a-day / course-tools survivors (migrate only trafficked ones).
7. **Retire batch**: 301/REMOVE per `url-map.csv`.

### Rotators (12 hubs, 3 schemes — `DAILY_ROTATORS.md`)
**Crawl corrected the count 9 → 12** — the full crawl added the 3 `getDate()`-driven
**travel-word** hubs (`french/spanish/german-travel-word.html`) to the Scheme-C set (detected
by JS signature, not `<iframe>` tag). Reimplement each hub as a **dynamic SSR page** computing
today's target and rendering it **inline (no iframe)**, at the stable hub URL. Preserve mapping
data (`daily-rotators/rotator-maps.json` for ES/FR daily; date-string for IT; `getDate()` for
the Scheme-C word/proverb/**travel-word** hubs). Numbered target families become the hubs' data
source (fold in), not standalone pages. `spanish-proverb-of-the-day.html` is **static** —
migrate as a normal page. The crawl also confirmed **4 live `-code` embed-source pages**
(`daily-{french,spanish,italian,german}-lesson-code.html`, flagged in `url-map.csv`) — see
open decision #3.

## Phase 3 — Launch & verify

- **Automated pre-launch QA sweep (advisor #11):** take the full `url-map.csv` URL list and
  auto-test **every** URL — first against **live SBI** (baseline) and again immediately after
  the switch against **Vercel** — flagging: 404, 500, unexpected redirect, redirect **chains**,
  wrong/missing canonical, missing `<title>`, missing H1, page **dramatically shorter** than
  baseline, missing image, missing MP3/PDF/asset, stray `noindex`, blocked-by-robots. Nothing
  ships with open flags. (Scripted checker over the master list; keep the before/after diff.)
- Flip apex DNS → Vercel (gated separately, when ready). Remove staging password/`noindex`/block;
  verify prod is indexable with correct canonicals.
- **Internal-link diff (advisor #14):** re-crawl post-launch and compare internal-link counts
  into major landing pages/families against the Phase-1 baseline; investigate any big drops.
- Submit `sitemap.xml` via GSC; monitor coverage, redirects (no chains), Core Web Vitals,
  entry-visit continuity vs the Webalizer/GA4 baseline.
- Keep proxy fallback until the tail is verified, then remove.

## Phase 4 — Decommission gate (do NOT cancel SBI until all true)
Keep SBI live **at least 2–3 months** after cutover (advisor #12), monitoring weekly for ~the
first 2 months. Only then, and only when **all** of these hold: every URL resolved & verified
(KEEP/301/HOLD-or-REMOVE); all assets preserved; forms/email replaced; redirects confirmed in
GSC with no errors; **HOLD bucket adjudicated** (each HOLD URL passed the pre-delete evidence
check or was kept); entry/organic traffic stable vs baseline across the full window.

## Open decisions (resolve at review; recommendations given)

1. **Rotator render** — recommend **SSR inline** (vs 301-to-target vs iframe).
2. **Broken German daily lesson** — recommend **build a working verb-based rotator** (like
   ES/FR) rather than reproduce the broken dated one; or 301 the hub. *(Decide.)*
3. **Syndication / bare-embed variant** — external sites embed these hubs via iframe. The crawl
   **confirmed 4 live `-code` embed-source pages** (`daily-{french,spanish,italian,german}-
   lesson-code.html`, still trafficked — FR 4,404 visits) that hand out the copy-paste iframe
   snippet. Recommend **support a bare `?embed` route** to preserve those backlinks/referrals;
   or let embeds break.
4. **PayPal course/commerce pages** (`learn-french`, `order-page`, `french-flashcard`) —
   decision **can wait** (advisor #15), but **do not delete** a sales URL that holds backlinks/
   traffic. Preserve the SEO endpoint and **301 the old purchasing URL → the equivalent modern
   product/checkout**, routing the customer into the app's own purchase flow. (Keeping raw
   PayPal forms is the fallback; dropping outright is off the table where links/traffic exist.)
5. **TrafficWave email capture + `/dyn/C2/` comment forms** — recommend **drop/replace**
   (dead 3rd-party / SBI-only endpoints); comment-form artifacts → 301 to parent.
6. **Backlink data** — incorporate GSC Links report at tomorrow's checkpoint before finalising
   the KEEP/301 tail.

## Go-ahead conditions (advisor sign-off — must be met before/at launch)

The advisor rated the plan strong overall (architecture, SEO, sequencing, asset preservation)
and set **three hard prerequisites**:
1. ✅ **GA4 installed on the existing SBI site** (property `G-CPWN94Q9E2`, firing) and accruing
   data before cutover (Phase 0.6). **Met.**
2. **Proxy fallback proven** to work when the apex no longer points at SBI — i.e. the
   Vercel→SBI-origin rewrite returns real legacy content, no loop (Phase 1 origin-reachability
   test).
3. **The 639 pages are NOT permanently retired** until GSC/backlink/indexation evidence exists
   (Phase 0.3 HOLD bucket + pre-delete evidence check).

## First build target
The **verb-conjugation template** (Phase 2.1) — half the project's SEO value in one family.
