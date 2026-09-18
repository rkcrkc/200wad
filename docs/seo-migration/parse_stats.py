#!/usr/bin/env python3
"""
Parse SBI (Webalizer) monthly Traffic Statistics HTML reports into a tidy dataset.

Usage:
    python3 parse_stats.py                # parse everything in ./stats/*.html
    python3 parse_stats.py --stats DIR    # custom folder

Just drop the raw downloaded report files into the stats/ folder (any filename).
The month is read from inside each file ("Monthly Statistics for <Month Year>").

Outputs (written next to this script):
    traffic_long.csv    month, metric, path, value   (one row per page per section per month)
    traffic_by_page.csv path, family, type, entry_visits_total, pageviews_total,
                        months_seen, entry_visits_avg, first_month, last_month, trend
    Prints a summary + top pages to stdout.
"""
import sys, re, csv, os, glob
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))

MONTHS = {m: i for i, m in enumerate(
    ["january","february","march","april","may","june","july","august",
     "september","october","november","december"], start=1)}

# metric name (as it appears in "Top N of M Total <X>") -> short key
SECTIONS = {
    "Total Pages": "pageviews",        # Page Views per page
    "Total Entry Pages": "entry_visits",  # Visits landing on the page (organic-ish)
    "Total Exit Pages": "exit_visits",
}

ROW_RE = re.compile(
    r'<B>(\d[\d,]*)</B>\s*</td>\s*'          # metric value
    r'<td[^>]*>[\d.]+%\s*</td>\s*'            # percentage cell
    r'<td[^>]*>\s*<A\s+HREF="[^"]*"[^>]*>\s*([^<]+?)\s*</A>',
    re.IGNORECASE)

def parse_month(html):
    m = re.search(r'Monthly Statistics for\s+([A-Za-z]+)\s+(\d{4})', html)
    if not m:
        return None
    mon = MONTHS.get(m.group(1).lower())
    return f"{int(m.group(2)):04d}-{mon:02d}" if mon else None

def parse_sections(html):
    """Return {metric: {path: value}} for this file."""
    out = defaultdict(dict)
    for label, key in SECTIONS.items():
        m = re.search(r'Top \d+ of \d+ ' + re.escape(label), html)
        if not m:
            continue
        end = html.find('</table>', m.end())
        seg = html[m.end(): end if end != -1 else len(html)]
        for val, path in ROW_RE.findall(seg):
            path = path.strip()
            if not path.startswith('/'):
                continue
            out[key][path] = int(val.replace(',', ''))
    return out

def load_inventory():
    inv = {}
    p = os.path.join(HERE, 'inventory.csv')
    if os.path.exists(p):
        for r in csv.DictReader(open(p)):
            inv[r['path']] = (r['family'], r['type'])
    return inv

def main():
    stats_dir = os.path.join(HERE, 'stats')
    if '--stats' in sys.argv:
        stats_dir = sys.argv[sys.argv.index('--stats') + 1]
    files = sorted(glob.glob(os.path.join(stats_dir, '*.html')))
    if not files:
        print(f"No .html files in {stats_dir}"); return

    inv = load_inventory()
    # data[metric][path][month] = value
    data = defaultdict(lambda: defaultdict(dict))
    months = set()
    parsed = []
    for f in files:
        html = open(f, encoding='utf-8', errors='replace').read()
        month = parse_month(html)
        if not month:
            print(f"  SKIP (no month found): {os.path.basename(f)}"); continue
        secs = parse_sections(html)
        n = sum(len(v) for v in secs.values())
        parsed.append((month, os.path.basename(f), {k: len(v) for k, v in secs.items()}))
        months.add(month)
        for metric, d in secs.items():
            for path, val in d.items():
                data[metric][path][month] = val

    months = sorted(months)
    print(f"Parsed {len(parsed)} file(s), {len(months)} distinct month(s): "
          f"{months[0]}..{months[-1]}" if months else "none")
    for month, fn, counts in sorted(parsed):
        print(f"  {month}  {counts}  <- {fn}")

    # long-format dump
    with open(os.path.join(HERE, 'traffic_long.csv'), 'w', newline='') as fh:
        w = csv.writer(fh); w.writerow(['month', 'metric', 'path', 'value'])
        for metric, paths in data.items():
            for path, mv in paths.items():
                for month, val in sorted(mv.items()):
                    w.writerow([month, metric, path, val])

    # per-page rollup (primary metric = entry_visits, fallback pageviews)
    all_paths = set()
    for metric in data:
        all_paths |= set(data[metric])
    rows = []
    for path in all_paths:
        ev = data['entry_visits'].get(path, {})
        pv = data['pageviews'].get(path, {})
        fam, typ = inv.get(path, ('(not in sitemap)', '?'))
        ev_tot = sum(ev.values()); pv_tot = sum(pv.values())
        seen = sorted(set(ev) | set(pv))
        # simple trend: compare avg of last half vs first half of the entry-visit series
        trend = ''
        if len(ev) >= 4:
            ms = sorted(ev); half = len(ms) // 2
            first = sum(ev[m] for m in ms[:half]) / half
            last = sum(ev[m] for m in ms[half:]) / (len(ms) - half)
            if first > 0:
                pct = 100 * (last - first) / first
                trend = f"{pct:+.0f}%"
        rows.append({
            'path': path, 'family': fam, 'type': typ,
            'entry_visits_total': ev_tot, 'pageviews_total': pv_tot,
            'months_seen': len(seen),
            'entry_visits_avg': round(ev_tot / len(ev), 1) if ev else 0,
            'first_month': seen[0] if seen else '', 'last_month': seen[-1] if seen else '',
            'trend': trend,
        })
    rows.sort(key=lambda r: (r['entry_visits_total'], r['pageviews_total']), reverse=True)
    with open(os.path.join(HERE, 'traffic_by_page.csv'), 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader()
        w.writerows(rows)

    print(f"\nWrote traffic_long.csv and traffic_by_page.csv ({len(rows)} pages)")
    print("\nTop 25 pages by entry visits (this data set):")
    print(f"  {'entry':>7} {'pv':>7}  {'family':<28} path")
    for r in rows[:25]:
        print(f"  {r['entry_visits_total']:>7} {r['pageviews_total']:>7}  "
              f"{r['family'][:28]:<28} {r['path']}")

if __name__ == '__main__':
    main()
