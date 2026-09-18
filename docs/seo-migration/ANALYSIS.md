# SBI Traffic Analysis — 6 years (Sep 2020 → Sep 2026)

Basis for the migration shortlist. Data: 73 monthly SBI/Webalizer reports in `stats/`
(each caps at "Top 500" per section). Metric of record = **entry visits** (a session that
*landed* on that page — a Webalizer server-log metric, **not confirmed Google organic**; GSC/GA4
will give the true organic picture once running), cross-checked with page views. Pipeline:
`parse_stats.py` → `traffic_long.csv` / `traffic_by_page.csv`; `analyze.py` → `family_summary.csv`.

Caveat: "Top 500" cap means anything never in a monthly top-500 is, by definition, low
traffic — which is exactly the signal we need for the long-tail decision.

## Headline

- **The site is growing, not dying.** Monthly visits: 2023 trough ~47.7k/mo → 2025 ~81k/mo
  → **2026 ~123k/mo**. Last-12 vs prior-12 entry traffic is up strongly across the main
  families. This is a *rising* asset — the case for careful migration is strong.
- **Traffic is extremely concentrated.** Of 2,034 sitemap pages:
  | Share of traffic | Pages needed | % of sitemap |
  |---|---:|---:|
  | 50% | 86 | 4% |
  | 80% | 302 | 15% |
  | 90% | 462 | 23% |
  | 95% | 608 | 30% |
  → **~600 pages carry 95% of all entry-visit landings.**
- **639 sitemap pages never once reached a monthly top-500 in 6 years** → genuine long tail.
  **HOLD, don't auto-retire** (advisor): these move to a HOLD bucket pending GSC/backlink/
  indexation evidence before any REMOVE (see `PLAN.md` Phase 0.3). Absence from the entry-visit
  top-500 is not proof of zero value.
- **One family dominates:** verb-conjugation = **48.7%** of tracked entry traffic and **+42%**
  YoY. Migrating it well is ~half the entire project's SEO value.

## Family rollup (entry visits, 6-yr; YoY = last-12 vs prior-12)

| Family | Entry visits | Share | Pages w/ traffic | / sitemap | YoY |
|---|---:|---:|---:|---:|---:|
| verb-conjugation `lang-verb-X` | 1,761,035 | 48.7% | 676 | 766 | **+42%** |
| home `/` | 518,040 | 14.3% | 1 | 1 | −25% |
| OTHER / bespoke | 424,453 | 11.7% | 179 | 366 | +43% |
| daily-italian-lesson (dated) | 349,838 | 9.7% | 246 | 366 | **+117%** |
| lesson (other) | 148,911 | 4.1% | 24 | 28 | +30% |
| course landing | 130,222 | 3.6% | 24 | 36 | **+113%** |
| X-for-word lessons | 107,778 | 3.0% | 114 | 172 | +14% |
| french-word-a-day `N.` | 42,937 | 1.2% | 31 | 31 | −84% |
| blog | 34,404 | 1.0% | 6 | 7 | +99% |
| course tools | 31,461 | 0.9% | 19 | 22 | −38% |
| verbs/grammar (bespoke) | 24,699 | 0.7% | 8 | 8 | ~0% |
| word-of-day (other) | 11,508 | 0.3% | 3 | 3 | +114% |
| proverb (other) | 10,176 | 0.3% | 6 | 7 | +2% |
| spanish word-of-day `N.html` | 9,709 | 0.3% | 31 | 31 | +115% |
| ezine | 5,008 | 0.1% | 1 | 1 | +361% |
| (not in sitemap) | 3,632 | 0.1% | 29 | 0 | +397% |
| travel-word `Ntravel` | 556 | 0.0% | 11 | 73 | +602%* |
| proverb-a-day `Nlang` | 413 | 0.0% | 7 | 86 | n/a |
| german-word-a-day `N.` | 365 | 0.0% | 8 | 30 | n/a |

\* huge % on tiny base — ignore.

## Reading it

- **Migrate natively, priority order:** verb-conjugation (766, the engine, growing) →
  daily-italian-lesson (growing fast) → home + course landings (brand/navigational, landings
  growing) → top of OTHER/bespoke + lesson(other) → X-for-word lessons.
- **Fading but still real:** french/german/spanish word-a-day series, course tools. Migrate
  the handful that still get traffic; don't invest in the dead numbered pages.
- **Bulk-301 / retire:** the 639 never-trafficked pages, plus near-zero families
  (proverb-a-day, travel-word, german-word-a-day: hundreds of pages, ~no traffic).
- **`(not in sitemap)` = redirect work:** 29 URLs still pull traffic but aren't in the
  current sitemap — old/renamed URLs needing explicit 301s. Notables:
  - `/privacy-policy.html` (1,351) → map to new `/privacy`
  - `/conjugation-spanish-verbs.html` (258) → verb hub
  - `/translation-service.html` (204), `/recruitment-exceltra.html` (138)
  - many `*-comment-form.html` (SBI comment artifacts) → retire / redirect to parent page

## Scope crystallised

- **Native migration target: ~600–770 pages** (mostly verb-conjugation + daily lessons +
  top bespoke + course landings) = 95%+ of traffic.
- **Bulk-301/retire: ~1,270 pages** (the long tail + dead families + junk).
- Phased **proxy fallback** covers 100% during transition, so no page 404s while we work
  down the priority list.

## Next
Write `PLAN.md` (phased cutover, per-family SSG templates, image re-hosting, sitemap + 301
map + retire list), then build the verb-conjugation template first.
