#!/usr/bin/env python3
"""
Merge crawl.csv + traffic_by_page.csv + inventory.csv into the master url-map.csv
(the advisor #8 deliverable), and emit CRAWL_NOTES.md.

Join key = path. Action is *seeded* by rule (KEEP / 301 / HOLD / REVIEW); the GSC
columns (clicks/impressions/backlinks) and Indexed? are filled at the GSC checkpoint,
not here. See CRAWL_SPEC.md and PLAN.md Phase 0.

Usage: ./.venv/bin/python merge.py
"""
import os, csv
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))

# Families with essentially no traffic -> HOLD regardless (dead numbered series).
DEAD_FAMILIES = {
    "proverb-a-day (Nlang)",
    "travel-word (Ntravel)",
    "german-word-a-day (N.)",
}
# Known explicit redirect targets for non-sitemap URLs still pulling traffic.
# (hub TBD) targets name intent; the new-site path is finalised when the hub is built.
KNOWN_301 = {
    "/privacy-policy.html": "/privacy",
    "/200_Words_a_Day-backissues.html": "/ezine",          # ezine archive hub (TBD)
    "/daily-verb-lessons.html": "/daily-lessons",           # daily/verb hub (TBD)
    "/google67553bdafcb12079.html": "/",                    # GSC verification token (retire)
}
# Old infrastructure files replaced by the new site, not content to migrate.
INFRA_REMOVE = {
    "/L9Ejn5e5.xml": "old XML sitemap -> replaced by app/sitemap.ts",
    "/language-learning.xml": "old feed -> replaced by new site feed",
}
# Syndication embed sources — external sites iframe these (open decision #3).
CODE_EMBED = {
    "/daily-french-lesson-code.html",
    "/daily-spanish-lesson-code.html",
    "/daily-italian-lesson-code.html",
    "/daily-german-lesson-code.html",
}


def derive_comment_parent(path, alive, inv):
    """A `/{slug}-comment-form.html` artifact's parent is `/{slug}.html`."""
    if not path.endswith("-comment-form.html"):
        return ""
    parent = path.replace("-comment-form.html", ".html")
    return parent if (parent in alive or parent in inv) else ""


def read_csv(name):
    p = os.path.join(HERE, name)
    if not os.path.exists(p):
        return {}
    with open(p, newline="") as f:
        return {r["path"]: r for r in csv.DictReader(f)}


