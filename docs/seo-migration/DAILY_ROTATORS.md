# "…of-the-day" rotators — how they actually work (and migration impact)

A whole class of `/…-of-the-day.html` / `/daily-<lang>-lesson.html` hub pages are **not**
content pages. Each is a thin page whose body is injected by client-side JS as an `<iframe>`
pointing at a *different underlying page each day*. This was discovered because it would
otherwise cause a broken migration (freezing "today" as static content). Raw source captured
in `/tmp` during investigation; day→page maps saved to `daily-rotators/rotator-maps.json`.

**There are 12 active rotator hubs across 3 schemes** (originally only the 4 daily-lesson
hubs were known; a first pass found 9; the full crawl — see `CRAWL_SPEC.md` — added the 3
**travel-word** hubs). One sibling, `/spanish-proverb-of-the-day.html`, is a normal **static**
page — not a rotator — so don't assume the whole `-of-the-day` naming class rotates.

The crawl detects rotators by their JS signatures (`getDate()` / `dailyURLS` / `dailytext`
/ `innerHTML="<iframe"`), not by parsed `<iframe>` tags — the iframe is injected at runtime,
so a naive tag scan misses every hub. The 12 hubs are listed by scheme below; the crawl also
flagged `/link-to-us.html` (embeds a live word-of-day *widget demo*, not a content hub —
migrate normally) and the 4 `-code` syndication pages (below).

## Three schemes

**Scheme A — day-of-year (1..366) → verb page, via a hardcoded map**
```js
x = Jan 1 (this year);  y = today;  z = round((y-x)/86400000);  todaystr = z+1;   // 1..366
iframe.src = url + dailyURLS[todaystr];   // dailyURLS[1..366] -> "<lang>-verb-X.html"
```
- `/daily-spanish-lesson.html`: 366 slots → **350 distinct** `spanish-verb-*.html` targets.
- `/daily-french-lesson.html`:  366 slots → **360 distinct** `french-verb-*.html` targets.
- i.e. the Spanish/French daily lesson IS the verb-conjugation content, rotated.

**Scheme B — day+month string → dated page**
```js
todaystr = dayNum + monthName;            // e.g. "10Apr"
iframe.src = url + todaystr + "-daily-<lang>-lesson.html";
```
- `/daily-italian-lesson.html`: **367** dated pages exist in the sitemap → works.
- `/daily-german-lesson.html`:  **only 2** dated pages exist → **broken** (iframes 404 on
  almost every day). Do not reproduce faithfully; build a working one or retire.

**Scheme C — day-of-month (1..31) → numbered page** (`todaystr = today.getDate()`)
```js
todaystr = today.getDate();               // 1..31
iframe.src = url + todaystr + "<suffix>"; // suffix per hub, see table
```
| Hub | iframe target pattern | Target family |
|---|---|---|
| `/word-of-the-day.html` | `/{1..31}.html` | spanish word-of-day (`N.html`) |
| `/french-word-of-the-day.html` | `/{1..31}.french-word-a-day.html` | french-word-a-day (`N.`) |
| `/german-word-of-the-day.html` | `/{1..31}.german-word-a-day.html` | german-word-a-day (`N.`) |
| `/french-proverb-of-the-day.html` | `/{1..31}french-proverb-a-day.html` | proverb-a-day (`Nlang`) |
| `/german-proverb-of-the-day.html` | `/{1..31}german-proverb-a-day.html` | proverb-a-day (`Nlang`) |
| `/french-travel-word.html` | `/{1..31}travel-french.html` | travel-word (`Ntravel`) |
| `/spanish-travel-word.html` | `/{1..31}travel-spanish.html` | travel-word (`Ntravel`) |
| `/german-travel-word.html` | `/{1..31}travel-german.html` | travel-word (`Ntravel`) |

**Key corollary:** the numbered families in `ANALYSIS.md` (`french-word-a-day N.`,
`spanish word-of-day N.html`, `german-word-a-day N.`, `proverb-a-day Nlang`, `travel-word
Ntravel`) exist **only as Scheme-C rotation targets** — exactly as verb pages are Scheme-A targets. Their near-zero
**entry visits** are expected (they're embedded, not landed on). Most are thin (95–135 words,
0 images — see `TEMPLATES.md`). Migration options mirror the daily lessons: render one hub
per language that shows today's word/proverb inline, and either retire the individual
numbered pages or keep them as the hub's data source.

## Why this matters for migration

1. **Reimplement the 12 rotator hub URLs as dynamic pages** (`generateMetadata` + server
   render), computing today's target and rendering that content **directly (SSR, no iframe)**.
   Keep the stable hub URLs (`/daily-spanish-lesson.html`, `/word-of-the-day.html`,
   `/french-travel-word.html`, etc.).
   Preserve the day→page mapping data (`rotator-maps.json` for ES/FR daily; date-string rule
   for IT; day-of-month `getDate()` rule for the Scheme-C word/proverb hubs).
2. **Verb family is the true engine.** It powers direct verb traffic *and* the ES/FR daily
   lessons. Highest migration priority, unchanged.
3. **Metric integrity confirmed.** iframe loads inflate the target pages' **page views**
   (each verb/dated page is loaded as "today" once per cycle), but **entry visits** only count
   direct organic landings. All prioritisation in ANALYSIS.md uses entry visits, so it is
   **not** contaminated by iframe self-traffic. (Corollary: ignore page-view counts for
   verb/dated pages — they're inflated.)
4. **Syndication / hidden backlinks — now confirmed by the crawl.** These pages promote "add
   this daily lesson to your own website" via copy-paste iframe code. The crawl found **4 live
   `-code` embed-source pages**, all with real entry traffic:
   `/daily-french-lesson-code.html` (4,404), `/daily-spanish-lesson-code.html` (787),
   `/daily-italian-lesson-code.html` (636), `/daily-german-lesson-code.html` (0). They're
   flagged `embed/syndication source (decision #3)` in `url-map.csv` (seeded KEEP). External
   sites embed `https://www.200words-a-day.com/<page>` expecting a **bare, chrome-less** page.
   OPEN DECISION #3: keep serving an embeddable bare variant (`?embed`/bare route) for existing
   embedders — preserving those links/referrals + backward-compat — or drop it and let embeds
   break.

## Open decisions for the plan
- Daily rotator UX in the new site: render today's verb/lesson inline (recommended) vs
  redirect to the underlying page vs keep an iframe.
- German daily: build a working verb-based rotator (like ES/FR) or retire the URL (301).
- Bare/embeddable variant: support `?embed`/bare route for external syndicators, or not.
