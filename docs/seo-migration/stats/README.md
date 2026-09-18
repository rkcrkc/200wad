# SBI per-page traffic — HTML drop folder

Save SBI monthly **per-page** traffic reports here so the parser can aggregate them.

## What to save (the important part)
We need the report that lists **individual pages/URLs with visit counts** — usually called
something like **"Top Pages"**, **"Most Requested Pages"**, or **"Top URLs"**. NOT the
"Summary by Month" (that's site-wide totals only).

How to reach it: Traffic Statistics → click a month (e.g. "Sep 2026") → find the per-page list.

## How to save
In your browser on that report page: **File → Save Page As… → Format: "Web Page, HTML Only"**
(not "Complete"). Save into this folder.

## Naming convention
Name each file by the month it covers, so trends line up:

    YYYY-MM.html      e.g.  2026-09.html,  2025-12.html,  2023-04.html

If a month's per-page data is split across several pages (e.g. paginated top-N), add a suffix:

    YYYY-MM-a.html, YYYY-MM-b.html

## Order of work
1. Save **just the most recent month first** and tell me — I'll inspect the markup and
   build/verify the parser against the real format before you do the rest.
2. Then save as many earlier months as you can be bothered to (a few years is ideal for
   trend analysis). More history = better prioritisation.
