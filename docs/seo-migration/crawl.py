#!/usr/bin/env python3
"""
Full-crawl the live SBI site to capture every SEO signal + asset before migration.

See CRAWL_SPEC.md for the design. Produces one authoritative row per live URL.

Usage:
    ./.venv/bin/python crawl.py                 # full crawl (seed + probe + 1-hop)
    ./.venv/bin/python crawl.py --limit 20      # smoke test on first 20 seed URLs
    ./.venv/bin/python crawl.py --no-follow     # skip the 1-hop link-follow pass
    ./.venv/bin/python crawl.py --delay 1.0     # override per-request delay (seconds)

Inputs (this folder):
    paths.txt            seed list (2,034 sitemap paths)
    traffic_by_page.csv  supplies the 29 "(not in sitemap)" trafficked paths to probe

Outputs (this folder):
    crawl.csv            one row per discovered URL, all captured signals
    asset-inventory.csv  every unique image + non-image asset URL -> referencing pages
    cache/<slug>.html    raw HTML archive (also seeds the Phase-0 content archive)

Politeness: single-threaded, --delay between requests, identifying User-Agent.
Idempotent: cached pages are re-parsed from disk, not re-fetched.
"""
import sys, os, csv, re, time, json, argparse, hashlib
from urllib.parse import urljoin, urlparse, urldefrag
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "cache")
BASE = "https://www.200words-a-day.com"
HOST = urlparse(BASE).netloc
UA = "200wad-migration-crawler/1.0 (+site owner; SEO migration audit)"

# Asset extensions we must preserve original URLs for (advisor gap #6).
ASSET_EXT = (".pdf", ".mp3", ".mp4", ".wav", ".zip", ".doc", ".docx",
             ".xls", ".xlsx", ".ppt", ".pptx", ".swf", ".mov", ".m4a",
             ".ogg", ".csv", ".txt", ".rtf")


def load_seed():
    """Sitemap paths + the 29 non-sitemap trafficked paths + comment-form artifacts."""
    seed = []
    seen = set()

    def add(path):
        if path and path not in seen:
            seen.add(path)
            seed.append(path)

    with open(os.path.join(HERE, "paths.txt")) as f:
        for line in f:
            add(line.strip())

    # Probe: URLs that pull traffic but aren't in the sitemap.
    tpath = os.path.join(HERE, "traffic_by_page.csv")
    if os.path.exists(tpath):
        with open(tpath) as f:
            for row in csv.DictReader(f):
                if row.get("family") == "(not in sitemap)":
                    add(row["path"])
    return seed


def cache_path(path):
    slug = hashlib.sha1(path.encode()).hexdigest()[:16]
    return os.path.join(CACHE, slug + ".html")


def fetch(path, delay, session):
    """Return (final_url, status, chain_len, html, from_cache). Caches raw HTML."""
    cp = cache_path(path)
    if os.path.exists(cp):
        with open(cp, encoding="utf-8", errors="replace") as f:
            meta_line = f.readline()
        try:
            meta = json.loads(meta_line.lstrip("#").strip())
        except Exception:
            meta = {}
        with open(cp, encoding="utf-8", errors="replace") as f:
            f.readline()  # skip meta header
            html = f.read()
        return (meta.get("final_url", BASE + path), meta.get("status", 0),
                meta.get("chain_len", 0), html, True)

    url = urljoin(BASE, path)
    try:
        r = session.get(url, timeout=30, headers={"User-Agent": UA}, allow_redirects=True)
        status = r.status_code
        final_url = r.url
        chain_len = len(r.history)
        html = r.text if ("html" in r.headers.get("Content-Type", "").lower()
                          or not r.headers.get("Content-Type")) else ""
    except requests.RequestException as e:
        status, final_url, chain_len, html = -1, url, 0, ""
        print(f"    ERROR {path}: {e}", file=sys.stderr)

    meta = {"final_url": final_url, "status": status, "chain_len": chain_len,
            "fetched_at": datetime.now(timezone.utc).isoformat()}
    with open(cp, "w", encoding="utf-8") as f:
        f.write("#" + json.dumps(meta) + "\n")
        f.write(html)
    time.sleep(delay)
    return final_url, status, chain_len, html, False