def to_int(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0


def main():
    crawl = read_csv("crawl.csv")
    traffic = read_csv("traffic_by_page.csv")
    inv = read_csv("inventory.csv")

    paths = sorted(set(crawl) | set(traffic) | set(inv))
    alive = set(p for p, r in crawl.items() if r.get("http_status") == "200")

    cols = ["OLD URL", "Action", "NEW URL", "Family", "Template", "Entry visits",
            "GSC clicks", "GSC impressions", "Backlinks", "Indexed?", "Assets",
            "QA status", "Notes"]

    rows = []
    counts = defaultdict(int)
    for path in paths:
        c = crawl.get(path, {})
        t = traffic.get(path, {})
        iv = inv.get(path, {})

        family = iv.get("family") or t.get("family") or "(unknown)"
        entry = to_int(t.get("entry_visits_total"))
        status = to_int(c.get("http_status"))
        in_sitemap = path in inv
        in_crawl = path in crawl

        # --- seed the Action ---
        notes = []
        if "comment-form" in path:
            # Artifact *pages* only (path-based). A real article that merely embeds a
            # comment form must NOT be 301'd — that's flagged in Notes below instead.
            action = "301"
            new_url = derive_comment_parent(path, alive, inv) or KNOWN_301.get(path, "")
            if new_url:
                notes.append("SBI comment artifact -> 301 to parent")
            else:
                notes.append("SBI comment artifact -> parent TBD")
        elif path in INFRA_REMOVE:
            action = "REMOVE"
            new_url = ""
            notes.append(INFRA_REMOVE[path])
        elif family == "(not in sitemap)":
            action = "301"
            new_url = KNOWN_301.get(path, "")
            if not new_url:
                notes.append("non-sitemap URL w/ traffic; needs 301 target")
            elif new_url.endswith(("/ezine", "/daily-lessons")):
                notes.append("301 target (hub TBD)")
        elif family in DEAD_FAMILIES:
            action = "HOLD"
            new_url = ""
        elif entry > 0:
            action = "KEEP"
            new_url = path
        else:
            action = "HOLD"
            new_url = ""
            notes.append("no entry traffic in 6yr")

        # status-based overrides / flags
        if in_crawl and status not in (200, 0):
            if 300 <= status < 400:
                notes.append(f"already redirects (HTTP {status})")
            elif status == 404:
                action = "REVIEW"
                notes.append("HTTP 404 in crawl")
            elif status == -1:
                notes.append("fetch error")
            else:
                notes.append(f"HTTP {status}")
        if not in_crawl:
            notes.append("not reached by crawl")

        # signal-quality flags
        if in_crawl and status == 200:
            if not c.get("title"):
                notes.append("missing title")
            if to_int(c.get("h1_count")) != 1:
                notes.append(f"h1_count={c.get('h1_count')}")
            if not c.get("canonical"):
                notes.append("no canonical")
            if to_int(c.get("redirect_chain_len")) > 0:
                notes.append(f"redirect chain len {c.get('redirect_chain_len')}")
            for flag, label in [("has_paypal", "PayPal"),
                                ("has_trafficwave", "TrafficWave"),
                                ("has_rotator_iframe", "rotator")]:
                if str(c.get(flag)) == "True":
                    notes.append(label)

        if path in CODE_EMBED:
            notes.append("embed/syndication source (decision #3)")

        assets = to_int(c.get("img_count")) + to_int(c.get("asset_count"))
        counts[action] += 1
        rows.append({
            "OLD URL": path,
            "Action": action,
            "NEW URL": new_url,
            "Family": family,
            "Template": iv.get("type") or t.get("type") or "",
            "Entry visits": entry,
            "GSC clicks": "",
            "GSC impressions": "",
            "Backlinks": "",
            "Indexed?": "",
            "Assets": assets,
            "QA status": "",
            "Notes": "; ".join(notes),
        })

    out = os.path.join(HERE, "url-map.csv")
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {out} ({len(rows)} rows)")
    print("Action seed counts:", dict(counts))

    # --- CRAWL_NOTES.md ---
    orphans = [p for p in crawl if p not in inv and traffic.get(p, {}).get("family") != "(not in sitemap)"]
    chains = [(p, crawl[p].get("redirect_chain_len")) for p in crawl
              if to_int(crawl[p].get("redirect_chain_len")) > 0]
    non200 = [(p, crawl[p].get("http_status")) for p in crawl
              if to_int(crawl[p].get("http_status")) not in (200,)]
    canon_off = [p for p in crawl if crawl[p].get("http_status") == "200"
                 and crawl[p].get("canonical")
                 and crawl[p].get("canonical").rstrip("/").split("//")[-1].split("/", 1)[-1]
                 not in (p.lstrip("/"),) and crawl[p].get("canonical") != f"https://www.200words-a-day.com{p}"]
    paypal = [p for p in crawl if str(crawl[p].get("has_paypal")) == "True"]
    tw = [p for p in crawl if str(crawl[p].get("has_trafficwave")) == "True"]
    comments = [p for p in crawl if str(crawl[p].get("has_comment_form")) == "True"]
    rotators = [p for p in crawl if str(crawl[p].get("has_rotator_iframe")) == "True"]

    def block(title, items, fmt=lambda x: f"- `{x}`"):
        lines = [f"### {title} ({len(items)})", ""]
        lines += [fmt(x) for x in items[:60]]
        if len(items) > 60:
            lines.append(f"- …and {len(items) - 60} more")
        lines.append("")
        return "\n".join(lines)

    md = [
        "# Crawl notes — anomalies & flags",
        "",
        f"Generated by `merge.py` from `crawl.csv` ({len(crawl)} pages crawled). "
        "Companion to `url-map.csv`.",
        "",
        "## Summary",
        "",
        f"- Pages crawled: **{len(crawl)}**",
        f"- Action seed: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())),
        f"- Orphans (crawled, not in sitemap/inventory): **{len(orphans)}**",
        f"- Redirect chains (len>0): **{len(chains)}**",
        f"- Non-200 responses: **{len(non200)}**",
        f"- Rotator hubs flagged: **{len(rotators)}**",
        f"- PayPal pages: **{len(paypal)}** · TrafficWave: **{len(tw)}** · "
        f"comment artifacts: **{len(comments)}**",
        "",
        block("Orphans — crawled but not in sitemap or inventory", orphans),
        block("Redirect chains", chains, lambda x: f"- `{x[0]}` → chain len {x[1]}"),
        block("Non-200 responses", non200, lambda x: f"- `{x[0]}` → HTTP {x[1]}"),
        block("Rotator hubs (SSR inline — do NOT freeze 'today')", rotators),
        block("PayPal pages (open decision #4)", paypal),
        block("TrafficWave email-capture (drop/replace)", tw),
        block("SBI comment artifacts (301 to parent)", comments),
    ]
    notes_out = os.path.join(HERE, "CRAWL_NOTES.md")
    with open(notes_out, "w") as f:
        f.write("\n".join(md))
    print(f"Wrote {notes_out}")


if __name__ == "__main__":
    main()
