# 200 Words a Day — Design System

**Purpose:** Reference for the designer building the marketing site. This documents the current **product** design system exactly as it exists in code, so the marketing site can inherit the brand faithfully.

**Scope note:** A brand *refresh is in scope*. Treat everything below as the **starting point**, not a locked spec. Where the marketing site needs something the app doesn't have (hero layouts, marketing nav/footer, pricing tables, richer palette), the designer should extend or evolve this system rather than feel constrained by it. Sections marked **[EXTEND]** are known gaps the marketing site will need to fill.

**Source of truth in code:**
- Tokens, type scale, spacing, radius, shadows: `src/app/globals.css` (+ Tailwind v4 defaults)
- Runtime color tokens (word-highlight + status only): `src/lib/design-tokens.ts`
- Components: `src/components/ui/`
- Machine-readable export: `docs/design-tokens.dtcg.json`

> ✅ **Single source of truth.** Duplicate/dead token definitions were removed from `design-tokens.ts` (it now holds only the gender-highlight and status colors that are used at runtime). Every value below reflects what the app actually renders. There are no source conflicts to reconcile.

---

## 1. Brand assets

**[EXTEND] — to be supplied by client.**

The current `public/` folder contains only framework defaults (Next.js/Vercel SVGs) — there are **no production brand assets in this repo**. The designer will work from the logo and brand assets supplied separately.

Checklist of assets the marketing site will need:
- [ ] Primary logo (light + dark backgrounds)
- [ ] Logo mark / favicon / app icon
- [ ] Wordmark
- [ ] Social / OG share image (1200×630)
- [ ] Any illustration or photography direction
- [ ] Logo clear-space & minimum-size rules

---

## 2. Color

### Brand & core

| Token | Value | Usage |
|---|---|---|
| Primary (Blue) | `#0b6cff` | Primary actions, links, focus ring, brand accent |
| Blue Hover | `#005FF0` | Primary button hover |
| Blue Dark | `#0955cc` | Pressed / darker blue |
| Background (Bone) | `#faf8f3` | Page background |
| Beige | `#f2ead9` | Secondary/accent surfaces, ghost-button hover |
| Foreground (Black) | `#141515` | Body text, headings |
| White | `#ffffff` | Cards, popovers |

### Neutrals & UI

| Token | Value |
|---|---|
| Black 80% | `rgba(20, 21, 21, 0.8)` |
| Black 75% (muted text) | `rgba(20, 21, 21, 0.75)` |
| Black 50% | `rgba(20, 21, 21, 0.5)` |
| Black 20% | `rgba(20, 21, 21, 0.2)` |
| Gray Dark | `#101828` |
| Gray Mid | `#4A5565` |
| Muted surface | `#f5f5f5` |
| Border | `#e5e7eb` |
| Bone Hover | `#f6f3eb` |
| Yellow Light | `#fff6da` |

### Status

| Token | Value | Foreground |
|---|---|---|
| Success (Green) | `#00c950` | `#ffffff` |
| Warning (Orange) | `#ff9224` | `#ffffff` |
| Destructive (Red) | `oklch(0.577 0.245 27.325)` ≈ `#fb2c36` | `#ffffff` |

Status-state surfaces (used for word-progress chips in-app — useful reference for "learning/mastered" style badges):

| State | Background | Text/Accent |
|---|---|---|
| Mastered | `#e6f9f0` | `#00c950` |
| Learned | `#D5F3E5` | `#06AB48` |
| Learning | `#fff6da` | `#ff9224` |
| Not started | `#faf8f3` | `rgba(20,21,21,0.5)` |
| Locked | `#f5f5f5` | `rgba(20,21,21,0.3)` |

### Chart palette (OKLCH)

`chart-1` `oklch(0.646 0.222 41.116)` · `chart-2` `oklch(0.6 0.118 184.704)` · `chart-3` `oklch(0.398 0.07 227.392)` · `chart-4` `oklch(0.828 0.189 84.429)` · `chart-5` `oklch(0.769 0.188 70.08)`

