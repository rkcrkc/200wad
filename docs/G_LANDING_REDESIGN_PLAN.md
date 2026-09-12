# Landing Page Redesign — Concept G (Figma "LANDING PAGE FINAL – DRAFT V1")

Plan for building the finalised marketing landing page from the updated Figma, as a
**new concept route `/home/g`** (Concept F left untouched as reference). Figma copy is
the source of truth; the Testing-section visual and the About-card visual stay as
placeholders for now.

- **Figma page:** `1268:52254` — LANDING PAGE FINAL – DRAFT V1 (1440-wide, 15 sections)
- **Type styles / colours:** `1373:51100`
- **Components:** `1373:51101`
- **Reference build:** `src/app/(concepts)/home/f/`

---

## 1. Goal & approach

Reproduce the Figma faithfully — layout, colours, type, components — then layer in the
motion the user asked for (hero card-stack carousel, two testimonial marquees, the
solution word-card carousel, pricing billing toggle). We branch a fresh `home/g` folder
seeded from `home/f`, then adjust section-by-section. Most of F's building blocks
(`HeroTrigger`, `PricingCards`, `ProgressShowcase`, `EmailCapture`, `FaqAccordion`,
`concept-d.css` tokens) are reused; a `concept-g.css` skin carries the finalised tokens.

**Spacing note (from RC):** the Figma mixes manual spacer frames with auto-layout gaps.
In code we ignore the spacers entirely and use consistent Tailwind gap/margin utilities
— so this inconsistency doesn't carry over.

---

## 2. Route & file setup

New folder `src/app/(concepts)/home/g/`:

