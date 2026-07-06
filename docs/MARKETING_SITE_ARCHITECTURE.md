# 200 Words a Day — Marketing Site Architecture

**Status:** Canonical reference for the marketing-site build.
**Positioning owner:** Companion, not competitor (see §1).
**Design source of truth:** `docs/DESIGN_SYSTEM.md` + `docs/design-tokens.dtcg.json`. Reuse existing tokens and `src/components/ui/` primitives; the one gap is hero/display type sizes (>40px) — see `[EXTEND]`.

---

## 1. Positioning — the companion, not the competitor

**One line:** 200 Words a Day is **the retention layer for however you already learn** — not another app you choose *instead of* Duolingo, Babbel, a class or a tutor.

**Why this wedge:**
- The product genuinely *is* a focused vocabulary-retention engine (memory triggers + spaced testing + earned mastery). It's a *layer*, not a whole curriculum — leaning into that is honest.
- It expands the audience from "people willing to switch apps" to **everyone already learning a language**. Learners happily run 3–4 tools at once.
- It lets us **borrow the trust and search volume** of brands people already love instead of fighting them. We intercept "is Duolingo enough?" / "I can't remember what Duolingo teaches me" with *"you don't have to choose — add the memory layer."*
- It targets the universal, blameless pain: **the forgetting problem.** Everyone forgets most of what they're exposed to without triggers and retrieval practice. That's the only thing we fix.

**Messaging pillars (voice = instinctive, benefit-led, a little playful):**
- "Keep your app. Keep your class. Add the memory layer."
- "Turn words you've *seen* into words you actually *know*."
- "You're not forgetting because you're lazy — memory needs triggers and testing. That's all we do."

---

## 2. Copy direction

### Hero headline — candidates (`{language}` auto-rotates: French → Spanish → German → Italian)

**Recommended primary:**
> **Finally remember your {language} vocab — years later, not minutes later.**

Alternates (keep for A/B / copywriter):
- Finally remember every {language} word you learn.
- Word on the tip of your tongue? Not anymore.
- Learn {language} vocab — and actually keep it.
- {language} vocab made easy — and it sticks.
- The missing piece in your {language} puzzle. *(use as the companion-section headline, not the hero)*

### Hero subhead
> Memory triggers + smart testing turn words you've *seen* into words you *know* — alongside whatever app, class or course you already use.

### CTA microcopy
- Primary: **Start free — no card**
- Support line: First 10 lessons on us.

### Messaging hierarchy (top → bottom of the homepage)
Outcome → relatable pain → where we fit → how → what we complement.
1. **Hero** — *Finally remember your {language} vocab…* (emotional outcome)
2. **"Sound familiar?"** — the forgetting problem (*tip of your tongue… then gone*), no competitor blamed
3. **"The missing piece in your {language} puzzle"** — the stack diagram: *your app / class / immersion* **+ 200WAD retention layer**
4. **How it works** — memory triggers → test yourself → earn mastery
5. **"Plays well with everything you already use"** — Duolingo, Babbel, Pimsleur, classes, tutors, immersion → *we don't replace them, we make them stick* (the companion reassurance sits here, once they're bought into the outcome)
6. **Proof of retention** — earned mastery (4-tier) + honest character-level feedback
7. **Motivation layer** — streaks, leagues, achievements
8. **Languages** — 4 languages + course counts → language hubs
9. **Free tier** — first 10 lessons free, no card
10. **Testimonials** → **FAQ** (schema) → **final CTA**

---

## 3. Strategy: primary goal & three traffic engines

**Primary conversion goal:** qualified **free signup** → 10-free-lessons funnel → subscription. Every page ladders to this. Secondary: **email capture** for the not-ready, feeding the same nurture as the reactivation list.

| Engine | Intent | Landing surface | Job |
|---|---|---|---|
| **Google search** | High, specific | SEO hub (`/learn/*`, `/guides/*`, `/with/*`) | Rank → educate → signup |
| **Short-form (IG/TikTok)** | Low, curious, mobile | Link-in-bio + campaign LPs (`/go`, `/lp/*`) | Convert attention fast, capture email |
| **Dormant email (20k)** | Warm, lapsed | Reactivation LP (`/welcome-back`) | Re-permission → return → resubscribe |