def text_words(soup):
    """Word count of visible body text, chrome scripts/styles stripped."""
    body = soup.body or soup
    clone = BeautifulSoup(str(body), "lxml")
    for t in clone(["script", "style", "noscript"]):
        t.decompose()
    return len(clone.get_text(" ", strip=True).split())


def norm_path(href, base_url):
    """Resolve href against base, keep only same-host paths; else return None."""
    if not href:
        return None
    href = href.strip()
    if href.startswith(("mailto:", "tel:", "javascript:", "#", "data:")):
        return None
    absu = urljoin(base_url, href)
    absu, _ = urldefrag(absu)
    p = urlparse(absu)
    if p.netloc and p.netloc.replace("www.", "") != HOST.replace("www.", ""):
        return None  # external
    return p.path or "/"


def parse(path, final_url, html):
    """Extract all signals from one page's HTML."""
    soup = BeautifulSoup(html, "lxml")
    rec = {"path": path, "final_url": final_url}

    def meta(name):
        m = soup.find("meta", attrs={"name": re.compile("^" + name + "$", re.I)})
        return (m.get("content") or "").strip() if m else ""

    title_tag = soup.find("title")
    rec["title"] = title_tag.get_text(strip=True) if title_tag else ""
    rec["meta_description"] = meta("description")
    rec["robots_meta"] = meta("robots")

    can = soup.find("link", rel=lambda v: v and "canonical" in (v if isinstance(v, list) else [v]))
    rec["canonical"] = (can.get("href") or "").strip() if can else ""

    h1s = soup.find_all("h1")
    rec["h1"] = h1s[0].get_text(" ", strip=True) if h1s else ""
    rec["h1_count"] = len(h1s)

    html_tag = soup.find("html")
    rec["lang"] = (html_tag.get("lang") or "").strip() if html_tag else ""
    rec["word_count"] = text_words(soup)

    # Assets: images + downloadable files.
    imgs, assets, internal, external = [], [], set(), set()
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src")
        if src:
            imgs.append(urljoin(final_url, src.strip()))
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        low = href.lower().split("?")[0]
        if low.endswith(ASSET_EXT):
            assets.append(urljoin(final_url, href))
        p = norm_path(href, final_url)
        if p is not None:
            internal.add(p)
        else:
            absu = urljoin(final_url, href)
            pu = urlparse(absu)
            if pu.scheme in ("http", "https") and pu.netloc.replace("www.", "") != HOST.replace("www.", ""):
                external.add(pu.netloc)
    for link in soup.find_all("link", href=True):
        low = link["href"].lower().split("?")[0]
        if low.endswith(ASSET_EXT):
            assets.append(urljoin(final_url, link["href"]))

    rec["img_urls"] = imgs
    rec["asset_urls"] = sorted(set(assets))
    rec["internal_links_out"] = sorted(internal)
    rec["external_links_out"] = sorted(external)
    rec["img_count"] = len(set(imgs))
    rec["asset_count"] = len(set(assets))
    rec["internal_out_count"] = len(internal)

    # Dynamic-bit flags (form actions + iframes) — see TEMPLATES.md.
    blob = html.lower()
    forms = " ".join((f.get("action") or "").lower() for f in soup.find_all("form"))
    rec["has_paypal"] = "paypal.com" in blob or "paypal" in forms
    rec["has_trafficwave"] = "trafficwave" in blob
    rec["has_comment_form"] = "/dyn/c2/" in blob or "savecomment" in blob or "comment-form" in path.lower()
    # Rotators inject their iframe via JS (innerHTML/document.write), so a parsed-tag
    # check misses them. Scan raw HTML for a real <iframe> OR the rotator JS signatures
    # documented in DAILY_ROTATORS.md (dailyurls/dailytext arrays keyed off getDate()).
    rec["has_rotator_iframe"] = (
        bool(soup.find("iframe"))
        or "<iframe" in blob
        or "dailyurls" in blob
        or "dailytext" in blob
        or "two_hundred_words_daily" in blob
        or ("getdate" in blob and "innerhtml" in blob)
    )
    rec["pagespeed_imgs"] = sum(1 for u in imgs if ".pagespeed." in u)
    return rec


