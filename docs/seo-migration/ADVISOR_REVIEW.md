# Advisor review — points → changes incorporated

An external advisor reviewed the migration plan (the Notion card / `PLAN.md`) and gave detailed,
numbered feedback (points #2–#15 plus an overall assessment). The advisor's verdict: the plan is
**strong** on architecture, SEO, sequencing, and asset preservation, and mostly needs *hardening*
rather than rework. This file records each point and exactly where it landed.

Legend: ✅ incorporated · ➕ new workstream added.

| # | Advisor point | Change made | Where |
|---|---|---|---|
| 2 | Don't REMOVE the 639 long-tail pages yet — little upside, real downside if they hold links/impressions we can't see. Check evidence first. | ✅ Renamed the `REMOVE` bucket to **HOLD (pending evidence)**; added a 7-point **pre-delete evidence check** (GSC impressions/clicks, external backlinks, Google indexation, server entry traffic, direct asset links, internal links, content-family membership). A URL only goes HOLD→REMOVE after it clears. | `PLAN.md` Guardrails + Phase 0.3; `ANALYSIS.md` headline |
| 3 | "Organic traffic" is the wrong term — Webalizer **entry visits** ≠ Google organic. | ✅ Added a terminology note; renamed "organic traffic/landings" → **entry traffic/visits (Webalizer, not confirmed organic)** throughout; qualified "48.7% of **entry** traffic". | `PLAN.md` intro note; `ANALYSIS.md` basis + headline |
| 4 | Install **GA4 on the OLD SiteSell site now**; run for weeks; keep the same GA4 property after cutover for continuity (Webalizer + GA4 + GSC all running before switch). | ➕ Added as a Guardrail and **Phase 0.6**; also a Go-ahead condition. | `PLAN.md` Guardrails, Phase 0.6, Go-ahead conditions |
| 5 | Proxy fallback needs a **real technical test**: which hostname does Vercel use to reach old SBI after the apex points at Vercel? Avoid a loop; confirm HTTP 200 + correct legacy content before launch. | ➕ Added the **origin-reachability test**: target the SBI origin directly (IP `173.247.218.244`, Host header preserved) — never the apex; prove on staging with an unbuilt legacy URL returning 200 + correct content. | `PLAN.md` Phase 1 (proxy fallback); Go-ahead conditions |
| 6 | Verb pages — retain title, H1, copy, conjugation content, canonical, internal links, image alt, metadata. Modernise presentation first, improve content later; don't look like a different product. | ✅ Added explicit signal-preservation list to the verb batch (and the daily-italian batch). | `PLAN.md` Phase 2.1 & 2.2 |
| 8 | Master file needs columns: OLD URL, Action, NEW URL, Traffic, GSC clicks, GSC impressions, Backlinks, Indexed?, Assets, QA status. One row per discovered URL. | ✅ Rewrote `url-map.csv` spec with the full column set and Action ∈ {KEEP, 301, HOLD, REMOVE}. | `PLAN.md` Phase 0.3 |
| 9 | Crawler must follow CSS, JS, PDFs, MP3s, images, ZIP/downloads, redirects, canonicals — not just HTML links. | ✅ Broadened the Phase-0 crawl spec accordingly. | `PLAN.md` Phase 0.1 |
| 10 | Staging protection — password/deployment protection is PRIMARY; noindex secondary. Reverse the priority. | ✅ Made Vercel deployment/password protection primary, noindex/robots-block secondary defence-in-depth. | `PLAN.md` Phase 1 (staging hygiene) |
| 11 | Automated pre-launch QA: auto-test every URL before the DNS switch (SBI) and immediately after (Vercel); flag 404/500/redirects/chains/wrong canonical/missing title/H1/short page/missing image/MP3/PDF/noindex/blocked robots. | ➕ Added an **automated QA sweep** step. | `PLAN.md` Phase 3 |
| 12 | Make the decommission period explicit — retain SBI **≥ 2–3 months** after cutover. | ✅ Phase 4 now states "at least 2–3 months", weekly monitoring ~first 2 months. | `PLAN.md` Phase 4 |
| 13 | Do NOT mix migration and SEO rewriting — separate phases. | ✅ Added a **Core principle — migrate first, improve later** section; referenced at each batch. | `PLAN.md` Core principle; Guardrails |
| 14 | Preserve important internal-link relationships; compare pre/post internal-link counts for major landing pages & families. | ✅ Added internal-link **baseline capture** (Phase 1) and **post-launch diff** (Phase 3). | `PLAN.md` Phase 1 & Phase 3 |
| 15 | PayPal decision can wait, but don't delete a sales URL with backlinks/traffic — 301 to the modern product/checkout, preserve the SEO endpoint. | ✅ Updated the open decision: preserve the endpoint, 301 old purchasing URL → modern checkout; dropping is off the table where links/traffic exist. | `PLAN.md` Open decisions #4 |
| Assessment | 3 hard prerequisites before go-ahead. | ✅ Added a **Go-ahead conditions** section: (1) GA4 on old site now; (2) proxy fallback proven post-apex; (3) 639 not permanently retired without evidence. | `PLAN.md` Go-ahead conditions |

## Net effect

No architectural change — the advisor endorsed the design. The plan gained: HOLD-not-DELETE
discipline, corrected traffic terminology, GA4 on the old site, a concrete proxy-origin test,
per-page SEO-signal preservation, a fuller master CSV, a broader crawl, staging password-first
protection, an automated pre/post QA sweep, an explicit ≥2–3-month decommission window, the
migrate-vs-rewrite firewall, internal-link preservation, a safer PayPal stance, and three
explicit go-ahead conditions.
