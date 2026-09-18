#!/usr/bin/env python3
"""
Parse the cached legacy verb-conjugation pages into structured JSON for import
into the new site's `verb_conjugations` table (SEO Phase B, Phase 2.1).

Reads the crawl cache (docs/seo-migration/cache/<sha1[:16]>.html) for every path
whose inventory family is the verb-conjugation family, extracts the SEO signal +
conjugation tables, and writes verbs.json. Content is preserved faithfully
(title/H1/mnemonic/tables/prose/alt); presentation is the new site's job.

Usage: ./.venv/bin/python parse_verbs.py
"""
import os, csv, json, hashlib, re
from bs4 import BeautifulSoup

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "cache")
VERB_FAMILY = "verb-conjugation (lang-verb-X)"
PERSONS = ["je", "tu", "il", "nous", "vous", "ils"]
LANG_CODE = {"french": "fr", "spanish": "es", "german": "de", "italian": "it"}


def cache_file(path):
    return os.path.join(CACHE, hashlib.sha1(path.encode()).hexdigest()[:16] + ".html")


def load_html(path):
    fp = cache_file(path)
    if not os.path.exists(fp):
        return None
    raw = open(fp, encoding="utf-8", errors="replace").read()
    lines = raw.split("\n")
    idx = next((i for i, l in enumerate(lines) if l.lstrip().startswith("<")), 0)
    return "\n".join(lines[idx:])


def clean(s):
    return re.sub(r"\s+", " ", (s or "")).strip()


def parse_lang_infinitive(path):
    # /french-verb-aller.html -> ('french', 'aller')
    m = re.match(r"^/([a-z]+)-verb-(.+)\.html$", path)
    if not m:
        return None, None
    return m.group(1), m.group(2)


def parse_title_translation(title, h1, infinitive):
    # "French Verb ALLER - to go. Learn ALL the Tenses Fast" -> "to go"
    # "French verb aboyer - French for bark" -> "to bark"
    src = h1 or title or ""
    m = re.search(r"-\s*(.+?)(?:\.|$)", src.split("Learn")[0])
    if not m:
        return None
    t = clean(m.group(1))
    m2 = re.match(r"(?:French|Spanish|German|Italian|Welsh)\s+for\s+(.+)$", t, re.I)
    if m2:
        t = "to " + clean(m2.group(1))
    return t or None


def find_conjugation_table(soup):
    for t in soup.find_all("table"):
        first = t.find("tr")
        if first and "VERB CONJUGATION TABLE" in first.get_text(" ", strip=True).upper():
            return t
    return None


def parse_conjugation(table):
    """Return {'simple': [...], 'compound': [...]} of tense rows."""
    out = {"simple": [], "compound": []}
    section = "simple"
    if table is None:
        return out
    for r in table.find_all("tr"):
        cells = r.find_all(["td", "th"])
        if not cells:
            continue
        label = clean(cells[0].get_text(" ", strip=True))
        up = label.upper()
        if len(cells) == 1:
            if "COMPOUND TENSES" in up:
                section = "compound"
            elif "SIMPLE TENSES" in up:
                section = "simple"
            continue  # section/title header rows
        if up.startswith("TENSE") or up == "TENSE":
            continue  # column header row
        # tense row: first cell = [English name, French name, gloss] (br-separated)
        parts = [clean(x) for x in cells[0].get_text("\n").split("\n") if clean(x)]
        en = parts[0] if len(parts) > 0 else ""
        fr = parts[1] if len(parts) > 1 else ""
        gloss = parts[2] if len(parts) > 2 else ""
        forms = {}
        for i, person in enumerate(PERSONS):
            ci = i + 1
            forms[person] = clean(cells[ci].get_text(" ", strip=True)) if ci < len(cells) else ""
        if not any(forms.values()) and not en:
            continue
        # `native` = the target-language tense name (Présent / Presente); `en` =
        # the English tense name; `gloss` = the English meaning.
        out[section].append({"en": en, "native": fr, "gloss": gloss, "forms": forms})
    return out


def parse_mnemonic(soup):
    # The signature imagery sentence, e.g. "Imagine you GO down the ALLEY to ALLAY..."
    text = soup.get_text(" ", strip=True)
    m = re.search(r"(Imagine[^.!?]*[.!?])", text)
    if not m:
        return None
    s = clean(m.group(1))
    # a few pages have no terminal punctuation before the table bleeds in — drop junk
    if "CONJUGATION" in s.upper() or len(s) > 200:
        return None
    return s


