# Upgrade Touchpoints & Flows — UX Analysis

## Overview

The app uses a freemium model: first N lessons per course are free (default 10, configurable per course via admin), with paid tiers (Language, All Languages) unlocking the rest. This document maps every upgrade touchpoint, evaluates the user experience, and identifies issues.

---

## Touchpoint Map

### 1. Lesson Row Lock (Lessons List)

**File:** `src/components/LessonRow.tsx`
**Trigger:** Viewing lessons beyond the free threshold
**What the user sees:** Locked lessons display at 60% opacity with a Lock icon replacing the Study/Test action buttons. A "Locked" status pill appears.
**On click:** Opens the UpgradeModal with context about which lesson was clicked.
**Verdict:** Good — clear visual distinction, discoverable interaction, contextual messaging.

---

### 2. Upgrade Modal (Primary Paywall)

**File:** `src/components/UpgradeModal.tsx`
**Trigger:** Clicking a locked lesson row, or clicking "View Plans" in sidebar/mobile menu
**What the user sees:**
- Lock icon in a circular white container on beige background
- Heading: "Upgrade to Unlock"
- Contextual message: `"[lesson title]" requires a subscription to access.`
- Billing toggle (Monthly / Annual / Lifetime) with "Best value" badge on Annual
- Up to 3 pricing cards (Free, Language, All Languages) with feature lists
- Annual savings percentage shown dynamically
- Fixed footer with CTAs: "Current Plan" (disabled) for Free, "Subscribe" buttons for paid tiers

**On click ("Subscribe"):** Navigates to `/account/subscriptions`

**Issues:**
- Both "Subscribe" buttons just **redirect** to the subscriptions page — the user has to start over on a completely different page, re-find the plan, and add it to a cart. This breaks the conversion flow and feels like going backwards.
- Free plan card uses `bg-gray-50` instead of `bg-bone` — inconsistent with design system.
- Billing toggle uses `bg-gray-100` instead of `bg-bone` — same issue.
- No "most popular" or recommended visual emphasis on a specific plan.

---

### 3. Sidebar "Unlock All Lessons" Card

**File:** `src/components/Sidebar.tsx` (lines 148–166)
**Trigger:** Always visible in sidebar on course-level pages
**What the user sees:**
- Lock icon (orange/warning color) + "Unlock All Lessons" heading
- Copy: "First 10 lessons free. Subscribe for all 20 lessons."
- Orange "View Plans" button

**On click:** Opens the UpgradeModal

**Issues:**
- **Hardcoded "20 lessons"** — does not dynamically reflect the actual lesson count for the current course.
- **Always shows regardless of subscription status** — a paying subscriber still sees "Unlock All Lessons", which is confusing and erodes trust in the purchase.

---

### 4. Mobile Menu "Unlock All Lessons" Card

**File:** `src/components/MobileMenu.tsx` (lines 182–202)
**Trigger:** Opening the mobile navigation drawer on course-level pages
**What the user sees:** Identical to the sidebar card.
**On click:** Closes menu, then opens the UpgradeModal.

**Issues:** Same as sidebar — hardcoded lesson count, shows to subscribers.

---

### 5. UnlockBundlePromo Banner (Courses Page)

**File:** `src/components/UnlockBundlePromo.tsx`
**Trigger:** Viewing the courses listing for a language (`/courses/[languageId]`)
**What the user sees:**
- Blue-to-purple gradient banner
- Sparkles icon + "Complete Bundle" label
- Heading: "Unlock all [Language] courses"
- Copy: "Get access to all [X] courses with [Y] words total. Save up to 40% compared to buying individually."
- Pricing toggle: Subscription ($10.75/month) vs Lifetime ($120 one-time)
- "View Bundle Plans" CTA button

**On click:** Links to `/account/subscriptions`

**Issues:**
- **Prices are hardcoded** ($10.75/mo and $120 one-time) — not pulled from `pricing_plans` table. If admin changes prices, this banner shows stale values.
- **"Save up to 40%"** is hardcoded — not calculated from actual pricing data.
- **Shows even with an active subscription** — subscriber sees a promo to buy what they already have.

---

### 6. Courses Page Subheader

**File:** `src/app/(dashboard)/courses/[languageId]/page.tsx` (line 52)
**What the user sees:** Below the language header: "First 10 lessons free in every course"

