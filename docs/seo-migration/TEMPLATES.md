# Page-template structural scan — hidden mechanics per family

Before writing per-family SSG templates, I pulled the **highest-traffic page of each family**
(plus edge-case types) and scanned the raw HTML for dynamic mechanics, embeds, forms, and
content shape. 28 pages, all HTTP 200. Goal: find anything that would break a naive
"render the static HTML" migration. Scanner: `/tmp/scan.py` (ad-hoc). Samples: `/tmp/samples/`.

## What every page carries (SBI chrome — strip, don't port)

These appear on essentially every page and are **template chrome**, not content. They must be
dropped or replaced with app-native equivalents, not reproduced:

- **`document.write` nav/template JS** — SBI injects header/nav/footer this way. Ignore; we
  rebuild chrome in the `.site` layer.
- **Google Custom Search box** (`<form id="cse-search-box" action="…/search-results.html">` +
  `google.com/cse/brand`). Site search widget. Replace with native search or drop.
- **`pagespeed`-mangled image URLs** on nearly every page (e.g.
  `…/xfoo.png.pagespeed.ic.HASH.png`). Confirms the **image re-hosting** requirement — these
  URLs die with SBI. Re-host originals to Supabase and rewrite `<img src>`.
- **SBI loader** (`/ssjs/ldr.js`, recaptcha shims) — SBI runtime. Drop.

## Dynamic mechanics that WILL break a naive migration

| Mechanic | Where | Handling |
|---|---|---|
| **iframe date-rotators** | 9 `-of-the-day`/`daily-*-lesson` hubs | SSR today's target inline — see `DAILY_ROTATORS.md` (3 schemes). |
| **SBI comment system** | `*-comment-form.html`, `thank-you-comment-form.html` POST to `/dyn/C2/SaveComment`, `/dyn/C2/SubmitInvita` | Dynamic SBI endpoints, die with origin. Retire/redirect to parent page (these are ~29 low-value artifacts flagged in ANALYSIS.md). |
| **PayPal buy buttons** | `/learn-french.html` (course landing), `/order-page.html`, `/french-flashcard.html` — `<form action="paypal.com">` | Commerce. Decide: keep PayPal form, route to app checkout, or drop. **Open decision.** |
| **TrafficWave email capture** | `/28Feb-daily-italian-lesson.html`, `/circumflex-in-french.html` — `<form action="trafficwave.net">` | Dead 3rd-party autoresponder. Drop or replace with app's own email capture. |

**No Flash/SWF anywhere.** (An earlier scan flagged "FLASH" — that was a false positive from
the word "flashcard"/"Flash" in page text. Confirmed no `.swf`/`<embed>`/`<object>`.)
No `<audio>`/`<video>` in samples either; PDFs only as download links.

## Content shape by family (drives template design)

| Sample (family) | imgs | ~words | Notes |
|---|---:|---:|---|
| `/` (home) | 11 | 3883 | Bespoke hub. Rebuild by hand. |
| `learn-french.html` (course landing) | 17 | 2673 | Long sales page + PayPal. |
| `learn-french-blog.html` (blog) | 13 | 3830 | Maps to existing blog pattern. |
| `main-page.html` (bespoke) | 14 | 3317 | Long bespoke article. |
| `circumflex-in-french.html` (bespoke) | 26 | 2527 | Rich article + comment form + TrafficWave. |
| `estar.html` (verbs/grammar bespoke) | 6 | 1651 | Verb table, bespoke. |
| `french-verb-aller.html` (**verb-conjugation**) | 13 | 994 | **The engine** — 766 pages. Consistent template: conjugation tables + example sentences. Build this first. |
| `language-learning-ezine.html` / `…newzine21` (ezine) | 10/1 | 1134/1818 | Newsletter back-issues. |
| `tu-and-vous.html` (bespoke) | 10 | 1172 | Article. |
| `privacy-policy.html` | 0 | 1123 | Static policy → map to new `/privacy`. |
| `french-flashcard.html` (course tools) | 27 | 853 | Image-heavy + PayPal. |
| `daily-spanish-lesson.html` (rotator hub) | 5 | 711 | iframe rotator (Scheme A). |
| `french-for-finish.html` (X-for-word) | 8 | 716 | Templated lesson, 172 pages. |
| `28Feb-daily-italian-lesson.html` (dated) | 1 | 632 | Rotator target (Scheme B); TrafficWave form. |
| `french-pics.html` (course tools) | 14 | 476 | Image gallery. |
| `contact-us.html` | 11 | 446 | Contact form (relative action). |
| `spanish-proverb-of-the-day.html` | 10 | 473 | **Static**, not a rotator. |
| `word-of-the-day.html` / `french-proverb-of-the-day.html` | 10 | 255/301 | Scheme-C rotator hubs. |
| `fsi-french-vol2-20.html` (FSI/extra) | 10 | 152 | Thin course-material page. |
| `16.french-word-a-day.html`, `18.html`, `22.german-word-a-day.html`, `24travel-spanish.html`, `25spanish-proverb-a-day.html` (numbered targets) | 0 | 95–135 | **Thin, image-free** rotator targets. Clean/simple; likely fold into their hub. |

## Takeaways for PLAN.md

1. **Chrome is uniform and disposable** — one shared `.site` layout replaces all SBI
   `document.write` chrome, CSE search, and loader across every page.
2. **Image re-hosting is non-negotiable** — `pagespeed` URLs are everywhere and die with SBI.
3. **Rotators are bigger than thought** — 9 hubs, 3 schemes (`DAILY_ROTATORS.md`). The
   numbered word/proverb families are their embedded targets, not standalone pages.
4. **Commerce + 3rd-party forms need decisions** — PayPal (course landings/order/flashcard)
   and TrafficWave (email capture) are the only content-level dynamic bits. Flag as open
   decisions rather than porting blindly.
5. **SBI `/dyn/C2/` comment endpoints die with origin** — retire the comment-form artifacts.
6. **Template tiers confirmed:** (a) verb-conjugation — the high-volume consistent template,
   build first; (b) X-for-word + dated daily lessons — templated; (c) rotator hubs — dynamic
   SSR; (d) numbered targets — thin, fold into hubs; (e) bespoke long-form (home, course
   landings, articles, ezine) — hand-migrate; (f) policy/contact — one-offs.