### Dark mode

Dark-mode tokens exist in `globals.css` (`.dark`) but are **grayscale/placeholder** (e.g. background `oklch(0.145 0 0)`, primary desaturated to near-white) and are barely used in the app. **Recommendation:** marketing site likely doesn't need dark mode; if it does, the palette should be designed properly rather than inherited.

---

## 3. Typography

**Typeface:** [Inter](https://fonts.google.com/specimen/Inter) — variable font, weights 100–900, optical size 14–32. Loaded via Google Fonts.

- Display sizes (20px+) use optical size `opsz 32` for a tighter display cut.
- Body letter-spacing baseline: `-0.005em`.
- All type uses **line-height 1.35**.
- Rendering: antialiased, grayscale smoothing.

**Type scale** (each is a utility class in `globals.css`):

| Class | Size | Weight | Letter-spacing | Intended use |
|---|---|---|---|---|
| `.text-page-header` | 40px | 600 | −2.5% | Page H1 |
| `.text-xxl-semibold` | 32px | 600 | −2.5% | Large headings |
| `.text-xxl2-semibold` | 28px | 600 | −2.5% | Section headings |
| `.text-xl-medium` | 24px | 500 | −2.5% | Subheads |
| `.text-xl-semibold` | 24px | 600 | −2.5% | Subheads |
| `.text-large-medium` | 20px | 500 | −2% | Lead text |
| `.text-large-semibold` | 20px | 600 | −2% | Emphasis |
| `.text-medium-medium` | 18px | 500 | −1.5% | Body large |
| `.text-medium-semibold` | 18px | 600 | −1.5% | Body large emphasis |
| `.text-regular-medium` | 15px | 500 | −1.5% | Body |
| `.text-regular-semibold` | 15px | 600 | −1.5% | Body emphasis |
| `.text-small-regular` | 14px | 400 | −0.5% | Small body |
| `.text-small-medium` | 14px | 500 | −1% | Small body |
| `.text-small-semibold` | 14px | 600 | −1% | Labels |
| `.text-xs-medium` | 13px | 500 | −1% | Meta/captions |
| `.study-card-label` | 12px | 500 | −1% | Tiny labels |

**HTML defaults:** h1 28/600, h2 20/600, h3 16/600, h4 15/600 (all −2.5%, LH 1.35).

> **[EXTEND]** The current scale tops out at 40px because it's an app UI. A marketing site typically needs larger **display/hero sizes** (e.g. 56–80px). The designer should extend the top end of the scale while keeping the −2.5% tracking and Inter Display feel.

---

## 4. Spacing

The app uses **Tailwind v4's default spacing scale** (base `--spacing = 0.25rem = 4px`). Keys are Tailwind's numeric utilities:

`1 → 4px` · `2 → 8px` · `3 → 12px` · `4 → 16px` · `5 → 20px` · `6 → 24px` · `8 → 32px` · `10 → 40px` · `12 → 48px` · `16 → 64px` · `20 → 80px` · `24 → 96px`

> **[EXTEND]** Marketing sections usually need larger vertical rhythm (80–160px section padding) — Tailwind covers this (`py-20` = 80px, `py-40` = 160px), so no new tokens are needed; just use the larger steps.

## 5. Radius

Single scale — the Tailwind ramp the app actually renders (base `--radius = 0.625rem = 10px`):

`sm 6px` · `md 8px` · `lg 10px` (base, most common) · `xl 14px` · `2xl 18px` · `3xl 22px` · `4xl 26px` · `btn-sm 10px` · `full 9999px` (pills/circular)

## 6. Shadows

From `globals.css` — the set the app renders (utilities `shadow-card`, `shadow-card-hover`, `shadow-panel`, `shadow-bar`):

| Token | Value |
|---|---|
| `--shadow-card` | `0px 2px 20px -8px rgba(0,0,0,0.08)` |
| `--shadow-card-hover` | `0px 12px 32px -8px rgba(0,0,0,0.18)` |
| `--shadow-panel` | `0px 5px 40px -10px rgba(0,0,0,0.25)` |
| `--shadow-bar` | `0px -8px 30px -15px rgba(0,0,0,0.1)` |

## 7. Borders

Default border color `#e5e7eb`, rendered at Tailwind's default `1px` (`border`); `2px` via `border-2`.

## 8. Layout widths

Content max-widths: `840px` (sm) · `960px` (ms) · `1080px` (md) · `1280px` (lg).

## 9. Motion

- Transitions: `fast 150ms` · `default 200ms` · `slow 300ms`, all `ease`.
- Named animations in-app: `audiowave`, `focus-ping`, `button-pulse` (brand-blue halo `rgba(11,108,255,0.45)`), `scheduler-pulse`.
- All animations respect `prefers-reduced-motion: reduce`.

---

## 10. Components (current app library)

Existing reusable components in `src/components/ui/`. Marketing site can reuse the **primitives** (button, badge, input, tabs, switch, tooltip) but most app components are product-specific.

**Reusable primitives:** `button.tsx` (CVA: default/destructive/outline/secondary/ghost/link; sizes xs–xl + icon), `badge.tsx` (success/warning/white/outline/beige), `input.tsx`, `tabs.tsx`, `switch.tsx`, `tooltip.tsx`, `popover.tsx`, `skeleton.tsx`, `empty-state.tsx`, `modal-shell.tsx`, `toaster.tsx` (Sonner).

**Product-specific (reference only):** `xp-badge`, `xp-icon`, `progress-ring`, `status-pill`, `course-level-badge`, `sub-badge`, `score-indicator`, `podium-icon`, `confetti-burst`, `achievement-toast`, `audio-button`, `scroll-fade-row`, `AllLanguagesUpsellCard`.

**Button variants** (from `design-tokens.ts`) for quick reference:

| Variant | BG | Hover | Text | Border |
|---|---|---|---|---|
| Primary | `#0B6CFF` | `#0056D9` | `#FFFFFF` | none |
| Secondary | transparent | `#EFF6FF` | `#0B6CFF` | 1.5px `#0B6CFF` |
| Ghost | transparent | `#F2EAD9` | `#141515` | none |
| Subtle | `#FAF8F3` | `#F2EAD9` | `#141515` | none |
| Destructive | `#FB2C36` | `#DC1F28` | `#FFFFFF` | none |

Button sizes: sm 32px / md 40px / lg 48px height.

**[EXTEND] — marketing patterns the app does NOT have:**
- Marketing top-nav + footer
- Hero section(s)
- Feature grid / bento
- Pricing table
- Testimonial / social-proof blocks
- FAQ accordion
- CTA banner
- Logo cloud

---

## 11. Icons

**lucide-react** (`^0.563.0`), imported per-component. Two custom SVGs: `XpIcon` (wraps lucide Crown), `PodiumIcon`.

## 12. Tech stack (for build parity)

Next.js 16 (App Router) · React 19 · **Tailwind CSS v4** (PostCSS engine) · shadcn/ui-style components · `class-variance-authority` for variants · `tailwind-merge` + `clsx` · `sonner` toasts · `recharts`.

> If the marketing site is a separate build, match **Tailwind v4** and the Inter setup to keep tokens portable.

---

## 13. Accessibility baseline (inherit)

- Visible focus rings on interactive elements (`ring` = primary blue, 3px).
- Disabled = `opacity 0.5`, `cursor: not-allowed`.
- `aria-invalid` styling hooks on inputs.
- `prefers-reduced-motion` honored across all custom animations.
- Pointer cursor enforced on all clickable elements.

---

## 14. Open decisions for the designer

1. **Extend the type scale** upward for hero/display (current scale tops out at 40px).
2. **Decide on dark mode** for marketing (current dark tokens are placeholder).
3. **Define marketing-only components** (nav, footer, hero, pricing, testimonials, FAQ).
4. **Apply supplied brand assets** (logo, favicon, OG image).
