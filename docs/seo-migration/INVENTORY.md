# SBI → New Site Migration — Content Inventory (SEO Phase B)

Working notes for the card **"🚚 Migrate high-traffic SBI pages to new site (SEO Phase B)"**.
This documents what actually exists on the legacy SBI site so we can decide, per family,
whether to **migrate**, **bulk-301 to a hub**, or **retire**.

## Source of truth

- **Authoritative URL inventory:** SBI's own XML sitemap, `https://www.200words-a-day.com/L9Ejn5e5.xml`
  (last updated 2026-04-07). Downloaded to `sbi-sitemap.xml`.
- **Counts (literal, from the XML):** **2,034 pages** (`<url>` blocks) + **5,071 images**
  (`<image:loc>`). The card's "~1,912" was in the right ballpark; 2,034 is the real number.
- Derived files in this folder:
  - `all-urls.txt` — every `<loc>` (2,034)
  - `paths.txt` — unique host-stripped paths (2,034)
  - `inventory.csv` — `path, family, type` for all 2,034 (the working spreadsheet)

## Site is big and worth doing carefully

SBI Webalizer "Summary by Month" (site-wide totals, no per-page export):
~76k–182k **visits/month** in 2026 (e.g. Jul 2026 = 181,658 visits / 251,645 pages).
This is a substantial organic asset — preserving URLs + equity matters.

## No analytics history

- The site was **never** connected to Google Analytics or Search Console.
- Only traffic data is SBI's built-in **Webalizer** stats: site-wide monthly summary, plus
  per-month reports (each a separate page) that contain a **"Top URLs"** list — the only
  source of **per-page** traffic. No export; must be read/scraped per month.
- Per-page **keyword + rank** targeting exists in SBI "Search Engine HQ" (Submit-Spider-List
  table): `Page Name → target Keyword → Google/Yahoo/Bing rank`. Useful for preserving
  keyword intent; most rank cells are stale (`>>>`).

## Content families (76% is templated)

| Family | Type | Count | Example |
|---|---|---:|---|
| verb-conjugation `lang-verb-X.html` | TEMPLATED | 766 | `/french-verb-avoir.html` |
| daily-italian-lesson (dated) | TEMPLATED | 366 | `/10Apr-daily-italian-lesson.html` |
| **OTHER / bespoke** | bespoke | 366 | (see below) |
| X-for-word lessons | TEMPLATED-ish | 172 | `/spanish-for-train.html` |
| proverb-a-day `Nlang-proverb-a-day` | TEMPLATED | 86 | `/10spanish-proverb-a-day.html` |
| travel-word `Ntravel-lang` | TEMPLATED | 73 | `/10travel-spanish.html` |
| course landing | bespoke | 36 | `/learn-spanish.html` |
| french-word-a-day `N.` | TEMPLATED | 31 | `/10.french-word-a-day.html` |
| spanish word-of-day `N.html` | TEMPLATED | 31 | `/10.html` |
| german-word-a-day `N.` | TEMPLATED | 30 | `/10.german-word-a-day.html` |
| lesson (other) | bespoke | 28 | |
| course tools | bespoke | 22 | flashcard/turbobooster/pics |
| verbs/grammar (bespoke) | bespoke | 8 | `/estar.html`, `/ser-and-estar-in-spanish.html` |
| blog | bespoke | 7 | |
| proverb (other) | bespoke | 7 | |
| word-of-day (other) | bespoke | 3 | |
| ezine | bespoke | 1 | (many more hide in OTHER as `...newzineN.html`) |
| home | mixed | 1 | `/` |

**TEMPLATED (bulk scrape+render): ~1,555 (76%). Bespoke/mixed: ~479 (24%).**

Implication: a small number of per-family templates (verb table, word-of-day, proverb,
travel word, italian lesson, X-for-word) covers three-quarters of the site. This is **not**
1,900 hand migrations.

## The "OTHER / bespoke" tail (366) has sub-families + junk

- **E-zine back-issues:** `200_Words_a_Day-learn-languages-newzineN.html` — likely bulk-retire or bulk-migrate as an archive.
- **FSI course pages:** `fsi-french-volX-N.html`, `foreign-service-institute-*` — templated-ish sub-family.
- **Genuine bespoke articles:** `/tu-and-vous.html`, `/michel-thomas.html`, `/french-idioms-using-air.html`, `/spanish-memory-trigger.html`, etc.
- **Retire (junk / transactional / technical):** `z-tech-*`, `paypal-payment-cxl.html`,
  `report2-fp.html`, `Upload-swf-*.html`, `obj-qt-trust.html`, `try.html`, `really.html`,
  `language-learning-survey*`, install-error pages.

## Open data gaps (need the user)

1. **Per-page traffic** — pull SBI Webalizer "Top URLs" for the last ~3–6 months to rank
   pages/families by actual visits (drives migrate-vs-bulk-vs-retire for the long tail).
2. **Backlinks** — no GSC Links / Ahrefs yet. Even modest-traffic pages with external links
   should be preserved. Decide whether to source any backlink data.

## Key technical facts for the build

- Every URL ends in literal `.html`; must be preserved exactly (route or rewrite).
- Images are on SBI with PageSpeed-mangled names
  (e.g. `.../images/xestar-in-spanish.jpg.pagespeed.ic.*.jpg`) — must be re-hosted
  (Supabase Storage) with alt text preserved.
- Apex `200words-a-day.com` currently still serves SBI (pre-cutover).
