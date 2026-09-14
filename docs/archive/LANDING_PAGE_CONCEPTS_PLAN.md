# Landing Page Concepts C & D — Plan

Two further independent landing-page concepts responding to `200-words-a-day-landing-page-design-brief`, joining the existing `/home` and `/home/b` for side-by-side comparison.

| | Concept C — `/home/c` | Concept D — `/home/d` |
|---|---|---|
| Strategy | **Proof-first, blank-moment voice** (A+B hybrid): descriptive header + objection-handling hook in the emotional register of going blank mid-sentence; the auto-playing demo occupies the hero imagery slot | **Brand-first, gloriously unhinged** (D): the cartoons and sticky-note heritage *are* the page; deadpan British wit; method shown, not told |
| Visual system | Evolved heritage: the app's existing design system (`#faf8f3`, Bricolage, current type utilities) + cartoon warmth | The supplied brand CSS verbatim as tokens: ink outlines, hard offset shadows, warm paper + dot grid, marker yellow, pink, Space Mono eyebrows, Newsreader quotes |
| Shell | Self-contained nav + footer styled to match (not `MarketingNav`/`MarketingFooter`) | Same — fully self-contained |

## User goal & entry points

A first-time, sceptical visitor (already using Duolingo/a class) lands from an ad or referral. One job: understand what 200 Words a Day is, believe it will work for *them*, and click the single primary CTA → `/signup`. Routes are public marketing pages; no auth, no guest-mode interaction.

## The auto-playing hero demo (shared mechanics, skinned per concept)

Non-interactive by design (per direction): the visitor watches the method work rather than doing work. One `"use client"` component, two skins.

**Word trio (assets verified: image + foreign & trigger audio all present):**
1. `la fragola` — strawberry (f) — female frog kicks a strawberry goal → shows the **feminine gender trigger**
2. `il tegame` — pan (m) — Mr T plays the TEA GAME → **masculine + recurring famous face**
3. `nuotare` — to swim — swimming in a NEW TYRE → **verb, cleanest sound-alike**

