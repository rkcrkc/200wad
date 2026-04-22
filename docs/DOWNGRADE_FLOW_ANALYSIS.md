# Subscription Downgrade Flow Analysis

## Subscription Tiers

| Tier | Scope | `target_id` | Downgrade Target |
|------|-------|-------------|------------------|
| `all-languages` | Every language, current and future | `null` | Free (first N lessons) |
| `language` | All courses in one language | `language.id` | Free (first N lessons) |
| `course` | Single course (disabled by default) | `course.id` | Free (first N lessons) |
| **Free** | First N lessons per course (default 10) | — | — |

**Billing models:** Monthly (recurring), Annual (recurring), Lifetime (one-time payment).

**Free tier threshold:** Configurable globally via `platform_config.default_free_lessons` (default 10) or per-course via `courses.free_lessons`.

---

## Subscription Status Model

### Database Schema

The `subscriptions` table stores: `id`, `user_id`, `type`, `target_id`, `status`, `plan`, `amount_cents`, `currency`, `stripe_customer_id`, `stripe_subscription_id`, `cancel_at_period_end`, `current_period_start`, `current_period_end`, `created_at`, `updated_at`.

### Status Values and Stripe Mapping

| App Status | Stripe Source Status | Access Granted? |
|------------|---------------------|-----------------|
| `active` | `active`, `past_due`, `incomplete`, `trialing` | Yes |
| `cancelled` | `canceled` | Only if `current_period_end > now` |
| `expired` | `incomplete_expired`, or from `customer.subscription.deleted` | No |
| `paused` | `paused` | No |
| `past_due` | Written by `invoice.payment_failed` handler | Transient — overwritten by subscription.updated |

### "isEffective" Logic

A subscription is considered effective (grants access) when:

```
status === "active"
OR (status === "cancelled" AND current_period_end > now)
```

This is computed in three places:
- **`queries/subscriptions.ts`** — `getUserSubscriptions()` maps to `isEffective` field
- **`utils/accessControl.ts`** — `canAccessLesson()` and `getLessonAccessMap()` check inline
- **`queries/subscriptions.ts`** — `hasActiveSubscription()` uses PostgREST `or` filter

---

## Downgrade Triggers

### 1. User-Initiated Cancellation (Stripe Portal)

**Flow:**
1. User clicks "Manage plan" → `createCustomerPortalSession()` → Stripe Billing Portal
2. User cancels in Stripe's UI
3. Stripe fires `customer.subscription.updated` with `cancel_at_period_end: true`
4. App updates: status stays `active`, `cancel_at_period_end` flag set
5. When billing period ends, Stripe fires `customer.subscription.deleted`
6. App updates: status set to `expired`, access revoked

**Files:** `mutations/subscriptions.ts`, `webhooks/stripe/route.ts`

### 2. Payment Failure

**Flow:**
1. Stripe payment attempt fails → fires `invoice.payment_failed`
2. App sets status to `past_due`, creates in-app notification
3. Stripe retries → fires `customer.subscription.updated` with status `past_due`
4. App maps to `active` (grace period)
5. If retries exhausted → status becomes `unpaid` → mapped to `cancelled`
6. Eventually `customer.subscription.deleted` → status `expired`

**Files:** `webhooks/stripe/route.ts` (handlers: `handleInvoicePaymentFailed`, `handleSubscriptionUpdated`, `handleSubscriptionDeleted`)

### 3. Subscription Period Expiry

When a recurring subscription's period ends without renewal, Stripe fires `customer.subscription.deleted`. The webhook handler sets status to `expired`.

### 4. Lifetime Plans — No Downgrade Path

Lifetime plans use Stripe's `payment` mode (one-time). They have no `stripe_subscription_id`, so no subscription webhook events affect them. Once created with status `active`, they remain active indefinitely. There is no mechanism to expire or revoke a lifetime subscription except direct database intervention.

---

## What Happens on Downgrade

### Data Preservation

**No user data is deleted.** The system follows a "gate, don't delete" approach:
- All `user_word_progress`, `user_lesson_progress`, `study_sessions`, `user_test_scores`, and `test_questions` records remain intact
- The user's enrollment (`user_languages`) remains
- Their `current_language_id` and course preferences remain

### What Gets Locked

Lessons beyond the free threshold become inaccessible:

