# External migration recommendations — cross-reference vs our approach

A third party supplied 10 "non-negotiable requirements" for the SBI→Vercel migration. Below,
each is checked against what we've already established (`INVENTORY.md`, `ANALYSIS.md`,
`DAILY_ROTATORS.md`, `TEMPLATES.md`) and the intended cutover approach (phased + Vercel proxy
fallback, `.html` preservation, `.site` re-skin, image re-hosting, sitemap + 301/retire map).

Legend: ✅ aligned · 🟡 partial/gap · 🔴 conflict/needs decision.

| # | Recommendation | Status | Notes |
|---|---|---|---|
| 1 | **Full crawl before DNS** (Screaming Frog/Sitebulb → CSV of every URL, status, title, description, canonical, image, PDF, MP3, internal links) | 🟡 **gap** | We inventoried from the **XML sitemap** (2,034 URLs) + family/type, and Webalizer traffic — but we have **no per-page title/description/canonical/status/asset/internal-link crawl**. The sitemap also misses live URLs: ANALYSIS found **29 trafficked pages not in the sitemap** — a crawl catches those. **Add a crawl step.** |
| 2 | **Export SiteSell sitemap + all content** | 🟡 **partial** | Sitemap ✅ (`sbi-sitemap.xml`). Full-content archive ❌ — we only pulled 28 sample pages + rotator source. **Add: archive all page HTML + assets before decommission.** |
| 3 | **Export GSC data first** (Pages/Queries/Clicks/Impressions/position, External + Internal Links) | 🔴 **conflict** | User confirmed the site was **never connected to GSC/GA**, so there is no history to export. We substituted **SBI Webalizer entry-visits (6 yrs)** for the "which pages matter" question. **Backlinks remain a genuine gap.** Action: **connect GSC to the live SBI site NOW** to (a) capture the Links/backlinks report the rec wants, (b) get a pre-cutover baseline, (c) submit the new sitemap later (#9). |
| 4 | **Master OLD URL → ACTION → NEW URL sheet** (KEEP / 301·308 / REMOVE, nothing vanishes) | ✅ **aligned — make it the deliverable** | This *is* our "301 map + retire list", but not yet built per-URL. Our buckets already exist conceptually (migrate ~600–770 / bulk-301 / retire 639+). **PLAN deliverable: one row per URL for all 2,034 + the 29 non-sitemap URLs.** Use 301 (permanent) for GET pages; 308 only if a method must be preserved (n/a here). |
| 5 | **Preserve high-traffic URLs exactly, incl. `.html`** | ✅ **aligned** | Core assumption from day one. Next.js serves literal `.html` routes. |
| 6 | **Preserve old assets — cartoons, audio, PDFs, downloads** (external sites & Google Images link direct) | 🟡 **gap** | We planned **image** re-hosting to Supabase, but (a) never inventoried **PDF/MP3/audio/cartoon/download** assets, and (b) re-hosting **changes image URLs**, which breaks direct external / Google-Images links. **Adjust: inventory all non-image assets; preserve or 301 the *original* asset URLs, not just internal `<img>` refs.** |
| 7 | **Build entire Vercel version on staging (`*.vercel.app`) first; production stays on SiteSell during test** | 🟡 **reconcile** | Compatible with phased+proxy, but adds discipline we hadn't stated: **validate on staging before touching DNS.** Staging can use the proxy fallback to SBI for not-yet-built pages. Open decision remains: *full-build-then-switch* (rec's lean) vs *phased live cutover once high-value families done, proxy covering the tail*. |
| 8 | **Staging `noindex` / blocked `robots.txt` / staging canonicals / password must NOT survive launch** | 🟡 **gap** | Not yet addressed and a classic migration-killer. Our `robots.ts` is host-aware. **Add launch checklist: staging = noindex + robots-blocked (+ optional basic-auth); production = indexable, correct canonicals; verify the flip at launch.** |
| 9 | **Generate proper XML sitemap on new site + submit via GSC** | 🟡 **partial** | We planned sitemap regeneration; **no `app/sitemap.ts` exists yet.** Submission depends on connecting GSC (#3). **Add: build `app/sitemap.ts`; connect + submit.** |
| 10 | **Do NOT cancel SiteSell at launch — keep for transition** (verify pages, email, forms, downloads, old functionality) | ✅ **aligned — strongly** | Our **proxy fallback depends on SBI staying live** as origin. Ties to the dynamic bits we found (PayPal, TrafficWave, `/dyn/C2/` comment forms — `TEMPLATES.md`). **Add an explicit decommission gate:** don't cancel SBI until every URL is KEEP/REDIRECT/REMOVE-resolved & verified, assets preserved, forms/email replaced, redirects confirmed in GSC, and traffic is stable. |

## Net changes to our plan (new/adjusted workstreams)

1. **Add a full crawl** (Screaming Frog/Sitebulb or our own crawler) to capture per-page
   **title / description / canonical / HTTP status / internal links / asset references** for
   all URLs — including ones outside the sitemap. Feeds #4 and metadata preservation.
2. **Broaden asset preservation beyond images:** inventory PDF/MP3/audio/cartoon/download
   files; **keep original asset URLs alive** (serve or 301) because external sites & Google
   Images link to them directly. Don't only re-host+rewrite internal `<img>`.
3. **Connect Google Search Console to the live SBI site now** — closes our backlink gap,
   gives a pre-migration baseline, and is the channel for post-launch sitemap submission +
   monitoring. (Resolves the rec-3 conflict pragmatically.)
4. **Full content archive** of all page HTML + assets before any decommission (#2).
5. **Staging discipline** (`*.vercel.app`, noindex + blocked robots, no leaking canonicals)
   with an explicit **prod-launch flip checklist** (#7, #8).
6. **Build `app/sitemap.ts`** and submit via GSC (#9).
7. **Master `OLD → ACTION → NEW` CSV** as a first-class deliverable covering every URL (#4).
8. **Formal decommission gate** before cancelling SBI (#10).

## Where our work already exceeds the generic recs
- **Rotator system** — 9 `-of-the-day`/daily-lesson hubs across 3 schemes, one broken
  (`DAILY_ROTATORS.md`). Generic crawl-based advice would freeze "today" as static and silently
  break these. Our biggest migration landmine, invisible to the recs.
- **Traffic concentration** — 6-yr Webalizer analysis (top ~600 pages = 95%; verb-conjugation
  48.7% +42% YoY) gives an evidence-based **phasing order** the recs don't provide.
- **Template tiering & disposable chrome** — `TEMPLATES.md` already maps what to templatise,
  strip, and hand-migrate.