**Issues:**
- Hardcoded "10" — should read from `platform_config` (`default_free_lessons`) or the per-course `free_lessons` value.

---

### 7. Server-Side Redirects (Lesson/Study/Test Pages)

**Files:**
- `src/app/(dashboard)/lesson/[lessonId]/page.tsx`
- `src/app/(dashboard)/lesson/[lessonId]/study/page.tsx`
- `src/app/(dashboard)/lesson/[lessonId]/test/page.tsx`

**Trigger:** Direct URL access to a locked lesson (e.g., shared link, bookmark)
**What happens:** `canAccessLesson()` is called server-side. If locked, the user is silently redirected to the course page.

**Issues:**
- **No user feedback** — the user sees no explanation for why they were redirected. Should show a toast or flash message: "This lesson requires a subscription."

---

### 8. Subscription Management Page

**Files:**
- `src/app/(dashboard)/account/subscriptions/page.tsx`
- `src/components/subscriptions/SubscriptionsPageClient.tsx`
- `src/components/subscriptions/AllLanguagesCallout.tsx`
- `src/components/subscriptions/LanguageSubscriptionsList.tsx`
- `src/components/subscriptions/LanguageSubscriptionRow.tsx`
- `src/components/subscriptions/ExpandableCourseList.tsx`
- `src/components/subscriptions/StickyCartBar.tsx`

**Trigger:** Navigating to `/account/subscriptions` (from UpgradeModal, bundle promo, or sidebar nav)
**What the user sees:**
- Billing toggle tabs (Monthly / Annual / Lifetime)
- All Languages callout banner at top (amber, with "Add to Cart" button)
- "My Languages" section — enrolled languages with plan status and actions
- "Other Languages" section — available languages
- Each row: language flag + name, course/word count, status badge, action buttons
- Expandable course details per language
- Sticky cart bar at bottom when items are in cart (item badges, total, checkout button)
- Upsell banner when 2+ languages in cart suggesting All Languages tier

**Checkout flow:** Add to cart → Review in sticky bar → "Proceed to Checkout" → Stripe Checkout → Success/Cancel page

**Issues:**
- **Cart model adds friction** — language learning apps typically use simple "pick a plan, subscribe" flows. The cart paradigm feels like e-commerce shopping rather than subscribing.
- **Mixing billing models blocked** (lifetime + recurring) but the error only shows at checkout attempt — should prevent adding incompatible items upfront.
- **No visual connection** between the UpgradeModal plans and this page — they look and feel like completely different UIs despite serving the same purpose.

---

### 9. Checkout Success/Cancel Pages

**Files:**
- `src/app/(dashboard)/account/subscriptions/success/page.tsx`
- `src/app/(dashboard)/account/subscriptions/cancel/page.tsx`

**Success:** Green checkmark, "Subscription Confirmed", "Your subscription is now active. You have full access to all your subscribed content.", link back to subscriptions page.

**Cancel:** Gray X icon, "Checkout Cancelled", "Your checkout was cancelled. No charges were made.", link back to subscriptions page.

**Issues:**
- Success page links back to subscriptions page rather than to the content the user wanted to access (e.g., the locked lesson that started the flow). This misses an opportunity to immediately deliver value.

---

### 10. Stripe Customer Portal (Manage Existing Subscription)

**File:** `src/lib/mutations/subscriptions.ts` (`createCustomerPortalSession`)
**Trigger:** "Manage plan" button on an active subscription row
**What happens:** Opens Stripe's hosted billing portal for cancellation, payment method updates, etc.
**Verdict:** Standard and appropriate — no custom UI needed here.

---

## Critical UX Problems

### Problem 1: Broken Conversion Funnel (7 Steps to Convert)

The current upgrade path from discovering locked content to paying:

```
Locked Lesson → UpgradeModal → "Subscribe" button → /account/subscriptions →
Find plan again → Add to cart → Proceed to Checkout → Stripe Checkout
```

That's **7 steps** to convert. Industry best practice is 2–3 steps. The UpgradeModal creates an expectation that clicking "Subscribe" will make progress toward subscribing, but instead it dumps the user onto a separate page where they have to start over.

**Recommendation:** The UpgradeModal should either:
- Create a Stripe Checkout session directly for the selected plan (skip the cart entirely), or
- Have its own inline checkout that doesn't require navigating away

---

### Problem 2: Subscription-Unaware CTAs

