# Full-crawl spec — capture every SBI signal before anything ships

Closes the gap flagged in `EXTERNAL_RECS_CROSSREF.md` #1 and delivers the master
`OLD → ACTION → NEW` sheet (advisor #8). Today we have the *sitemap* (2,034 URLs) +
*traffic* but **no per-page title/description/canonical/status/asset/internal-link data**.
This crawl produces one authoritative row per live URL with every SEO signal we must
preserve and every asset we must keep alive.

**Decided approach (signed off):** scripted Python crawler; **full crawl of all ~2,063
URLs** (incl. the 639 HOLD long-tail).

## Inputs (already in this folder)

- `paths.txt` / `all-urls.txt` — 2,034 sitemap URLs (seed list)
- `inventory.csv` — `path, family, type` (join key = `path`)
- `traffic_by_page.csv` — entry visits etc. per `path`, **incl. 29 `(not in sitemap)`
  URLs** to probe explicitly
- `sbi-sitemap.xml` — 5,071 `<image:loc>` entries (cross-check image discovery)

## What to capture per URL

| Field | Source | Why |
|---|---|---|
| `url` / `path` | crawl | join key |
| `http_status` | response | KEEP/301/404 triage; QA baseline |
| `redirect_target`, `redirect_chain_len` | Location hdrs | catch existing chains before we add our own |
| `title` | `<title>` | signal to preserve (advisor #6) |
| `meta_description` | `<meta name=description>` | signal to preserve |
| `canonical` | `<link rel=canonical>` | detect self/cross canonicals; migration-killer if wrong |
| `h1`, `h1_count` | `<h1>` | signal to preserve; flag missing/multiple |
| `robots_meta` | `<meta name=robots>` | find pre-existing noindex |
| `word_count` | rendered body text (chrome stripped) | "dramatically shorter page" QA check post-migration |
| `lang` | `<html lang>` | per-family correctness |
| `img_count`, `img_urls` | `<img src>` incl. `.pagespeed.` | image re-host list; die with SBI |
| `asset_count`, `asset_urls` | `<a href>`/`<link>` to `.pdf .mp3 .zip .doc .swf` etc. | **non-image assets** (advisor gap #6) — externally linked |
| `internal_links_out` | `<a href>` same-host | build inbound-count baseline (advisor #14) |
| `external_links_out` | `<a href>` other-host | find PayPal/TrafficWave/dead 3rd-parties |
| `has_paypal`, `has_trafficwave`, `has_comment_form` | form `action` scan | flag dynamic bits (`TEMPLATES.md`) |
| `has_rotator_iframe` | `<iframe>` scan | flag the 9 rotator hubs — do **not** freeze "today" |
| `fetched_at` | crawl | provenance |

## Scope & discovery (three passes)

1. **Seed** — all 2,034 sitemap paths.
2. **Probe** — the 29 `(not in sitemap)` trafficked paths from `traffic_by_page.csv` +
   known artifact patterns (`*-comment-form.html`, `thank-you-comment-form.html`), so
   nothing trafficked is missed.
3. **Link-follow (1 hop, same-host)** — from every fetched page, collect same-host
   `<a href>` not already in the set → catches further orphans. **Ignore `document.write`
   SBI chrome nav** (it isn't in static HTML anyway, which is what we want).

## Fetch method — raw HTML, no JS render

Fetch raw HTML (`requests`), parse with BeautifulSoup. The signals we need —
`pagespeed` image URLs, canonical, title, asset links — are all in the **raw** HTML.
SBI chrome is injected by `document.write` and we discard it anyway, so headless
rendering adds cost and risk for nothing. Rotators are handled by *flagging* the
`<iframe>`, not rendering it — the rotator logic is reverse-engineered in
`DAILY_ROTATORS.md`.

## Output & merge

- `crawl.csv` — keyed on `path`, one row per discovered URL (~2,063+).
- **`url-map.csv`** — left-join `crawl.csv` ← `traffic_by_page.csv` ← `inventory.csv` on
  `path`, with the full advisor-#8 column set:
  `OLD URL | Action | NEW URL | Family | Template | Entry visits | GSC clicks |
  GSC impressions | Backlinks | Indexed? | Assets | QA status | Notes`.
  `Action` seeded by rule (KEEP ~600–770, 301 the 29 + comment artifacts, HOLD the 639 +
  dead numbered families). `GSC clicks/impressions/Backlinks` filled at the GSC
  checkpoint; `Indexed?` from a later `site:` pass. **Both left empty in this crawl pass.**
- `asset-inventory.csv` — every unique image + non-image asset URL, referencing pages,
  `.pagespeed.` flag — for the re-host/preserve pipeline.

## Technical constraints

- **Politeness:** ≤2 concurrent, ~0.5–1s delay, identifying User-Agent. This is a live
  production site (~123k visits/mo) — do not hammer it. ~2,063 requests, a few minutes.
- **Follow redirects** but record each hop (chain detection).
- **Idempotent & resumable** — cache raw HTML to disk (feeds the Phase-0 "full content
  archive" for free) so re-parsing needs no re-fetch.
- **Origin, not apex-sensitive** — apex still serves SBI today, so crawl
  `https://www.200words-a-day.com/…` directly. (Distinct from the *proxy* origin test,
  which is post-cutover.)

## Deliverables

1. `crawl.py` — the crawler (seed+probe+1-hop, raw fetch, parse, cache).
2. `crawl.csv` — per-URL signals.
3. `asset-inventory.csv` — images + non-image assets.
4. `url-map.csv` — merged master (the advisor #8 deliverable).
5. `/cache/` — raw HTML archive (doubles as the content-archive start).
6. `CRAWL_NOTES.md` — orphans found, redirect chains, canonical anomalies, dynamic-bit
   flags.