Each engine gets purpose-built entry pages, then everything funnels through the shared conversion core (home / how-it-works / pricing / signup).

---

## 4. Sitemap

```
CONVERSION CORE
/            Home (v1 lives at /home until the app's / entry is reassigned)
/how-it-works   The method (memory triggers, study→test, earned mastery)
/pricing        Tiers (reuse the app's pricing CMS data)
/about          Brand story (also E-E-A-T signal)

SEO HUB (Google engine)
/learn                   Hub index
/learn/[language]        Language PILLAR (spanish|french|german|italian)
/learn/[language]/[topic]  Vocab + grammar clusters (programmatic from word data)
/guides/[slug]           Editorial (MDX)
/with/[product]          Companion pages (duolingo, anki, classes…) — collaborative framing
/for/[usecase]           Use-case pages (travel, heritage, students)

CAMPAIGN (short-form + paid)
/go              Link-in-bio hub (mobile-first, single CTA)
/lp/[campaign]   UTM landing pages

REACTIVATION (email)
/welcome-back    Dormant win-back LP

AUTH / APP (exists)
/signup /login /join/[code] → dashboard

UTILITY
/faq /contact /privacy /terms /refunds /404
```

Primary nav: **How it works · Languages ▾ · Pricing · [Log in] · [Start free]**
Footer carries SEO-hub links (languages, guides, companion pages) for crawl depth + internal linking.

---

## 5. SEO content architecture (primary lever)

Topic-cluster model: **pillar → cluster → signup.**

Four page families, priority order:
1. **Language pillars (4).** Head terms ("learn Spanish", "Spanish for beginners"). Authoritative, link to everything below.
2. **Programmatic vocabulary pages — the unfair advantage.** We own structured word lists with audio + memory triggers. Turn them into useful reference pages ("100 most common Spanish words with audio", "Spanish food vocabulary"). Rank on long-tail *and* demo the product. Generated from Supabase course/word data via `generateStaticParams` + ISR.
3. **Companion pages (`/with/*`, `/for/*`).** Intercept competitor/brand searches with a collaborative frame. High commercial intent, near conversion.
4. **Editorial guides (MDX).** Top-of-funnel ("how many words to be fluent in Spanish", "how to memorize vocabulary", "what is spaced repetition"). Feed the clusters.

**Technical SEO (free by staying in the Next project):**
- SSG/ISR for hub pages; per-page Metadata API (title/description/canonical/OG); `next/og` dynamic OG images.
- JSON-LD: `Course`, `FAQPage`, `Article`, `BreadcrumbList`, `Product`/`Offer` on pricing.
- `sitemap.ts` + `robots.ts`, clean internal linking, Core Web Vitals budget.

**Content source:** **MDX in-repo** for guides (Markdown + embeddable React components, e.g. a live word demo inside an article). Vocab pages generated from word data. Add a headless CMS only if a non-technical content hire needs self-serve publishing.

---

## 6. Short-form funnel (IG/TikTok)

Low-intent mobile traffic gets its own surface, not the full homepage:
- **`/go` link-in-bio hub:** one screen, thumb-first, memory-trigger hook, single **Start free** CTA, email capture as fallback for the not-ready majority.
- **`/lp/[campaign]` templates:** themed per content series/creator, UTM-tracked, continuous with the video's tone (the video *is* the product demo).

---

## 7. Email reactivation (20k dormant)

Dormant lists are a deliverability hazard as much as an opportunity — blasting 20k cold addresses risks sender reputation and spam traps.
- **Segment first:** never-activated vs. previously-active-lapsed vs. previously-paid.
- **`/welcome-back` LP:** *"Still learning elsewhere? Come back for the part that makes it stick"* — additive framing that fits the companion positioning; show what's new (leagues, memory-trigger video, new courses) + a win-back incentive.
- **Re-permission + sunset flow:** warm up sending, re-engage in waves, drop non-openers to protect deliverability; preference center for easy resubscribe.
- **Incentive (leaning):** extended free lessons — re-hooks with the product, reinforces "just add the layer" over discount-training. *(Locked in Phase 3.)*

---

## 8. Build: structure & templates

