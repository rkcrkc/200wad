# Onboarding Flow → Figma Build Plan

Populating the **PRODUCTION** page of the `200w | Design` Figma file with the onboarding flow screens.

- File key: `xB6qK0NWorMksEo0qw48Bf`
- Target page: `679:23020` (**PRODUCTION**) — currently empty, so this is a from-scratch build
- Design system lives on the **Design v1** page (`1:2`); ~90 published components

> **Status: built.** All 16 frames plus 5 local components live in the **Onboarding Flow**
> section (`1103:8292`) on the PRODUCTION page. See [Built inventory](#built-inventory).

## Scope (confirmed with user)

| Decision | Choice |
| --- | --- |
| Breakpoints | Both desktop (1440×1024) and mobile (390×844) |
| Screens | Core 4 + error/loading states + language empty state + alternate `/onboarding` page |
| Desktop framing | Modal centred over a 50% black scrim on a full page frame |

16 frames total: 7 desktop, 7 mobile, 2 for the alternate page.

## Source of truth

| Screen | Source |
| --- | --- |
| Language / Signup / Signin / Check email | `src/components/auth/OnboardingModal.tsx` |
| Modal chrome, responsive behaviour | `src/components/ui/modal-shell.tsx` |
| Mobile top bar | `src/components/GuestMobileNav.tsx` |
| Alternate page | `src/app/(auth)/onboarding/OnboardingClient.tsx` |

## Design system component keys (Design v1)

Import with `importComponentSetByKeyAsync` (SET) / `importComponentByKeyAsync` (COMP).

| Component | Type | Key |
| --- | --- | --- |
| Button | SET (Default/Hover) | `27c0d7338b6de2b172c61f02e39543056e759871` |
| Button Outline | SET (Default/Hover) | `87a0a24a0e6530595e607f56fd6ddfa5351ab8b1` |
| Button Small | SET (Default/Hover) | `0f862c802aae4d4d00d8d25053dee3b68fdc42f4` |
| Button Icon | SET (Arrow-Forward/Close) | `892c12dba10a8cabe52458e3fa2d033cb54786a3` |
| Icon 24px/Chevron Right | COMP | `4da6a570af31922b8a169644c07b8b1d5ce4036c` |
| Navbar NEW | SET (Default/Test/Lesson) | `325f20b1ed6ff7095d12257d689691e84b07a9b5` |
| Card | SET | `24e4c3656ef90a49a635bbc042e60dea5402d136` |
| Pill | COMP | `88c09211f7bfb4167b0a8802468821d7ba6b98a3` |
| Tab | SET (Selected/Hover/Unselected) | `fa2d1237f5346cb1f5603201877ad8edde560516` |
| Progress Ring | COMP | `83d2e6fca3990ac17d11b427700598489073aef5` |

## Tokens

Fonts — **verify style names via `listAvailableFontsAsync` before use** (`Semi Bold`, not `SemiBold`):

- **Bricolage Grotesque** — display only: `.text-page-header`, `.text-xxxl-semibold`, `.text-xxl-semibold`
- **Inter** — everything else

Colors:

| Token | Value |
| --- | --- |
| background / bone | `#faf8f3` |
| foreground | `#141515` |
| muted-foreground | `rgba(20,21,21,0.75)` |
| primary | `#0b6cff` |
| success | `#00c950` |
| destructive | `#fb2c36` |
| border | `#e5e7eb` |
| beige / secondary | `#f2ead9` |
| modal header band | `#EDE8DF` |

Type ramp (line-height 1.35 throughout):

| Utility | Size / weight | Letter-spacing |
| --- | --- | --- |
| `.text-page-header` | 40 / 700 Bricolage | -0.025em |
| `.text-xxxl-semibold` | 32 / 600 Bricolage | -0.025em |
| `.text-xl-semibold` | 24 / 600 | -0.025em |
| `.text-large-semibold` | 20 / 600 | -0.02em |
| `.text-medium-medium` | 18 / 500 | -0.015em |
| `.text-regular-medium` | 15 / 500 | -0.015em |
| `.text-small-semibold` | 14 / 600 | -0.01em |
| `.text-small-regular` | 14 / 400 | -0.005em |
| `.text-xs-medium` | 13 / 500 | -0.01em |

Shadows: `--shadow-panel: 0px 5px 40px -10px rgba(0,0,0,0.25)` for the modal card.

## Local components to create first

Built once on PRODUCTION, then instanced across all 16 frames.

1. **Language Card** — variants `Default` / `Selected`. 16px radius, white fill. Default border `#e5e7eb`; Selected border `#0b6cff` + fill primary at 5%. Flag emoji 30px, name `.text-xl-semibold`, 16px gap. Selected shows a 32px `#0b6cff` circle with a white check.
2. **Text Field** — variants `Default` / `Focus`. Label `.text-small-semibold`; input 8px radius, white fill, 1px `#e5e7eb`, padding 16/12. Focus adds `#0b6cff` border + 2px primary/20 ring.
3. **Modal Shell** — variants `Desktop` / `Mobile`. Desktop 448×720, 24px radius, header `#EDE8DF`, body + footer `#faf8f3`. Mobile 390×844, 0 radius, all bone.
4. **Course Thumb** — for the alternate page only. 100px min width, 8px radius, muted/50 fill, 8px padding, 40px image slot, 12px muted label.

## Frame inventory

### Desktop — 1440×1024, modal over 50% black scrim

1. Language selection — empty (button disabled, label `Continue`)
2. Language selection — Spanish selected (label `Start Spanish`)
3. Create account
4. Create account — error state
5. Create account — loading (`Creating account…` + spinner)
6. Sign in
7. Check your email

### Mobile — 390×844, full-screen

Same seven states. Differences: no scrim; card fills viewport; rounded-none; bone throughout
(the header band is *not* visually distinct); `GuestMobileNav` 72px at top; 20px horizontal
padding; footer pinned with a faint black/5 top border plus safe-area bottom inset.

### Alternate `/onboarding` page — desktop + mobile

Centred 512px column. Heading `What language are you learning?` in `.text-page-header`,
subtitle `You can explore more languages later`. Cards use 12px radius, 16px padding, name at
`.text-large-semibold`, a course-count line, a bare 24px checkmark (no circle), and a horizontal
row of Course Thumb tiles. Full-width `Continue` button, 48px tall.

## Copy reference

| Screen | Heading | Subheading |
| --- | --- | --- |
| Language | Welcome to 200 Words a Day | What language do you want to study? |
| Signup | Create your account | Sign up to save your progress |
| Signin | Welcome back | Sign in to continue learning |
| Success | Check your email | We've sent a confirmation link to **{email}**. Click the link to start learning! |

Signup legal text: *By creating an account, you confirm you're 16 or older and agree to our
**Terms** and **Privacy Policy**.*

Success info rows: 🎓 **What's included free:** First 10 lessons in Spanish · ✨ Upgrade anytime
for full access to all lessons · `View Plans` link.

Languages to display: Spanish 🇪🇸, French 🇫🇷, German 🇩🇪, Italian 🇮🇹, Portuguese 🇧🇷, Japanese 🇯🇵.

## Built inventory

Everything sits in the **Onboarding Flow** section (`1103:8292`, origin `0,0`) on PRODUCTION.

### Local components (row at `y = 3800`)

| Component | Node | Variants |
| --- | --- | --- |
| Language Card | `1104:8301` | `State = Default / Selected` |
| Text Field | `1105:8292` | — |
| Social Button | `1105:8317` | `Brand = Google / Facebook / Apple` |
| Primary Button | `1108:8302` | `State = Default / Disabled / Loading` |
| Guest Mobile Nav | `1115:8440` | — |

The design system on **Design v1** is *local to this file, not a published library*, so
`importComponentByKeyAsync` fails — components must be reached by node ID. Its `Button` set also
renders in **Matter-TRIAL**, which isn't installed, so `setProperties` throws on any text override.
That is why `Primary Button` above is a purpose-built Inter component mirroring
`src/components/ui/primary-button.tsx` rather than an instance of the DS button.

### Desktop — 1440×1024, `y = 100`

| Frame | Node | x |
| --- | --- | --- |
| D1 · Language selection — empty | `1109:8292` | 100 |
| D2 · Language selection — Spanish selected | `1109:8321` | 1640 |
| D3 · Create account | `1110:8323` | 3180 |
| D4 · Create account — error | `1110:8379` | 4720 |
| D5 · Create account — loading | `1110:8437` | 6260 |
| D6 · Sign in | `1114:8440` | 7800 |
| D7 · Check your email | `1114:8492` | 9340 |

### Mobile — 390×844, `y = 1300`

M1 `1115:8449` · M2 `1115:8485` · M3 `1117:8487` · M4 `1117:8550` · M5 `1117:8615` ·
M6 `1117:8678` · M7 `1117:8737` (same seven states, `x` stepping 490 from 100).

### Alternate `/onboarding` page — `y = 2600`

A1 desktop `1118:8644` · A2 mobile `1118:8713`.

## Implementation notes worth keeping

- **Modal header is `text-center`** (`modal-shell.tsx`), and `OnboardingModal` overrides its padding
  to `pt-6 pb-5 sm:pt-8 sm:pb-6` → desktop `32 / 24`, mobile `24 / 20`.
- Desktop card is `bg-white` with a `#EDE8DF` header band; mobile is one continuous bone surface
  (the band only appears at `md`+) with the footer pinned under a `black/5` top border and a
  safe-area bottom inset.
- Headings are `text-3xl font-bold` (30/700 **Inter**) — *not* `.text-page-header`. Only the
  alternate `/onboarding` page uses `.text-page-header`, which is Bricolage and clamps
  `28px → 40px`, so A2 is set at 28 and A1 at 40.
- D3–D5 and M3–M5 intentionally clip the divider and social buttons: the real modal body scrolls,
  and this is what's above the fold.
- A2's column is top-aligned rather than centred — the content is taller than 844px, and centring
  clipped the heading off the top of the frame.
- Variables must be resolved by name via `getLocalVariablesAsync("COLOR")`. Passing a bare
  `"280:13809"` to `getVariableByIdAsync` returns `null`, and `setBoundVariableForPaint` then
  silently yields opaque black.

## Known gaps

- A1/A2 use a **placeholder top bar** (the Guest Mobile Nav instance). The real page renders the
  full `Header` component, which hasn't been built in Figma.
- Hover/focus states aren't drawn; only the states listed above.