LIST_FIELDS = {"img_urls", "asset_urls", "internal_links_out", "external_links_out"}
FIELDS = ["path", "final_url", "http_status", "redirect_chain_len", "title",
          "meta_description", "canonical", "h1", "h1_count", "robots_meta",
          "lang", "word_count", "img_count", "asset_count", "pagespeed_imgs",
          "internal_out_count", "has_paypal", "has_trafficwave",
          "has_comment_form", "has_rotator_iframe", "img_urls", "asset_urls",
          "internal_links_out", "external_links_out", "fetched_at"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="cap seed URLs (smoke test)")
    ap.add_argument("--no-follow", action="store_true", help="skip 1-hop link follow")
    ap.add_argument("--delay", type=float, default=0.6, help="seconds between requests")
    args = ap.parse_args()

    os.makedirs(CACHE, exist_ok=True)
    session = requests.Session()

    seed = load_seed()
    if args.limit:
        seed = seed[:args.limit]
    print(f"Seed URLs: {len(seed)}")

    records = {}
    queue = list(seed)
    seed_set = set(seed)
    processed = set()
    discovered = set()  # 1-hop orphans found

    def crawl_one(path):
        final_url, status, chain, html, cached = fetch(path, args.delay, session)
        rec = parse(path, final_url, html) if html else {"path": path, "final_url": final_url}
        rec["http_status"] = status
        rec["redirect_chain_len"] = chain
        rec["fetched_at"] = datetime.now(timezone.utc).isoformat()
        records[path] = rec
        return rec, cached

    for i, path in enumerate(queue, 1):
        if path in processed:
            continue
        processed.add(path)
        rec, cached = crawl_one(path)
        tag = "cache" if cached else "live"
        if i % 50 == 0 or i <= 5:
            print(f"  [{i}/{len(queue)}] {tag} {rec.get('http_status')} {path}")

    # Pass 3: 1-hop follow — same-host links not already seen.
    if not args.no_follow:
        for path in list(records):
            for lp in records[path].get("internal_links_out", []):
                if lp not in seed_set and lp not in discovered and lp not in processed:
                    discovered.add(lp)
        discovered = {d for d in discovered if d.endswith(".html") or d == "/"}
        print(f"1-hop orphans to fetch: {len(discovered)}")
        for i, path in enumerate(sorted(discovered), 1):
            if path in processed:
                continue
            processed.add(path)
            rec, cached = crawl_one(path)
            if i % 50 == 0 or i <= 5:
                print(f"  [orphan {i}/{len(discovered)}] {rec.get('http_status')} {path}")

    # Write crawl.csv
    out = os.path.join(HERE, "crawl.csv")
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
        w.writeheader()
        for path in sorted(records):
            rec = dict(records[path])
            for lf in LIST_FIELDS:
                rec[lf] = " ".join(rec.get(lf, []) or [])
            w.writerow(rec)
    print(f"Wrote {out} ({len(records)} rows)")

    # Write asset-inventory.csv
    assets = {}  # asset_url -> {pages:set, pagespeed:bool}
    for path, rec in records.items():
        for u in (rec.get("img_urls", []) or []):
            a = assets.setdefault(u, {"pages": set(), "kind": "image",
                                      "pagespeed": ".pagespeed." in u})
            a["pages"].add(path)
        for u in (rec.get("asset_urls", []) or []):
            a = assets.setdefault(u, {"pages": set(), "kind": "file", "pagespeed": False})
            a["pages"].add(path)
    ainv = os.path.join(HERE, "asset-inventory.csv")
    with open(ainv, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["asset_url", "kind", "pagespeed", "ref_count", "referencing_pages"])
        for u in sorted(assets):
            a = assets[u]
            pages = sorted(a["pages"])
            w.writerow([u, a["kind"], int(a["pagespeed"]), len(pages),
                        " ".join(pages[:50])])
    print(f"Wrote {ainv} ({len(assets)} unique assets)")

    # Quick summary to stdout
    statuses = {}
    for rec in records.values():
        statuses[rec.get("http_status")] = statuses.get(rec.get("http_status"), 0) + 1
    print("Status counts:", dict(sorted(statuses.items(), key=lambda x: -x[1])))
    print("Orphans (not in seed):", len(discovered))


if __name__ == "__main__":
    main()
