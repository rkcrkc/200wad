#!/usr/bin/env python3
"""Analyse the aggregated SBI traffic (run parse_stats.py first)."""
import csv, os, glob, re
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
MONTHS = {m: i for i, m in enumerate(
    ["january","february","march","april","may","june","july","august",
     "september","october","november","december"], 1)}

# ---- 1. true monthly site totals (from the summary block of each file) ----
def month_totals():
    out = {}
    for f in glob.glob(os.path.join(HERE, 'stats', '*.html')):
        h = open(f, encoding='utf-8', errors='replace').read()
        mm = re.search(r'Monthly Statistics for\s+([A-Za-z]+)\s+(\d{4})', h)
        if not mm: continue
        key = f"{int(mm.group(2))}-{MONTHS[mm.group(1).lower()]:02d}"
        def grab(label):
            m = re.search(re.escape(label) + r'</td>\s*<td[^>]*>\s*<(?:strong|b|B)>([\d,]+)', h)
            return int(m.group(1).replace(',', '')) if m else 0
        out[key] = {
            'visits': grab('Total Visits'),
            'visitors': grab('Total Unique Visitors'),
            'pages': grab('Total Pages'),
        }
    return out

# ---- 2. load long data + inventory ----
long = list(csv.DictReader(open(os.path.join(HERE, 'traffic_long.csv'))))
inv = {r['path']: (r['family'], r['type']) for r in csv.DictReader(open(os.path.join(HERE, 'inventory.csv')))}
all_sitemap = set(inv)

# entry visits per path per month
ev = defaultdict(dict)
for r in long:
    if r['metric'] == 'entry_visits':
        ev[r['path']][r['month']] = int(r['value'])

months = sorted({r['month'] for r in long})
last12 = set(months[-12:])
prev12 = set(months[-24:-12])

def fam_of(p): return inv.get(p, ('(not in sitemap)', '?'))[0]

# ---- family rollup ----
fam_tot = defaultdict(int); fam_last=defaultdict(int); fam_prev=defaultdict(int)
fam_pages = defaultdict(set)
page_tot = {}
for p, mv in ev.items():
    t = sum(mv.values()); page_tot[p]=t
    f = fam_of(p)
    fam_tot[f]+=t; fam_pages[f].add(p)
    fam_last[f]+=sum(v for m,v in mv.items() if m in last12)
    fam_prev[f]+=sum(v for m,v in mv.items() if m in prev12)

# family page counts from full sitemap (denominator)
fam_sitemap_pages=defaultdict(int)
for p,(f,t) in inv.items(): fam_sitemap_pages[f]+=1

grand = sum(fam_tot.values())
print("="*80)
print("FAMILY TRAFFIC ROLLUP  (entry visits, all 73 months; % of tracked entry traffic)")
print("="*80)
print(f"{'family':<34}{'entry visits':>13}{'share':>7}{'pages w/traffic':>16}{'/sitemap':>9}  {'L12 vs P12':>10}")
for f in sorted(fam_tot, key=fam_tot.get, reverse=True):
    yoy = f"{100*(fam_last[f]-fam_prev[f])/fam_prev[f]:+.0f}%" if fam_prev[f] else "n/a"
    print(f"{f[:33]:<34}{fam_tot[f]:>13,}{100*fam_tot[f]/grand:>6.1f}%"
          f"{len(fam_pages[f]):>10}{'':6}{fam_sitemap_pages.get(f,0):>9}  {yoy:>10}")

# ---- Pareto concentration ----
print("\n" + "="*80)
print("CONCENTRATION (Pareto) — pages ranked by 6-yr entry visits")
print("="*80)
ranked = sorted(page_tot.values(), reverse=True)
cum=0; marks={50:None,80:None,90:None,95:None}
for i,v in enumerate(ranked,1):
    cum+=v
    for pct in marks:
        if marks[pct] is None and cum >= grand*pct/100: marks[pct]=i
print(f"total tracked entry visits: {grand:,} across {len(ranked):,} pages")
for pct,n in marks.items():
    print(f"  {pct}% of traffic  <-  top {n:,} pages  ({100*n/len(all_sitemap):.0f}% of the 2,034 sitemap)")

# ---- long-tail coverage ----
tracked = set(page_tot)
in_sitemap_tracked = tracked & all_sitemap
never = all_sitemap - tracked
not_in_sitemap = tracked - all_sitemap
print("\n" + "="*80)
print("COVERAGE vs the 2,034-page sitemap")
print("="*80)
print(f"  sitemap pages that EVER hit top-500 entry:   {len(in_sitemap_tracked):>5}")
print(f"  sitemap pages NEVER in any top-500 (low):    {len(never):>5}")
print(f"  pages getting traffic but NOT in sitemap:    {len(not_in_sitemap):>5}  (old/removed URLs -> redirect candidates)")

# top not-in-sitemap (residual traffic to dead/renamed URLs)
print("\n  Top 15 'not in sitemap' pages by entry visits (need 301s / investigate):")
nis = sorted(((page_tot[p],p) for p in not_in_sitemap), reverse=True)[:15]
for v,p in nis: print(f"    {v:>8,}  {p}")

# ---- site-wide trend (true totals) ----
mt = month_totals()
print("\n" + "="*80)
print("SITE-WIDE TREND (true monthly totals) — visits, yearly")
print("="*80)
yr=defaultdict(lambda:[0,0])
for k,v in mt.items():
    y=k[:4]; yr[y][0]+=v['visits']; yr[y][1]+=1
for y in sorted(yr):
    tot,n=yr[y]; note=" (partial)" if n<12 else ""
    print(f"  {y}: {tot:>10,} visits over {n:>2} mo  (avg {tot//n:>7,}/mo){note}")

# write family summary csv
with open(os.path.join(HERE,'family_summary.csv'),'w',newline='') as fh:
    w=csv.writer(fh); w.writerow(['family','entry_visits_6yr','share_pct','pages_with_traffic','sitemap_pages','last12','prev12','yoy_pct'])
    for f in sorted(fam_tot,key=fam_tot.get,reverse=True):
        yoy=round(100*(fam_last[f]-fam_prev[f])/fam_prev[f],1) if fam_prev[f] else ''
        w.writerow([f,fam_tot[f],round(100*fam_tot[f]/grand,1),len(fam_pages[f]),fam_sitemap_pages.get(f,0),fam_last[f],fam_prev[f],yoy])
print("\nwrote family_summary.csv")