Same Next project, new route group **`app/(marketing)/`** with its own `layout.tsx` (marketing nav + footer), cleanly separated from `(dashboard)` and `(auth)`. Reuses cleaned design tokens + `src/components/ui/` primitives.

Reusable pieces (`src/components/marketing/`):
- `MarketingNav`, `MarketingFooter`
- `RotatingWord` (auto-rotating language token)
- `Section` (consistent vertical rhythm + content width)
- Blocks: `Hero`, `MissingPiece` (stack diagram), `HowItWorks`, `CompanionStrip` ("plays well with"), `FeatureBlock`, `Testimonials`, `FAQ`, `FinalCTA`, `EmailCapture`
- Shared content data: `src/lib/marketing/content.ts` (languages, companion products, FAQs) so nav, homepage and hubs stay DRY.

Page templates: `Home`, `HowItWorks`, `Pricing`, `LanguageHub`, `ContentArticle` (MDX), `CompanionPage`, `CampaignLP`, `ReactivationPage`, `LinkInBio`, `LegalDoc`.

`[EXTEND]` — hero/display type sizes above 40px are the one token gap; keep −2.5% tracking and Inter Display feel.

---

## 9. Measurement

- **North star:** qualified free signups.
- **Funnel:** visit → signup → first lesson done → 10-lesson wall → subscribe.
- **Per-channel:** SEO LP→signup %, short-form LP→signup %, email→return %. UTM everywhere; event-track every CTA; PostHog (already wired) + GA4; consent banner.

---

## 10. Phasing

- **Phase 0 — Core:** marketing route group + layout, home, how-it-works, pricing, signup wiring, analytics, legal.
- **Phase 1 — SEO backbone:** 4 language pillars, `/learn` index, ~15 cornerstone guides/vocab pages, sitemap + schema + OG.
- **Phase 2 — Programmatic scale:** vocab/topic pages from course data, companion pages.
- **Phase 3 — Campaign infra:** `/go` + `/lp` template, `/welcome-back` + segmented win-back flow.

---

## 11. Locked decisions

| Decision | Choice |
|---|---|
| Primary CTA | Free signup → 10-free-lessons funnel |
| Content source | MDX in-repo (guides) + programmatic vocab pages; CMS later if needed |
| Competitor stance | Build companion pages (`/with/*`, `/for/*`) — collaborative, not teardowns |
| Positioning | Companion / retention layer, not "better than X" |
| Reactivation incentive | Leaning extended free lessons; confirm in Phase 3 |
| Homepage route | `/home` in v1; reassigning `/` from the app entry is a separate product decision |

---

## 12. Build status (v1)

Live routes under `src/app/(marketing)/`: `home`, `home/b`, `how-it-works`, `pricing`, `learn`, `learn/[language]`.

**Two homepage variants to compare:**
- **`/home` — positioning-led (A):** leads with the companion/"missing piece" story and emotional forgetting hook, then a depth section (live catalogue stats + beginner→advanced course families + topics), method, plays-well-with, earned mastery, motivation, languages, FAQ.
- **`/home/b` — method-led (B):** inspired by the original 200words-a-day.com. Leads with the signature memory-trigger *demonstrated* (worked trigger cards: `le pain`/pain, `il gatto`/gateau, `der Hund`/hunt), then see-it/hear-it/type-it, the same depth section, a words-per-day progress chart (nod to the original), a brief companion note, languages, FAQ. `noindex` while it's an A/B variant.

**Live data wiring:**
- **Pricing** (`components/marketing/PricingTable.tsx`, server) fetches `getActivePricingPlans()` from the pricing CMS and renders the client toggle `PricingTableClient.tsx`. Free tier is static; paid tiers pull live amounts. Annual headlines the **monthly-equivalent** (`amount_cents / 12`) with the billed annual total beneath. Current live prices: Single $15/mo · $120/yr ($10/mo) · $199 lifetime; All-languages $20/mo · $180/yr ($15/mo) · $299 lifetime.
- **Catalogue stats** in `lib/marketing/content.ts` (`MARKETING_STATS`, per-language `lessonCount`/`wordCount`) are rounded-down real values verified against published courses: 19 courses · 2,000+ lessons · 23,000+ words · 4 languages. `example_sentences` is currently empty, so the site makes no sentence-count claim.