The sidebar card, mobile menu card, and bundle promo banner all show to paying subscribers. This creates a poor post-purchase experience:
- Paying users feel like the app doesn't recognize their purchase
- Upgrade prompts after purchase erode trust and feel spammy
- Users may worry their subscription isn't active

**Recommendation:** Add subscription status to `UserContext` so the client can adapt in real-time. Hide upgrade prompts when the user has active coverage for the relevant content. Optionally replace them with positive reinforcement (e.g., "All lessons unlocked" with a checkmark).

---

### Problem 3: Hardcoded Values Create Stale UI

At least 4 places have hardcoded prices, lesson counts, or savings percentages:

| Location | Hardcoded Value | Should Be |
|----------|----------------|-----------|
| Sidebar card | "20 lessons" | Actual lesson count for current course |
| Mobile menu card | "20 lessons" | Actual lesson count for current course |
| UnlockBundlePromo | $10.75/mo, $120 lifetime | From `pricing_plans` table |
| UnlockBundlePromo | "Save up to 40%" | Calculated from actual pricing |
| Courses subheader | "10 lessons free" | From `platform_config` or course `free_lessons` |

**Recommendation:** Replace all hardcoded values with dynamic data from the database or config.

---

### Problem 4: Silent Redirects on Locked Content

Direct URL access to locked content (lesson, study, test pages) produces a redirect with zero user feedback. The user lands on the course page with no explanation of what happened.

**Recommendation:** Use a query parameter (e.g., `?locked=true`) on the redirect URL, then show a toast notification: "This lesson requires a subscription. Upgrade to unlock it."

---

### Problem 5: Two Disconnected Pricing UIs

The UpgradeModal and the Subscriptions page present pricing in completely different layouts and interaction models:
- Modal: side-by-side plan cards with feature lists
- Subscriptions page: language-centric rows with cart-based checkout

Users who see plans in the modal then land on the subscriptions page have to mentally re-map everything. There's no visual or structural continuity.

**Recommendation:** Either unify the visual language across both, or have the UpgradeModal handle the entire checkout flow end-to-end so users never see two different pricing UIs.

---

### Problem 6: Success Page Doesn't Deliver Value

After completing checkout, the success page links back to the subscriptions management page — not to the content the user wanted. The whole reason they subscribed was to access a specific lesson.

**Recommendation:** Pass the originating lesson/course context through the checkout flow (via Stripe metadata or session storage) and redirect the user to the content they were trying to access.

---

## Minor Issues

| Issue | Location | Notes |
|-------|----------|-------|
| `bg-gray-50` / `bg-gray-100` used instead of `bg-bone` | UpgradeModal | Design system inconsistency |
| `ConfirmSubscriptionDialog` is unused | `src/components/subscriptions/` | Dead code — remove or integrate |
| `PricingOverviewCards` is unused | `src/components/subscriptions/` | Dead code — remove or integrate |
| Credits history uses dummy data | `CreditsHistoryClient.tsx` | Either implement or remove the page |
| No `invoice.payment_failed` webhook handler | `src/app/api/webhooks/stripe/route.ts` | Users with failed payments get no in-app notification |
| No client-side subscription state | `UserContext.tsx` | Every subscription check requires server round-trip |

---

## Recommendations Summary (Priority Order)

| Priority | Issue | Recommendation |
|----------|-------|----------------|
| **P0** | 7-step conversion funnel | UpgradeModal creates Stripe checkout directly — skip cart page |
| **P0** | CTAs show to subscribers | Add subscription state to UserContext; hide/adapt upgrade prompts |
| **P1** | Hardcoded values | Pull lesson counts, prices, and savings from DB/config dynamically |
| **P1** | Silent redirects | Add toast notification explaining why user was redirected |
| **P1** | Disconnected pricing UIs | Unify visual language or have modal handle checkout end-to-end |
| **P1** | Success page misses the moment | Redirect to the content user wanted, not subscriptions page |
| **P2** | Design system inconsistencies | Replace `bg-gray-*` with `bg-bone` in UpgradeModal |
| **P2** | Dead components | Remove `ConfirmSubscriptionDialog` and `PricingOverviewCards` |
| **P2** | Missing webhook handler | Implement `invoice.payment_failed` handling |
| **P2** | Dummy credits data | Implement real credits history or remove page |
| **P2** | No client-side subscription state | Add to UserContext for real-time UI adaptation |
