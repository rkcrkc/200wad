# Post-signup continuation + Upgrade flow → Figma map

Mapping what **currently exists** onto the PRODUCTION page of `xB6qK0NWorMksEo0qw48Bf`, as-is.
No code changes. Everything drawn reflects the code at time of writing, including the parts that
are broken — see [Open points](#open-points-to-review-after-mapping), which are parked until the
map is done.

Breakpoint rule: **desktop always, mobile only where the layout genuinely differs.**

Two new sections below the existing `Onboarding Flow` section (`1103:8292`, `0,0 → 11000,4100`).

> **Status: built.** E1–E8 and U1–U9 are on the PRODUCTION page. See
> [Built inventory](#built-inventory). Mapping surfaced four more issues — they are appended to
> [Open points](#open-points-to-review-after-mapping) as items 6–9 and, like the rest, are parked.

Companion doc: [`UPGRADE_UX_ANALYSIS.md`](./UPGRADE_UX_ANALYSIS.md) maps every upgrade touchpoint
across the app (not just these screens) and carries the wider backlog. It was reconciled against
the code at the same time as this map, so the two agree.

---

## E-series — post-signup continuation (`y = 4300`)

The existing D7 (`1114:8492`) / M7 (`1117:8737`) already map the "Check your email" screen, so
they stay as-is. The E-series picks up everything *after* it.

| # | Frame | Size | Source |
| --- | --- | --- | --- |
| E1 | Confirmation email as received | 900×1000 | GoTrue stock template — every `[auth.email.template.*]` block in `supabase/config.toml` is commented out, so there is **no custom template**. Subject `Confirm Your Signup`, body `Confirm your signup` / `Follow this link to confirm your user:` / `Confirm your mail` |
| E2 | Expired / invalid link → `/login` | 1440×1024 | `login/page.tsx`. Drawn **without an error banner**, because that's what actually renders — see open point 2 |
| E3 | Verify-email reminder — idle | 1440×1024 | `EmailVerificationReminder.tsx` |
| E4 | Verify-email reminder — sending | 1440×1024 | ” `Sending...`, button disabled |
| E5 | Verify-email reminder — sent | 1440×1024 | ” button **replaced** by the green confirmation, not merely disabled |
| E6 | Verify-email reminder — error | 1440×1024 | ” destructive banner above the button |
| E7 | Verify-email reminder — mobile | 390×844 | `max-w-md` (448) exceeds a 390 viewport, so it reflows to full-bleed inside `px-5` |
| E8 | Landing after confirmation | 1440×1024 | `/course/[id]/schedule` with `UpgradeModal` auto-opening via `just_signed_up` (`DashboardContent.tsx:229-236`) |

Mobile skipped for E1 (an email client, not our surface), E2 (the login card is `max-w-md` in a
centred flex; below 448 it just goes full-bleed — no structural change) and E8 (the modal detail
lives in U9).

E8 is a handoff frame: it shows the schedule page dimmed under the opening modal, with the modal
itself detailed in the U-series rather than duplicated.

---

## U-series — UpgradeModal (`y = 5600`)

Desktop canvas 1440×1024. Modal is `max-w-6xl` (1152) × `90vh` (922), `rounded-3xl`, white, over
`bg-black/50`, `z-[60]`. A fixed bone top bar holds only the close `X`; the bone header band
below it carries a 64px white circle with `Lock`, the heading and the subheading. Footer CTAs are
styled as card *bottoms* (`rounded-b-3xl`, `border-t-0`, matching each card's border and fill) so
every column reads as one continuous card despite the middle section scrolling independently.

| # | Frame | Notes |
| --- | --- | --- |
| U1 | Choose a Plan — **Annual** | The default (`useState<BillingModel>("annual")`). `Save $60/year` green pill, `$120 billed annually` sub-line. Live counts, so this is the `LanguagesUpgradeProvider` render site |
| U2 | Choose a Plan — Monthly | $15 / $20. No pill, no sub-line; the Free card's invisible spacer collapses |
| U3 | Choose a Plan — Lifetime | $199 / $299, `Yours forever` pill, `Pay once, access forever`. **No suffix at all** — see open point 7 |
| U4 | Upgrade to Unlock — lesson gate | `Upgrade your plan to study 'Where? (2)'`; token-free fallback benefits on both paid cards, since the gate passes no live counts |
| U5 | Language picker open | 224px `rounded-xl` listbox, `shadow-xl`, check on the selected row. The flag stays in the icon row — `header` replaces only the title line |
| U6 | Checkout loading | Language CTA spinner (chevron dropped); the other CTA disabled at 50% |
| U7 | Checkout error | `Something went wrong. Please try again.` above the CTA row. `checkoutTier` resets to `null`, so both CTAs are live again |
| U8 | Two-card layout | `all-languages` absent from `enabledTiers` → `sm:grid-cols-2` |
| U9 | Mobile | 390×844; `grid-cols-1`, so all three cards *and* all three CTAs stack. See open points 8 and 9 |

Prices are live from `pricing_plans`: language 1500 / 12000 / 19900 ¢, all-languages 2000 / 18000 /
29900 ¢ (the `course` tier is inactive). Counts are live too — Spanish 5 courses · 447 lessons ·
~3800 words; all-languages 4 languages · 19 courses · 2095 lessons · ~23500 words.

Local components to build once and instance: **Pricing Card** (`Tone = Amber / Plain`) and
**Free Card**. Amber is `border-2 border-amber-200` on `bg-amber-50/50` with an `bg-amber-100/60`
header and a `Most popular` pill; plain is `border-beige` on white with a bone header.

Out of scope per the confirmed scope: the subscriptions page, `CheckoutFooterBar`, Stripe
checkout itself, and the success/cancel pages.

---

## Built inventory

### Section `Post-signup (E)` — `1136:8660`, origin `0,4300`, 11000×1302

| Frame | Node | x | Size |
| --- | --- | --- | --- |
| E1 · Confirmation email — GoTrue stock | `1136:8661` | 100 | 900×403 |
| E2 · Expired / invalid link → `/login` | `1136:8676` | 1100 | 1440×1024 |
| E3 · Verify-email reminder — idle | `1137:8678` | 2640 | 1440×1024 |
| E4 · ” sending | `1137:8696` | 4180 | 1440×1024 |
| E5 · ” sent | `1137:8714` | 5720 | 1440×1024 |
| E6 · ” error / rate-limited | `1137:8732` | 7260 | 1440×1024 |
| E7 · ” mobile | `1137:8753` | 8800 | 390×844 |
| E8 · Landing after confirmation | `1146:8678` | 9290 | 1440×1024 |

`x` is section-relative; frames sit at `y = 100`, notes at `y = 100 + height + 24`.

### Section `UpgradeModal (U)` — `1138:8678`, origin `0,5600`, 14000×1200

| Frame | Node | x |
| --- | --- | --- |
| U1 · Choose a Plan — Annual (default) | `1138:8679` | 100 |
| U2 · Choose a Plan — Monthly | `1141:8678` | 1640 |
| U3 · Choose a Plan — Lifetime | `1141:8815` | 3180 |
| U4 · Upgrade to Unlock — lesson gate | `1141:8952` | 4720 |
| U5 · Language picker open | `1142:8678` | 6260 |
| U6 · Checkout loading | `1142:8832` | 7800 |
| U7 · Checkout error | `1142:8971` | 9340 |
| U8 · Two-card layout | `1142:9110` | 10880 |
| U9 · Mobile (390×844) | `1143:8678` | 12420 |

Build notes worth keeping:

- U2–U9 are **clones of U1, patched by node name**. Rebuilding each from scratch is far more
  expensive, and every `use_figma` call is stateless so builder functions can't be reused.
- Figma auto-renames a TEXT layer to its own content unless `autoRename` is set `false`, so the
  feature-row text nodes are named after their copy. Patch them by `type === "TEXT"`, not by name.
- The desktop cards use `flex-1` (`layoutSizingVertical = "FILL"`). Stacking them for U9 collapses
  every `Features` frame to 1px until they're switched back to `HUG`.
- E8's underlying schedule page is a **flat grey schematic**, deliberately text-free so it can't be
  mistaken for a mapped screen. The schedule page has not been built in Figma.

---

## Open points to review after mapping

Parked deliberately. Nothing below is actioned in this pass.

### 1. The "Check your email" screen (D7/M7) is currently unreachable

`enable_confirmations = false` (`supabase/config.toml:210`) means `supabase.auth.signUp` returns
a session immediately, so `OnboardingModal.tsx:144` redirects to the schedule and the
`setSuccess(true)` on line 152 never fires. The hosted project's setting is unknown and needs
checking. If confirmations are off there too, the entire E-series describes a path no user takes
— and conversely, the moment they're switched on, D7/M7 becomes the most important screen in the
funnel.

### 2. `/login?error=` renders nothing

`auth/callback/route.ts:49,54` redirects failures to `/login?error=<description>`, but
`src/app/(auth)/login/page.tsx` never reads `searchParams`. Its `error` state (line 13) is only
ever set by a failed sign-in submit, so the banner at line 61 stays hidden. An expired or
already-used confirmation link drops the user on a blank login form with **no explanation at
all**. Fix is small: seed the existing `error` state from `useSearchParams`.

### 3. The only resend affordance is buried

`EmailVerificationReminder.tsx` has a working resend, but it waits 3 minutes *and* only renders
inside the dashboard — which an unconfirmed user can't reach if confirmations are on. The screen
that should own resend (D7/M7) has no button at all.

### 4. D7/M7 doesn't say what happens next

The original prompt for this work. Missing: sender name (nothing to search the inbox for),
arrival expectation, spam-folder hint, resend, and any recovery from a mistyped address. It's
also the only step in the flow with **no `ModalFooter`**, so on mobile there's no pinned action —
whatever we add would otherwise float mid-scroll.

Sketched fix, for discussion: add a `ModalFooter` carrying a `Resend email` outline button on a
60s cooldown (started on mount, restarted per send, keeping us inside Supabase's send interval),
a status line for sent/error, and a `Wrong email?` link. Caveat on that last one — an unconfirmed
account already exists by then, so a new address creates a second (the orphan expires) and the
same address hits the already-registered branch at line 133.

### 5. The confirmation email is unbranded

E1 documents GoTrue's stock template: no logo, no sender name, no styling, and the link text
reads `Confirm your mail`. It's the first thing a new user sees from us.

### 6. The paywall is the *least* persuasive of the three render sites

`UpgradeModal` renders from four call sites at three different levels of detail, because the
benefit strings carry `{courses}` / `{lessons}` / `{words}` tokens that only interpolate when live
counts are passed in:

| Render site | `languages` | `allLanguagesStats` | Result |
| --- | --- | --- | --- |
| `LessonsList.tsx:566` — locked-lesson paywall | ✗ | ✗ | **Fallback copy on both paid cards** |
| `DashboardContent.tsx:335` — post-signup / `View Plans` | ✓ | ✗ | Real language counts, fallback all-languages |
| `LanguagesUpgradeProvider.tsx:80` — dashboard picker | ✓ | ✓ | Full counts everywhere |

Compare U4 with U1: the paywall — hit at the exact moment someone is weighing whether to pay —
says *"All lessons for this language"*, while the browsing surface says *"5 courses · 447 lessons"*
and *"Learn ~3800 words"*. The concrete numbers are missing precisely where they'd do the most
work. The counts are already loaded on the schedule page, so this looks like an oversight rather
than a constraint.

### 7. `displaySuffix` is dead code in lifetime mode

Line 331 computes `displaySuffix = billingModel === "lifetime" ? "one-time" : "/month"`, but line
360 only renders the suffix `{billingModel !== "lifetime" && ...}`. The `"one-time"` branch can
never appear. Harmless as rendered — the `Yours forever` pill and `Pay once, access forever` carry
the meaning — but the two lines contradict each other and one of them should go.

Note the Free card is unaffected: `FreePlanCard` hardcodes `/month` at line 423 regardless of
billing model, so in lifetime mode the row reads `$0 /month` next to two cards with no suffix.

### 8. On mobile the footer takes 40% of the modal and the fold lands mid-card

U9, measured: modal `358×760`, top bar 60, **footer 308**, leaving **392px** of scroll viewport.
The header alone (lock circle, heading, subheading) plus the tabs consume roughly 240 of that, so
the first thing above the fold after them is the Free card *header* — features included, nothing
below `$0 /month` is visible without scrolling.

The footer is large because `gridCols` is an `sm:` class: below `sm` the CTA row falls back to
`grid-cols-1` and all three card-bottoms stack, each `px-5 py-4` around a 52px button. Stacked,
they also stop reading as card bottoms — U9 shows an amber-bordered CTA floating below a white
card, connected to nothing. The "one continuous card" idea only holds at `sm`+.

### 9. On mobile the `Monthly` tab can't be scrolled to

The billing tabs measure 415px against a 310px container. `Tabs` renders inside `ScrollFadeRow`
(`overflow-x-auto`), but `UpgradeModal` passes `className="justify-center"` — and a centred flex
row that overflows pushes content past the *start* edge, which is unreachable by scrolling since
`scrollLeft` can't go below 0. `Monthly` is clipped to `hly` with no way to reveal it.

The edge fades compound it: `canScrollLeft` is `scrollLeft > 1`, which is false on load, so the
left fade stays hidden and there's no affordance hinting anything is cut off. `ScrollFadeRow` also
defaults to `fadeClassName="from-white"`, which happens to be right here.