- `page.tsx` — server component, section composition (seeded from F, restructured to the
  Figma's section order).
- `concept-g.css` — imported after `concept-d.css`; finalised tokens + skin (like
  `concept-f.css`). Scoped under `.concept-g` / `.concept-d.concept-g`.
- Reused as-is (imported from `f/` or `e/`): `HeroTrigger`, `heroTriggerData`,
  `FaqAccordion`.
- Copied + modified into `g/`: `PricingCards`, `ProgressShowcase`, `EmailCapture`.
- New components in `g/`: `TestimonialMarquee`, `SolutionCarousel`, `CalloutComment`,
  `TopicCollage`, `ToolsCollage`, `SiteFooter`.

Wrapper: `<div className="concept-d concept-g …">` so concept-d base rules + g overrides
both apply (same pattern as F).

---

## 3. Design tokens — Figma → CSS variables

### Colours (Figma swatches → tokens)
| Figma hex | Meaning | Existing token | Action |
|-----------|---------|----------------|--------|
| `#191510` | ink | `--ink` ✓ | reuse |
| `#625F5C` | mid grey (captions/secondary) | — | add `--mono-soft: #625F5C` (F uses `#6e675d`) |
| `#878583` | light grey | — | add `--grey-2: #878583` |
| `#E3D8C1` | tan (pills, tabs) | `--tan` (`#ecdfc3`) | retune `--tan: #E3D8C1` |
| `#F2EAD9` | warm paper 2 | `--paper-2` (`#efe8d7`) | retune `--paper-2: #F2EAD9` |
| `#F6F1E6` | paper / page bg | `--paper` ✓ | reuse |
| `#0B6CFF` | blue primary | `--accent` ✓ | reuse |
| `#FFE14D` | yellow marker | `--marker` ✓ | reuse |
| `#FFFFFF` | white (cards) | `#fff` ✓ | reuse |

> Colours are **not yet defined as Figma colour styles** (RC's note) — they're raw hexes.
> We define them once in `concept-g.css` as the canonical set; no per-instance hexes in
> markup.

### Type styles (Figma → utilities)
Faces already wired in the app: **Bricolage Grotesque** (`--font-bricolage`), **Inter**
(`--font-inter`, already the concept-d body face), **Spline Sans Mono** (route-local
`--font-mono-d`). So no new font loading is needed — only scale/weight alignment.

> **No italic / Newsreader font is used at all in this design.** concept-d/F load
> Newsreader for an italic `.quote` treatment (`--font-quote-d`); `/home/g` must **not**
> import Newsreader and must **not** use `font-style: italic`. Any quote/testimonial copy
> is set in Inter (or Bricolage for display) upright. The concept-g skin drops the
> `--font-quote-d` import and either restyles `.quote` non-italic or avoids it entirely.

| Figma style | Spec | Maps to |
|-------------|------|---------|
| Heading XXL | Bricolage ExtraBold 56 / -2 | `.h-hero` (retune to ~56 desktop) |
| Heading XL | Bricolage ExtraBold 48 / -2 | section hero variant |
| Heading Large | Bricolage ExtraBold 36 / -2 | `.h-sec` |
| Heading Medium(-Large) | Bricolage ExtraBold 28–32 | card headings |
| Heading Small/XS/XXS | Bricolage Bold 24/20/14 | sub-headings |
| Body Medium/Small | Inter Regular 16/14 / -1 | body copy |
| Label XL…Micro | Inter Medium 24→12 / -1 | UI labels |
| Label Heavy Med/Reg | Inter SemiBold 16/14 | emphasised labels |
| Caption Regular/Small | Spline Sans Mono Medium 12/11, **tracking 6px**, UPPER | `.eyebrow` (widen tracking) |
| Button Text Med/Small | Bricolage Bold 16/14 | `.btn` / `.btn` small |

Concrete deltas vs concept-d defaults: headings go **ExtraBold with -0.02–-2 tracking**
(already 800 in concept-d ✓); eyebrow tracking widens from `0.06em` to match Figma's very
wide 6px caption tracking; add a `--font-mono-d` size step for the 11px caption. These get
encoded as `.concept-g` overrides, not inline.

---

## 4. Component inventory (reuse / modify / new)

| Component | Status | Notes |
|-----------|--------|-------|
| `HeroTrigger` (word demo card + autoplay) | **Reuse + extend** | Card content already matches ("to snore / roncar / Imagine…", pause+eq icons, answer bar). Add: **card-stack** backing (3 offset cards), English & foreign on **separate lines** (drop the "="), tab row already present. |
| `CalloutComment` (hand-drawn arrow + note) | **New** | Recurs 6+ times (hero ×2, solution ×2, testing ×1, tools ×1). One component: rough arrow SVG + handwritten-style caption, positioned absolutely. |
| `TestimonialMarquee` + `TestimonialCard` | **New** | Horizontal infinite auto-scroll; varying card heights; pause-on-hover; reduced-motion → static row. Used in §3 and §7. |
| `SolutionCarousel` | **New** | Auto-advancing horizontal carousel of word-demo cards (rotated, peeking neighbours), arrows optional. |
| `TopicCollage` | **New** | Scattered word cards with topic **Badge** pills overlaid (curriculum A). |
| `ToolsCollage` | **New** | Competitor logos scattered around a central "200 WORDS A DAY" disc (features C). *Needs logo assets — see §7.* |
| `PricingCards` | **Modify** | Retier to **Free / French only / All Languages**; add **language dropdown** on French-only; **Monthly / Annual – Save 25%** toggle; badges **Most popular** (yellow) / **Best value** (green). |
| `ProgressShowcase` | **Reuse (placeholder)** | Already matches Testing-B visual closely; left as-is per "keep placeholder". |
| `EmailCapture` | **Reuse/modify** | Match Figma email card (icon + heading + desc + input + secondary CTA). |
| `FaqAccordion` | **Reuse** | Matches §9. |
| `SiteFooter` | **New** | Expanded 4-column footer (Languages / Product / Account / Company) + brand + social icons + legal bottom row. |
| `Badge`, `CTA Button`, `Word Card Simple`, `Blog Card`, `Plan Card` | **Map to existing** | `.pill`, `.btn`, `WordCard`, existing blog/pricing markup. |

---

## 5. Section-by-section (Figma order + delta vs F)

Each section notes required **states** (empty / loading / error / long-copy / responsive)
where relevant.

1. **Announcement banner** — 3 messages. ✓ matches F. Mobile: stack/scroll.
2. **Navbar** — logo (Figma uses a brand logo vector; F uses a text wordmark → *needs logo
   asset, else keep wordmark*), links How it works / About / Pricing / Login, small CTA.
3. **Hero** — left: eyebrow (★ + "Join 1,000+ learners"), **H XXL** heading "The stupidly
   easy way to learn French that **sticks**" (marker underline), Figma subheading copy, two
   CTAs ("Start learning – it's free" / "Join waitlist"), caption, **3 badges** ("Learn
   1000s of words", "Fun & easy", "Start with just 10 mins a day"). Right: **tabs → card
   stack carousel** + arrows + **2 callout comments** ("How it works", "Warning: Sense of
   humour required"). Deltas: card stack visual, separate english/foreign lines, callouts.
   States: tab with no cards → "coming soon" (already in HeroTrigger); reduced-motion →
   static top card.
4. **Testimonials marquee** — auto-scrolling row of testimonial cards + "More reviews
   (100+)" secondary button. **New** (F used static masonry). States: pause-on-hover;
   reduced-motion static; long quote wraps within fixed card width.
5. **The Problem** — "Your lack of vocab is holding you back", background scribble, scattered
   emoji + quote-pill callouts. ✓ close to F's how-it-works intro; re-skin.
6. **The Solution** — eyebrow + "Now learning vocab couldn't be easier (or more of a laugh)"
   + steps **"1 See it → 2 Hear it → 3 Type it"** + **word-card carousel** + 2 callouts +
   CTA + **testimonial callout**. Delta: static fan → moving carousel; numbered stepcards →
   inline step row.
7. **Features** (single eyebrow header "WHY LANGUAGE LEARNERS LOVE 200 WORDS A DAY"):
   - **A · Curriculum** — `TopicCollage` (scattered word cards + topic badges) + copy
     "Thousands of words across lots of topics" + Beginner/Intermediate/Advanced badges +
     CTA. Delta vs F's 2-col topic grid.
   - **B · Testing** — white card wrap: copy "In-built testing makes progression easy" +
     `ProgressShowcase` (placeholder, kept) + 1 callout.
   - **C · Complementary Tools** — `ToolsCollage` (competitor logos around 200WAD disc) +
     copy "Works well alongside other study tools" + CTA + 1 callout.
8. **Social proof marquee** — second `TestimonialMarquee`. **New**.
9. **Pricing** — eyebrow + "Start free" + **Monthly / Annual – Save 25%** toggle + 3 plan
   cards (Free $0 / French only $10 + dropdown / All Languages $15) with Most-popular /
   Best-value badges + other-features badges. Modify `PricingCards`. States: toggle
   switches all prices + "billed annually" captions; dropdown open/closed.
10. **FAQs** — heading + `FaqAccordion`. ✓ reuse. States: expand/collapse, long answers.
11. **About** — card, **placeholder visual** (kept), Figma copy "Learning vocab was such a
    bore…", founder details (avatar + name), secondary CTA "Read our story".
12. **Closing CTA** — eyebrow + "Build a vocabulary of thousands of words, faster than
    ever!" + row of `Word Card Simple` + primary CTA. ✓ close to F.
13. **Email capture** — Figma email card (icon + heading + desc + input + secondary CTA).
    States: empty / typing / submit / success / error (already partly in `EmailCapture`).
14. **Blog** — eyebrow + "Get into the language learning spirit" + 3 blog cards. ✓ reuse.
15. **Footer** — expanded 4-column nav + brand + social icons + copyright/legal. **New**
    (F footer is a single row). *Social: lucide has Instagram/Youtube; TikTok needs an
    asset.*

---

## 6. Motion / interactivity (the requested piece)

All motion honours `prefers-reduced-motion` (concept-d already disables transitions/anim
globally under the media query — marquees/carousels must degrade to a static, readable
layout, not a frozen mid-scroll).

- **Hero card-stack carousel** — reuse `HeroTrigger` autoplay engine; add the 3-card stack
  backing and wire the existing arrows/dots to advance. (Already: english→foreign→trigger→
  answer autoplay, mute + play/pause, tabs.)
- **Testimonial marquees (×2)** — CSS transform/`@keyframes` transl  loop with duplicated
  track for seamless wrap; pause-on-hover; speed per section. Consider a shared
  `Marquee` primitive.
- **Solution word-card carousel** — auto-advance with eased horizontal motion and rotated,
  peeking neighbour cards; optional arrow/drag control.
- **Pricing billing toggle** — Monthly/Annual state already in `PricingCards`; re-label to
  "Annual – Save 25%" and swap price + annual caption.
- **Hero tabs & FAQ accordion** — already interactive; reuse.

---

## 7. Assets / data still needed

- **Brand logo** SVG (navbar + footer) — else fall back to the text wordmark.
- **Competitor logos** for Tools collage (Duolingo, Babbel, Rosetta Stone, italki,
  HelloTalk + generic "Classroom / Textbooks / TV & Movies / Audio courses / Language
  Exchange"). Placeholder pills if assets aren't licensed/available.
- **TikTok icon** (Instagram/YouTube exist in lucide).
- **Testimonials** — real quotes/names (currently placeholder copy).
- **Pricing** — confirm final tiers/prices; ideally source from the app's real
  `PricingTable`/Supabase rather than hardcoded placeholders before any real launch.
- **Testing-B visual & About visual** — intentionally placeholders for now.
- Word cartoons: reuse existing `DEMO_WORDS` / `WALL_WORDS` art.

---

## 8. Build order

1. Scaffold `home/g` (page + `concept-g.css`), wire tokens/type from §3, copy F shell.
2. Reconcile tokens/typography; verify base renders.
3. Static sections first: banner, nav, hero (left), problem, curriculum collage, testing,
   tools collage, pricing, FAQs, about, closing CTA, email, blog, footer.
4. Hero card-stack + callouts.
5. Motion: testimonial marquees ×2, solution carousel, pricing toggle polish.
6. Responsive pass (mobile), reduced-motion pass.
7. Quality checklist (§9), `npm run lint`.

---

## 9. Quality checklist (from CLAUDE.md)

- [ ] All states: empty/first-time, loading, error, success, "too much data".
- [ ] Long strings / large datasets don't break layout (marquee cards, testimonials, FAQ).
- [ ] Mobile/responsive verified (Figma is desktop-only → define mobile stacking per
      section: hero grid → 1 col, collages → simplified, marquees → keep, footer → stack).
- [ ] Keyboard/focus (tabs, accordion, pricing toggle, dropdown, carousel controls).
- [ ] Reduced-motion: marquees/carousels degrade to static, legible layouts.
- [ ] Reuses concept-d/g tokens + existing components; no off-palette hexes, no invented
      type utilities.
- [ ] `npm run lint` clean; no dead code.

---

## 10. Open questions for RC (non-blocking)

- Brand logo + competitor/social logo assets: provide, or use text/pill placeholders?
- Pricing: wire real Supabase pricing now, or keep placeholder figures for the concept?
- Mobile behaviour for the two collages (curriculum, tools) — simplified grid vs scaled
  scatter?
