# Upgrade Touchpoints & Flows — UX Analysis

> **Reconciled against the code.** An earlier revision of this document described a
> cart-based checkout, a `bg-gray-*` modal, and a 7-step funnel — none of which still
> exist. Every claim below was re-verified against the current source. Items that were
> fixed are recorded in [Resolved since the last revision](#resolved-since-the-last-revision)
> rather than deleted, so the history stays legible.
>
> Companion docs: [`POST_SIGNUP_AND_UPGRADE_PLAN.md`](./POST_SIGNUP_AND_UPGRADE_PLAN.md)
> (the Figma mapping of these screens, plus open points 1–9) and
> [`ONBOARDING_FIGMA_PLAN.md`](./ONBOARDING_FIGMA_PLAN.md).

## Overview

Freemium model: the first N lessons of each course are free (`platform_config.default_free_lessons`,
currently **10**, overridable per course), with paid tiers unlocking the rest.

Active tiers (`enabled_tiers = ["language", "all-languages"]` — the `course` tier exists in
`pricing_plans` but is inactive):

| Tier | Monthly | Annual | Lifetime |
| --- | --- | --- | --- |
| Language | $15 | $120 (shown as $10/mo, "Save $60/year") | $199 |
| All Languages | $20 | $180 (shown as $15/mo, "Save $60/year") | $299 |

---

## Touchpoint Map

### 1. Lesson row lock — `src/components/LessonRow.tsx`

Locked rows render at 60% opacity with a Lock icon in place of the Study/Test buttons and a
"Locked" status pill. Clicking opens the UpgradeModal with `lessonTitle` context.

**Verdict:** good. Clear visual distinction, discoverable, contextual.

---

### 2. UpgradeModal — the primary paywall — `src/components/UpgradeModal.tsx`

Opened from a locked lesson row, from "View Plans" in the sidebar / mobile menu, from the
`?upgrade-lesson=` redirect (see §7), and automatically on first dashboard load after signup
(see §11).

**Structure**

- Lock circle → `h2` → subheading
- Billing tabs: Monthly / Annual / Lifetime, with `save $` on Annual and `best value` on
  Lifetime (uppercase 10px green pills; `bg-white` when the tab is active, `bg-green-200`
  when not — lines 587–604)
- Up to 3 cards: Free, `{Language} only`, All Languages. The language card carries an amber
  **Most popular** badge (line 636)
- Footer with the CTA row; on error, a `text-destructive` line above it

**Copy** (lines 569–575) is contextual:

| Entry | Heading | Subheading |
| --- | --- | --- |
| Locked lesson | Upgrade to Unlock | `Upgrade your plan to study '{lessonTitle}'` |
| No lesson context | Choose a Plan | Subscribe to unlock all lessons. |

**Checkout** — `handleCheckout` (lines 489–508) calls `createDirectCheckout` and assigns
`window.location.href = result.url`, i.e. straight to Stripe. No cart, no intermediate page.
`originLessonId` is threaded into Stripe metadata as `origin_lesson_id` (`checkout.ts:143`)
so the success page can send the user back to the lesson that triggered the flow.

**Open issues** (tracked as points 6–9 in `POST_SIGNUP_AND_UPGRADE_PLAN.md`):

- **The paywall is the least persuasive of the three call sites.** The modal falls back to
  generic feature copy when it isn't given live counts, and the render sites are inconsistent:

  | Call site | `languages` | `allLanguagesStats` | Result |
  | --- | --- | --- | --- |
  | `LessonsList.tsx:566` (the paywall) | ✗ | ✗ | fallback copy |
  | `DashboardContent.tsx:335` (post-signup) | ✓ | ✗ | partial |
  | `LanguagesUpgradeProvider.tsx:80` (browsing) | ✓ | ✓ | full counts |

  So the paywall — the highest-intent moment — says "All lessons for this language" where the
  low-intent browsing surface says "5 courses · 447 lessons".
- **`displaySuffix` is dead code in lifetime mode.** Line 331 computes `"one-time"`; line 360
  suppresses the whole span when `billingModel === "lifetime"`. Meanwhile `FreePlanCard`
  hardcodes `/month` (line 421), so lifetime renders `$0 /month` next to two suffix-less cards.
- **Mobile footer eats 40% of the modal.** Measured at 390×844: modal 358×760, top bar 60,
  footer 308, leaving a 392px scroll viewport. `gridCols` is an `sm:` class, so all three CTAs
  stack and stop reading as card bottoms.
- **The Monthly tab is unreachable on mobile.** The tab strip is 415px inside a 310px container.
  `justify-center` pushes the overflow past the *start* edge, which `scrollLeft` can't reach
  (it can't go below 0), and `ScrollFadeRow`'s left fade is hidden on load
  (`canScrollLeft = scrollLeft > 1`), so there's no affordance either.

---

### 3 & 4. Sidebar and mobile menu "Unlock All Lessons" cards

`src/components/Sidebar.tsx:260` and `src/components/MobileMenu.tsx:300`.

Warning-coloured Lock icon, "Unlock All Lessons", copy
`First {freeLessons} lessons free. Subscribe for full access.`, and a "View Plans" button that
opens the UpgradeModal. Both are gated by
`!hasAllLanguagesAccess && !(languageId && hasLanguageAccess(languageId))`, and both swap to an
"Access Ending" card while a subscription is cancelling.

**Note:** the two cards are duplicated markup. That's two instances, below CLAUDE.md's
rule-of-three threshold, so it isn't yet an extraction — but a third copy would make it one.

---

### 5. UnlockBundlePromo banner — `src/components/UnlockBundlePromo.tsx`

Gradient banner on `/courses/[languageId]`: "Unlock all {Language} courses", a
subscription-vs-lifetime price toggle, and a "View Bundle Plans" CTA.

Prices and the savings figure are now computed from `pricing_plans` (lines 33–44); the old
$10.75 / $120 literals survive only as fallbacks (lines 102, 109). Gated by `!hasAccess` at
`courses/[languageId]/page.tsx:68`.

---

### 6. Courses page subheader

`src/app/(dashboard)/courses/[languageId]/page.tsx` — "First N lessons free in every course",
with N from `getDefaultFreeLessons()` (page line 29, copy line 62).

---

### 7. Server-side redirects — lesson / study / test pages

`canAccessLesson()` runs server-side on all three routes. A locked lesson now redirects to
`/course/${course.id}?upgrade-lesson=${lesson.id}`, and `LessonsList.tsx:105–122` picks the
param up and auto-opens the UpgradeModal on the matching lesson.

**Caveat:** that lands the user in the *fallback-copy* modal (see §2), so the deep-link path
delivers the weakest version of the pitch.

---

### 8. Subscription management page

`src/app/(dashboard)/account/subscriptions/page.tsx` + `SubscriptionsPageClient.tsx`,
`SubscriptionsPageHeader.tsx`, `LanguageSubscriptionsList.tsx`, `LanguageSubscriptionRow.tsx`,
`ExpandableCourseList.tsx`, `CheckoutFooterBar.tsx`, `SwitchLanguageModal.tsx`, `ActionMenu.tsx`.

Billing toggle, a single unified language list (the old "My Languages" / "Other Languages"
split is gone), per-language rows with flag, counts, status badge and an `ActionMenu`,
expandable course details, and a sticky `CheckoutFooterBar` when the cart has contents.

The page is now a *management* surface with an optional single-target cart, not the primary
conversion path — the modal goes straight to Stripe.

**Open issue:** `AllLanguagesCallout` is rendered behind
`const showCallout = false && showUpgradeCta;` (`SubscriptionsPageClient.tsx:79`). The comment
says "Temporarily hidden. Flip to `showUpgradeCta` to restore." Lint won't flag this, so it will
sit here indefinitely — either restore it or delete it.

---

### 9. Checkout success / cancel pages

**Success:** green checkmark, "Subscription Confirmed". When `origin_lesson_id` is present in
the Stripe session (read back via `getCheckoutSessionOrigin(session_id)`), the primary CTA is
**"Continue to {Lesson Title}"** rather than a link back to the subscriptions page.

**Cancel:** grey X, "Checkout Cancelled", "Your checkout was cancelled. No charges were made."

---

### 10. Stripe customer portal

`createCustomerPortalSession` in `src/lib/mutations/subscriptions.ts`, invoked from
`SubscriptionsPageHeader.tsx` / `SubscriptionHeader.tsx` (it used to live in
`ManageBillingButton.tsx`, now deleted). Standard hosted portal — no custom UI warranted.

---

### 11. Onboarding flow

`src/components/auth/OnboardingModal.tsx` → verification → course schedule.

The success screen (lines 143–175) now carries the free-tier framing:
"🎓 What's included free: First {freeLessons} lessons in {language}", "✨ Upgrade anytime for
full access to all lessons", and a **View Plans** link. Signup also sets `just_signed_up` in
localStorage, which `DashboardContent.tsx:132–145` consumes once to auto-open the UpgradeModal
on first dashboard load.

**Still missing** (both were P2 in the previous revision and remain unbuilt):

- No free-tier line on the language-selection step. A user picking a language with 5 courses
  has no signal about what's included until after signup.
- No first-session welcome banner on the schedule page.

---

## Open problems

### 1. The paywall gives the weakest pitch

Detailed in §2. The fix is prop threading, not new UI: pass `languages` and `allLanguagesStats`
into the `LessonsList` render site so the highest-intent surface stops falling back to generic
copy. Cross-referenced as open point 6 in `POST_SIGNUP_AND_UPGRADE_PLAN.md`.

### 2. Two pricing UIs still look unrelated

The modal shows side-by-side plan cards; the subscriptions page shows language-centric rows
with a cart. This matters less than it did — the modal no longer routes into the page — but a
user who upgrades from the modal and later opens the management page still has to re-map
everything. Worth unifying the visual language even though the funnel problem is gone.

### 3. Lifetime pricing renders inconsistently

Detailed in §2. `$199` with no suffix beside `$0 /month`.

### 4. Mobile modal layout

Detailed in §2 — footer proportion and the unreachable Monthly tab.

### 5. Dashboard language cards carry no premium indicator

Unbuilt. A subtle "X of Y lessons free" badge on each card would give returning users ongoing
awareness. P3.

### 6. Credits page runs on dummy data

`src/components/credits/CreditsHistoryClient.tsx:13–41` is a hardcoded `DUMMY_TRANSACTIONS`
array (referral bonuses, a sign-up bonus, a subscription payment), rendered by
`src/app/(dashboard)/account/credits/page.tsx`. There is no credits table behind it. Either
build it or remove the page — a live-looking history of fabricated transactions is worse than
no page.

---

## Resolved since the last revision

| Was | Now |
| --- | --- |
| **P0** 7-step funnel; "Subscribe" redirects to `/account/subscriptions` | `createDirectCheckout` → Stripe. CTA reads "Upgrade plan". |
| **P0** Upgrade CTAs shown to subscribers | `SubscriptionContext` gates the sidebar card, mobile menu card and bundle promo. |
| **P1** Hardcoded prices in `UnlockBundlePromo` ($10.75 / $120 / "Save up to 40%") | Computed from `pricing_plans`; literals are fallbacks only. |
| **P1** Hardcoded "20 lessons" in sidebar / mobile menu | `First {freeLessons} lessons free. Subscribe for full access.` |
| **P1** Hardcoded "10" in the courses subheader | `getDefaultFreeLessons()` from `platform_config`. |
| **P1** Silent redirect on locked content | `?upgrade-lesson=` param auto-opens the modal on the right lesson. |
| **P1** Success page links back to subscriptions | `origin_lesson_id` metadata → "Continue to {Lesson Title}". |
| **P1** No upgrade messaging in onboarding | Free-tier breakdown + "View Plans" on the success screen; `just_signed_up` auto-opens the modal. |
| **P2** `bg-gray-50` / `bg-gray-100` in the modal | `bg-white` + `bg-bone` header; tabs use `bg-beige`. |
| **P2** No most-popular emphasis | Amber **Most popular** badge on the language card. |
| **P2** `ConfirmSubscriptionDialog` / `PricingOverviewCards` dead code | Both deleted. |
| **P2** No `invoice.payment_failed` webhook handler | Exists — `route.ts:69`, handler at 336–357; sets `past_due` and notifies. |
| **P2** No client-side subscription state | `SubscriptionContext` exposes `hasLanguageAccess`, `hasAllLanguagesAccess`, `accessEndDate`. |

Two documented claims were simply **wrong**, not stale, and are corrected above: the modal's
Annual tab carries `save $` (not "Best value" — that's on Lifetime), and the modal's contextual
copy is `Upgrade your plan to study '{lesson}'` (not `"[lesson]" requires a subscription to
access.`).

---

## Priority summary

| Priority | Issue | Direction |
| --- | --- | --- |
| **P1** | Paywall falls back to generic copy | Thread `languages` + `allLanguagesStats` into `LessonsList`'s modal |
| **P1** | Mobile modal: footer proportion, unreachable Monthly tab | Rework footer layout; fix the tab-strip overflow |
| **P2** | Lifetime price suffix inconsistency | Remove the dead `displaySuffix` branch; make the Free card's suffix follow `billingModel` |
| **P2** | Two disconnected pricing UIs | Unify the visual language of modal and subscriptions page |
| **P2** | `showCallout = false` dead render | Restore `AllLanguagesCallout` or delete it |
| **P2** | Dummy credits data | Build it or remove the page |
| **P3** | No free-tier line on language selection | One line under the language list |
| **P3** | No first-session welcome banner | Dismissible, first visit only |
| **P3** | No dashboard language-card badges | "X of Y lessons free" |

**Guiding principle, unchanged:** transparent framing over aggressive upselling. Users who
understand the model upfront convert better and churn less than users who feel tricked by a
hidden paywall.