**Script per word (~8–9s, then cycle, loop forever):**
1. *Learn* — cartoon appears with the sound-alike trigger line and foreign word ("la fragola — 'fra-go-la'").
2. *Test* — card flips to a test prompt ("strawberry → ?"); a ghost cursor types the answer letter-by-letter with per-character green feedback (mirrors the app's real character-level marking).
3. *Payoff* — tick, "1/3 to mastered" streak dots, brief hold, advance to next word with a progress indicator (· · ·).

**States:**
- **Loading:** static first frame (word 1's learn state) renders server-side; animation hydrates in. No skeleton flash.
- **Reduced motion / no JS:** static learn-state card for word 1, with visible dots implying more — no auto-cycling. (Brand CSS already zeroes animations under `prefers-reduced-motion`.)
- **Image failure:** images ship locally in `/public/marketing/demo/` (copied from the `word-images` bucket) — no runtime Supabase dependency, optimised via `next/image`.
- **Audio:** never autoplays. A speaker button on the card plays the native-speaker foreign audio on click (also copied locally) — this is the one interactive affordance, and it's optional.
- **Hover/touch:** pause on hover (desktop) so the card can actually be read; resumes on leave.

## Concept C — `/home/c` ("Proof first, blank-moment voice")

**Provisional hero copy** (final copy at build, same register):
- Eyebrow: `200 WORDS A DAY · FRENCH · SPANISH · GERMAN · ITALIAN`
- H1: *"You know the word. It just won't come out."*
- Subhead: *"200 Words a Day builds your vocabulary with absurd little cartoons your memory can't drop — so the word is there when you open your mouth. Works alongside whatever app, class or tutor you already use."*
- CTA: **Start remembering — free** · beneath: *No card · All 4 languages · Free lessons are yours forever*
- Hero right (mobile: below CTA): the auto-demo.

**Section order (hero → footer):**
1. Minimal nav (logo · How it works · Pricing · Log in · Start free)
2. Hero as above
3. **Recognise vs recall** — names the wall: you can pass the multiple-choice, but speaking needs recall; triggers are retrieval cues ("the picture finds the word for you")
4. **How it works** — 3 steps: see the picture → gender learned at the same time (never guess *le* or *la* again) → spaced review (a day, a week, a month)
5. **Complement strip** — "Keep your streak. Keep your tutor. Add the words." (never trashing other tools)
6. **Depth** — 1,000+ words per course, 40+ short lessons, beginner→advanced (reuses `MARKETING_STATS`)
7. **Testimonials** — retention-centred; *only real quotes* — placeholder-flagged until supplied
8. **Free-tier band + reassurance sweep** — one small element: works on your phone · progress saved to your account, any device · miss a week, pick up where you left off · cancel in two clicks
9. Final CTA repeat → self-styled footer

**4-question test (hero):** What is it? — eyebrow + subhead name the product, category (vocabulary), and languages. Who's it for? — H1 + "alongside whatever you already use" = people already learning. Benefit? — words there when you speak. Next step? — one blue CTA, free-ness attached.

**Objections:** addresses #1 (demo + H1), #3 (complement strip), #4 (triggers are pre-made, drawn for you), #5 (free-tier band), #9–12 (sweep). Deliberately omits #2 (never leads with the number), #6–8, #13–14 — low leverage; flow beats coverage.

## Concept D — `/home/d` ("Gloriously unhinged")

**Provisional hero copy:**
- Eyebrow (Space Mono): `A SERIOUS VOCABULARY METHOD. HONESTLY.`
- H1 (huge Bricolage, one marker highlight): *"A frog kicks a strawberry into a goal. That's Italian."*
- Subhead: *"200 Words a Day teaches French, Spanish, German and Italian vocabulary with cartoons too silly to forget. See the picture, recall the word — 1,000+ words per course."*
- CTA: **Start free** (`.btn.big`) · *No card. Keep the free lessons forever.*
- Hero visual: the demo as a **tilted comic panel** (`.panel`), auto-advancing like a strip.

**Section order:**
1. Comic-styled nav (logo chip on marker yellow · Method · Pricing · Log in · Start free)
2. Hero as above
3. **"A ridiculous way to learn. It works."** — grounding: real mnemonic technique used by memory champions; since 2004 (defuses gimmick doubt head-on, because this concept amplifies it)
4. **Gender triggers** — le/la colour-coding straight from the brand tokens (`--le`/`--la`); female characters star in feminine words' cartoons
5. **Sticky-note word wall** — a scattered collage of real cartoons with marker-highlight captions (the "too much data" case: capped grid, no infinite sprawl)
6. **Complement panel** — witty but respectful: "Duolingo taught you the grammar. We'll get you the words."
7. **Free tier + sweep** — pink pill reassurance cluster near the CTA
8. Final CTA repeat → comic footer

**4-question test (hero):** What is it? — subhead carries the full descriptive load (deliberate: H1 is the hook). Who's it for? — the four languages + "vocabulary" wedge. Benefit? — too silly to forget → recall. Next step? — one blue CTA (brand CSS golden rule: one blue CTA per screen).

**Objections:** addresses #6 *first* (this concept's amplified risk), #1 (demo), #3, #5, sweep #9–12 briefly. Omits #2, #7, #8, #13–14.

## Responsive

- C hero: two-column ≥`lg`, stacks (copy → CTA → demo) below; demo card max-width capped so cartoons stay legible on 360px screens.
- D: hard shadows and tilts reduced on mobile (shadow-sm, tilt ~0.5°) to avoid clipping; `.h-hero` already fluid via clamp; word-wall collage collapses to a 2-col grid.
- Nav collapses to logo + single Start-free button on mobile (no hamburger — nothing worth hiding).
- Long-string checks: German compounds in future demo words, headline wrapping at 320px, footer link wrapping.

## Reuse & implementation shape

- `src/components/marketing/demo/AutoDemo.tsx` — shared demo engine (script/timing/typing), presentational skin via props/children per concept.
- Concept C reuses: `Section`, `Button`/`PrimaryButton`, `MARKETING_STATS`/content lib, existing type utilities & palette. New sections built per DRY rules.
- Concept D: brand CSS adapted into a **scoped** stylesheet (e.g. `.concept-d` wrapper class) — its `body`/element-level rules must not leak into the rest of the app; fonts Newsreader + Space Mono loaded via `next/font` only on that route.
- Routes: `src/app/(marketing)/home/c/page.tsx` and `.../home/d/page.tsx`, each opting out of the shared marketing layout chrome as `/home/b` precedent allows (verify at build; if the group layout forces nav/footer, use route-level layout override).

## Data & permissions

- Pure static marketing pages: no runtime Supabase queries, no RLS surface, no guest-mode logic. Demo assets and copy are baked in.
- `/home/*` is already whitelisted as public in `src/lib/supabase/middleware.ts` (verify `c`/`d` sub-paths pass at build).
- Honesty must-holds: no star ratings or learner counts unless mapped to real data; testimonials only if real (flagged placeholders otherwise); every reassurance line literally true at launch (e.g. "progress on any device" — true of the SaaS rebuild).

## Out of scope (this pass)

Final copy polish beyond the provisional lines · A/B routing or analytics events beyond existing PostHog pageviews · per-language landing pages (`/learn/*` already exist) · retiring `/home` or `/home/b`.

---

# Appendix — Source brief

*Verbatim content of `200 Words a Day — Landing Page Design Brief` (the creative brief that concepts C & D respond to). Copied in here so the source of truth lives with the plan rather than as a loose file.*

**Creative brief for independent landing-page concepts**

We're rebuilding 200 Words a Day as a modern web app and want several independent landing-page concepts to compare and contrast. This brief gives you the product, audience, positioning, proof points, objections and the two frameworks we're designing against. It deliberately does not prescribe page layout, section order, or final copy — those are yours to invent. Bring your own structure and your own voice; treat every example line here as raw material to riff on, not a script to reproduce.

## 1. The objective

One job: get a first-time visitor to start the free tier (i.e. try it). A single primary call-to-action; every part of the page should serve it.

What success looks like: a stranger quickly understands what it is, believes it will work for them, and clicks "start free" — ideally after experiencing the method, not just reading about it.

## 2. The product — what it is

200 Words a Day is a vocabulary-learning web app (subscription) for French, Spanish, German and Italian. It is not a whole-language course — it is a fast, memorable way to build the words.

### How the method works

**Memory Triggers.** Every word is taught with an imaginative, often absurd cartoon that links the English word to the foreign word through a sound-alike. Example: French for poster is l'affiche ("la-feesh") → picture a mermaid putting up a poster of a fish. You see the picture, you recall the word.

**Gender Triggers.** A female character stars in every feminine word's cartoon, a male character in every masculine one — so grammatical gender is learned at the same time as the word. Most tools ignore this; it's a real pain point.

**Spaced review.** Words resurface a day, a week, then a month later, moving them into long-term memory.

Plus: native-speaker audio (real people, not AI), an example sentence per word, an alternative photographic flashcard mode, self-testing, and per-word notes.

### Scale & heritage

1,000+ words per course · 40+ short lessons (~5–12 min each) · beginner to advanced.

Everyday topics: food & drink, travel & directions, people, numbers & time, greetings, family, home, verbs, and more.

The method has existed since 2004 (previously CD-ROM, then download). This is a ground-up SaaS rebuild — so "your progress lives in your account, on any device" is now true and worth leaning on.

## 3. The audience

Adults learning a language who already use something else — Duolingo, Babbel, a class, a tutor — and keep hitting the same wall: they can recognise words but can't recall them when it's time to speak.

Often "tried and quit" before. Many believe they have a bad memory. Time-poor. Somewhat sceptical — they've been oversold to before.

Emotional core: the small, humiliating moment of going blank mid-sentence — the word is in there somewhere but won't come out. That feeling is the most valuable territory to speak to.

## 4. Positioning & strategic angle

We are the vocabulary layer, not a whole-language solution. Other tools teach grammar and structure but leave people short of words. We fill that gap and make the other tools work better. Frame us as a complement, not a replacement — never trash Duolingo, apps or tutors.

The honest dream: a strong vocabulary base gets you to fluency faster. We are the accelerant, not the finish line — imply "faster / base / foundation," but never promise fluency itself.

The ownable benefit: words that actually stick — still there weeks, months, years later — so you have them the moment you need them.

## 5. Brand personality & voice

Warm, witty, a little unhinged, British-flavoured, human. The cartoons are silly on purpose. We sound like a clever, funny person — not a corporate app.

Confident, not hypey. Let the method prove itself. Avoid exclamation-stacking and infomercial energy.

Visual heritage (reinterpret freely): hand-drawn cartoon characters (including recurring famous faces), a sticky-note / highlighter feel. You are encouraged to reimagine the visual identity entirely — we want a genuine range of directions to compare, so diverge boldly.

## 6. Key features & proof points

Select what serves your concept — you do not need to feature all of these. Overloading the page is a bigger risk than omitting a feature.

Memory Triggers · Gender Triggers · spaced review · native audio · example sentences · flashcard mode · self-testing · progress / learning-rate tracking · 1,000+ words per course · beginner→advanced.

**Signature interactive asset (optional but powerful):** a live micro-demo where the visitor learns ~3 words via triggers, is tested, and realises they remember them — proof through participation. Use it, adapt it, or ignore it; it is our single strongest device for making the claim believable.

**Credibility:** the method is based on established mnemonic techniques used by memory-competition champions (e.g. Paul Daniels). This can be cited/linked to defuse "gimmick" doubts.

**Social proof:** 20 years of learners and strong testimonials centred on retention ("it's staying in my head — a first"), on the cartoons "popping into your head" when you reach for a word, and on busy people who lapse and still recall. Note: any star ratings or customer counts must map to real data before launch.

## 7. Messaging — reference lines & register

These are springboards, not copy to reuse verbatim. Write your own lines; use these to understand the angles that resonate and the register to avoid.

### Angles that work (riff on these)

- **Retention:** "words that stick — for years, not days" · "still there when you need it" · "the cartoon pops into your head when you reach for the word."
- **Effort / ease:** "the lazy way to build your vocabulary" · "without the years of study" · "without the boring textbooks."
- **Anti-boredom:** "studying vocab shouldn't fill you with dread" · "is there anything more tedious than learning vocab?"
- **Complement:** "keep your streak, keep your tutor" · "the words your other tools leave out" · "do the vocab at home, spend class talking."
- **Gender:** "never guess le or la again."
- **Volume / base:** "serious vocabulary — not a starter pack" · "build a vocab of 1,000+ words."
- **Method:** "see the picture, recall the word" · "the picture finds the word for you."

### Register to avoid

- Absolute, scrutiny-inviting numeric hero claims. "Learn 200 words a day" as the headline invites disbelief. The "200 a day" idea lives better in the product name, the demo payoff, and body copy than as the headline promise.
- Pseudo-science / over-claims: "effortlessly," "snap-lock," "alpha brainwaves," "superlearning." Keep any "Memory Master / memory-champion" framing only if it's grounded in the real technique.
- Don't drop the word "vocabulary" from the core promise — it's our strategic wedge against broader tools.
- Naming: always use the full name "200 Words a Day" in customer-facing copy (never abbreviate).

## 8. Customer objections (ranked)

Handle the top ones well; don't try to answer them all. The strongest pages address the highest-pain objections and consciously ignore low-leverage ones rather than overloading. Prioritise flow, readability and the path to "try free."

| # | Objection (what they think) | Priority on the page |
|---|---|---|
| 1 | "It won't work for me — nothing ever sticks in my head." | Address (top emotional pain) |
| 2 | "200 a day? You can't really learn that many." | Defuse (don't lead with the claim) |
| 3 | "Do I even need this — I've already got Duolingo / a tutor?" | Address (complement, not replace) |
| 4 | "Isn't this just flashcards / mnemonics I've tried and dropped?" | Address (triggers are pre-made) |
| 5 | "What do I actually get free vs paid — is free a tease?" | Address (it gates the CTA) |
| 6 | "Cartoons + 'Memory Master' — is this gimmicky / made up?" | If room (ground it) |
| 7 | "Will it teach me to speak, or just recognise words on screen?" | If room |
| 8 | "Is the vocabulary useful, or random?" | If room |
| 9 | "What if I miss days and fall behind?" | Sweep (been-burned) |
| 10 | "Another subscription I'll forget to cancel." | Sweep (been-burned) |
| 11 | "Can I use it on my phone / on my commute?" | Sweep (been-burned) |
| 12 | "Setup / does my progress save across devices?" | Sweep (been-burned) |
| 13 | "Is my language & level properly covered? Is it worth the price?" | Low leverage — optional |
| 14 | "How long until I see results?" | Low leverage — optional |

**Note on the "sweep" cluster (9–12):** these are "been-burned" scars from other apps and our own legacy CD-ROM. Each flips with a single honest line, and they can be grouped into one small reassurance element rather than each earning its own section — a neat way to build trust near the point of sign-up without bloating the page. Any such reassurance must be literally true at launch.

## 9. Frameworks we're designing against

### Julian Shapiro — landing pages

- Core model: perceived value ≈ Desire − (Labour + Confusion). Raise desire; cut the effort and confusion of understanding the page.
- Header: make clear what we sell (favour a descriptive value prop), plus a hook — either a bold specific claim or one that overcomes the reader's top objection. We prefer the objection-handling hook here (a bold number invites scrutiny).
- Subheader: explain how it works, and why the claim is believable.
- Also: include social proof; drive to a single clear CTA; clarity beats cleverness.
- **The 5-second / 4-question test.** Within ~5 seconds of seeing the hero, a visitor should be able to answer: (1) what is it? (2) who's it for? (3) how does it benefit me? (4) what do I do next? Please annotate how your hero answers these four.
- **Feedback lens** — score your own concept on six axes: conversion, interest, clarity, expansion (what questions are left unanswered), brevity, and disbelief (does anything read as untrue or scammy).

### Alex Hormozi — the value equation

- Value = (Dream Outcome × Perceived Likelihood of Achievement) ÷ (Time Delay × Effort & Sacrifice).
- Push the top two up (a bigger honest dream; make people believe it'll work for them — via the demo, testimonials, credibility) and the bottom two down (make it feel fast and easy). Reduce risk: free tier, no card, cancel anytime.
- For us specifically: our naturally weak lever is Dream Outcome — don't just sell "more vocab," sell what the vocabulary base unlocks (faster progress toward actually speaking). Our strong levers are Likelihood (the demo) and Effort (cartoons, free, nothing to set up).

## 10. Practical inputs

- Languages at launch: French, Spanish, German, Italian. The main page is a catch-all for all four.
- Conversion goal: start the free tier.
- Pricing model (figures indicative; currency to confirm):

| Plan | Monthly | Annual (per mo) | Includes |
|---|---|---|---|
| Free | 0 | 0 | All languages, 5–10 lessons per course, no card, kept forever |
| Single language | 15 | 10 | One language, every course, no lesson caps |
| All languages | 20 | 15 | All four languages, every course, everything above |

The free tier is unusually generous (all languages, real lessons, no card) — a genuine asset. Make the value of "try free" obvious.

## 11. What we're NOT prescribing

This is your creative latitude — please do diverge:

- Page structure, section order and layout — yours to design.
- Final copy — write your own; the lines in §7 are springboards only.
- Visual identity — honour the cartoon / sticky-note heritage or reinterpret entirely. We want range.

### The few must-holds (non-negotiable)

- Single primary CTA = start free.
- Positioned as a complement, not a replacement for other tools.
- Honesty: every claim, rating and reassurance must be literally true at launch.
- Full product name in customer-facing copy; avoid the pseudo-science register.

## 12. Deliverable & how we'll compare

- Deliver: one landing-page concept (hero through footer), desktop and mobile if possible.
- Annotate: your hero's answers to the 4-question test, and note which objections you chose to address and which you deliberately left out (and why).
- We'll compare concepts on: clarity of what-it-is, strength of the hook, how believable the method feels, emotional pull, and how naturally the page drives to "try free."