def derive_h1(soup, title):
    """Prefer the legacy <h1>; most pages lack one, so fall back to the title's
    main clause (e.g. 'Spanish Verb ir - to go') so the new page has a proper H1."""
    h1el = soup.find("h1")
    legacy = clean(h1el.get_text(" ", strip=True)) if h1el else ""
    if legacy:
        return legacy, True
    return clean(title.split(". ")[0]), False


def parse_subtitle(soup, has_legacy_h1):
    # An <h2> is only a genuine subtitle/badge when the page also has a real <h1>.
    # On the ~738 pages with no <h1>, the <h2> IS the main heading, not a subtitle.
    if not has_legacy_h1:
        return None
    h2 = soup.find("h2")
    return clean(h2.get_text(" ", strip=True)) if h2 else None


def prose_after_marker(soup, marker):
    """Best-effort: text of the block whose heading/first line starts with marker.
    Preserved as sanitised <p> paragraphs (text only, legacy markup dropped)."""
    for t in soup.find_all("table"):
        txt = t.get_text(" ", strip=True)
        if txt.upper().startswith(marker.upper()):
            paras = []
            for tr in t.find_all("tr"):
                p = clean(tr.get_text(" ", strip=True))
                if p:
                    paras.append("<p>" + p + "</p>")
            return "".join(paras) or None
    return None


def parse_lead_image(soup, infinitive):
    imgs = soup.find_all("img")
    for im in imgs:
        src = im.get("src") or ""
        # the lead image is the non-pagespeed .gif for this verb
        if src.endswith(".gif") and "pagespeed" not in src and infinitive in src.lower():
            return src, clean(im.get("alt"))
    # fallback: first image with a meaningful alt
    for im in imgs:
        alt = clean(im.get("alt"))
        src = im.get("src") or ""
        if alt and "pagespeed" not in src:
            return src, alt
    return None, None


def main():
    with open(os.path.join(HERE, "inventory.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    verb_paths = [r["path"] for r in rows if r.get("family") == VERB_FAMILY]

    records, anomalies = [], []
    for path in verb_paths:
        html = load_html(path)
        if html is None:
            anomalies.append((path, "no cache file"))
            continue
        soup = BeautifulSoup(html, "lxml")
        lang, infinitive = parse_lang_infinitive(path)
        if not lang or lang not in LANG_CODE:
            anomalies.append((path, f"unknown lang '{lang}'"))
            continue
        title = clean(soup.title.get_text()) if soup.title else ""
        md = soup.find("meta", attrs={"name": "description"})
        desc = clean(md.get("content")) if md else None
        h1, has_legacy_h1 = derive_h1(soup, title)
        conj = parse_conjugation(find_conjugation_table(soup))
        n_rows = len(conj["simple"]) + len(conj["compound"])
        if n_rows == 0:
            anomalies.append((path, "no conjugation rows"))
        lead_src, lead_alt = parse_lead_image(soup, infinitive or "")
        records.append({
            "language_code": LANG_CODE[lang],
            "slug": infinitive,
            "legacy_path": path,
            "infinitive": infinitive,
            "translation": parse_title_translation(title, h1, infinitive),
            "title": title,
            "meta_description": desc,
            "h1": h1,
            "subtitle": parse_subtitle(soup, has_legacy_h1),
            "mnemonic": parse_mnemonic(soup),
            "conjugation": conj,
            "intro_html": prose_after_marker(soup, "MORE on"),
            "notes_html": prose_after_marker(soup, "HOW TO CONQUER"),
            "legacy_image_url": lead_src,
            "lead_image_alt": lead_alt,
        })

    out = os.path.join(HERE, "verbs.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=1)

    langs = {}
    for r in records:
        langs[r["language_code"]] = langs.get(r["language_code"], 0) + 1
    print(f"Parsed {len(records)} verb pages -> {out}")
    print("By language:", langs)
    print(f"With conjugation rows: {sum(1 for r in records if (len(r['conjugation']['simple'])+len(r['conjugation']['compound']))>0)}")
    print(f"With mnemonic: {sum(1 for r in records if r['mnemonic'])}")
    print(f"With translation: {sum(1 for r in records if r['translation'])}")
    print(f"With lead image: {sum(1 for r in records if r['legacy_image_url'])}")
    print(f"With intro prose: {sum(1 for r in records if r['intro_html'])}")
    print(f"Anomalies: {len(anomalies)}")
    for p, why in anomalies[:30]:
        print(f"  - {p}: {why}")


if __name__ == "__main__":
    main()