| Location | Behavior | File |
|----------|----------|------|
| Lesson list | `isLocked` flag, lock icon, 60% opacity | `LessonRow.tsx` |
| Lesson page | Server redirect to course page | `lesson/[lessonId]/page.tsx` |
| Study mode | Server redirect to course page | `lesson/[lessonId]/study/page.tsx` |
| Test mode | Server redirect to course page | `lesson/[lessonId]/test/page.tsx` |

### What Remains Accessible

- First N lessons (free tier) remain fully accessible
- All previously saved progress/scores are visible
- Dashboard, courses list, schedule, dictionary continue to work
- Previously studied words in free lessons keep their status

---

## UI Flows

### Locked Lesson Row
When `lesson.isLocked`: row at 60% opacity, lock icon replaces action buttons, "Locked" status pill, click opens UpgradeModal.

### UpgradeModal (Primary Paywall)
Shows pricing for Free, Language, All Languages tiers. Triggered from locked lesson click or "View Plans" in sidebar/mobile.

### LockedLessonToast
Server redirect from locked content includes `?locked=<title>` param. Toast shows: `"[title]" requires a subscription.`

### Sidebar/Mobile "Unlock All Lessons" Card
Conditionally hidden when user has effective subscription via `SubscriptionContext`. When subscription is cancelling but still effective, shows "Access ends [date]" warning.

### Subscription Management Page
Active subscriptions show plan badge + "Active" badge + "Manage plan" button. Cancelling subscriptions show "Cancels [date]" warning badge. After expiry, reverts to "Free plan" + "Upgrade plan" button.

---

## Downgrade Lifecycle Diagram

```
ACTIVE SUBSCRIPTION
       |
       |── User cancels via Stripe Portal
       |   |
       |   v
       |  customer.subscription.updated (cancel_at_period_end = true)
       |   |  → status stays "active", cancel_at_period_end = true
       |   |  → UI: "Cancels [date]" badge shown
       |   |
       |   v (billing period ends)
       |  customer.subscription.deleted
       |   |  → status = "expired"
       |   |  → UI: lessons re-lock, upgrade prompts reappear
       |
       |── Payment fails
       |   |
       |   v
       |  invoice.payment_failed
       |   |  → status = "past_due", notification created
       |   |
       |   v
       |  customer.subscription.updated (status: past_due)
       |   |  → mapped to "active" (grace period)
       |   |
       |   v (retries exhausted)
       |  customer.subscription.updated (status: unpaid)
       |   |  → mapped to "cancelled"
       |   |  → still effective if current_period_end > now
       |   |
       |   v (period ends)
       |  customer.subscription.deleted
       |      → status = "expired", access revoked
       |
       |── Lifetime plans
            → NEVER expire, no downgrade mechanism
```

---

## Access Control Architecture

### Server-Side (Authoritative)

Access is checked at request time with fresh DB queries — no cached state:

- **`canAccessLesson()`** — Single lesson check, used by lesson/study/test pages
- **`getLessonAccessMap()`** — Batch check for lesson lists, one DB query
- **`hasActiveSubscription()`** — Boolean check, used by courses page for promo visibility

All three correctly handle the cancelled-but-in-period grace window.

### Client-Side (UI Hints)

`SubscriptionContext` provides `hasLanguageAccess()` and `hasAllLanguagesAccess` for UI elements (sidebar card, mobile menu, lock icons). Populated at layout render time from server data.

**Limitation:** Context is not refreshed in real-time. If a subscription expires mid-session, client UI won't update until next full page load. Server-side redirects catch actual access attempts.

---

## Resolved Issues

| Issue | Resolution |
|-------|-----------|
| `hasActiveSubscription()` didn't check `current_period_end` | Fixed: uses PostgREST `or` filter for cancelled subs |
| `cancel_at_period_end` not surfaced in UI | Fixed: "Cancels [date]" badge in subscription management |
| `SimpleSubscription` lacked cancellation data | Fixed: extended with `cancelAtPeriodEnd` and `currentPeriodEnd` |
| Subscription status column untyped | Fixed: CHECK constraint added via migration |
| No `invoice.payment_failed` handler | Already existed (was incorrectly flagged) |

## Known Limitations

| Limitation | Severity | Notes |
|-----------|----------|-------|
| Lifetime plans cannot be revoked | Low | Requires direct DB intervention; no admin UI |
| Client context stale on mid-session expiry | Low | Server-side access control catches on navigation |
| Overlapping subscriptions not surfaced | Low | User could hold redundant subs; access control handles correctly |
