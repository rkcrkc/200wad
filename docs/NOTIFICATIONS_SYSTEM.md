# Notifications System Review

_Last reviewed: 2026-04-23_

## Current State: Foundation Only

The notifications system is scaffolded in the database but is **not functional end-to-end** in the app. This doc captures the current state, known bugs, intended purpose, and a brainstorm of future use cases.

---

## Schema

Table: `notifications`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, auto |
| `user_id` | `uuid` | FK → `users.id`, `ON DELETE CASCADE` |
| `type` | `text` | `CHECK` constraint: `'lesson_reminder' \| 'system'` |
| `title` | `text` | required |
| `message` | `text` | required |
| `data` | `jsonb` | nullable — for deep-link / context payload |
| `is_read` | `boolean` | default `false` |
| `created_at` | `timestamptz` | default `now()` |

**RLS:**
- `SELECT` — users can read their own only
- `UPDATE` — users can update their own only (e.g. mark as read)
- No `INSERT` policy for users — inserts must come from service role / server
- No `DELETE` policy — relies on user cascade delete, or account-reset wipe in `/api/account/reset`

**Generated type:** `Notification` in `src/types/database.ts`.

---

## What Actually Works Today

- **UI:** A static `<Bell>` icon in `src/components/Header.tsx:291` with a hard-coded red dot badge. No click handler, no dropdown, no fetch from DB.
- **Inserts:** Exactly **one** insertion site — `src/app/api/webhooks/stripe/route.ts:233` on Stripe `invoice.payment_failed`.
- **Queries / mutations:** None. Nothing in `src/lib/queries/` or `src/lib/mutations/`.
- **Admin CMS:** None.
- **Preferences:** None.

---

## Known Bugs & Gaps

1. **`type` constraint violation** — the Stripe webhook inserts `type: 'payment_failed'` but the schema `CHECK` only allows `'lesson_reminder' | 'system'`. This insert is failing silently in prod.
2. **No query/mutation helpers** — nothing to fetch, mark read, or dismiss.
3. **Bell badge is hard-coded** — always shows the red dot regardless of unread state.
4. **No admin CMS** — no way to broadcast system messages.
5. **No preferences** — no opt-in/opt-out, no per-channel control.
6. **No delete / dismiss policy** — users can only mark read.
7. **No expiry mechanism** — stale reminders stay forever.

---

## Intended Purpose

The `data` JSONB field plus the flexible `type` column suggests this was designed as a **generic user-addressable inbox** — any server-side event drops a row, the client renders it based on `type`, and `data` carries deep-link context (lesson ID, word ID, URL, etc.).

Two categories originally envisioned:
- `lesson_reminder` — study / streak / test nudges
- `system` — account, billing, platform announcements

---

## Use Cases

### Already likely considered
- Payment failed / subscription renewal / card expiring
- Streak in danger / streak broken
- Daily lesson reminder
- Test due / spaced-repetition review ready
- Achievement / milestone unlocked

### Learning & progress (data-driven)
- **Mastery regression alert** — "5 words you'd mastered are slipping — review them" (driven by `correct_streak` drops or review-interval staleness)
- **Weekly learning recap** — "You learned 23 new words and mastered 8 this week" with a shareable summary link
- **Personal best** — "New record: 47 words mastered in a week"
- **Lesson completion nudges** — "You're 2 words away from finishing Lesson 7"
- **First-time events** — first perfect test, first 100 words, first mastered word per gender / category

### Content-driven
- **New lesson published** on a course the user is enrolled in
- **Content corrections** — "We updated the audio / example for _parlare_ — replay it here" (deep-link via `data.word_id`)
- **New language / course available** for users who expressed interest
- **Tutorial / feature announcements** — "New: audio playback speed control"

### Behavioral / retention
- **Win-back** — "It's been 5 days — your streak is frozen, come back for one word"
- **Cohort comparison** (opt-in) — "You're in the top 10% of Italian learners this week"
- **Study-time anomaly** — "You usually study mornings — want a gentle reminder at 9am?"
- **Optimal review window** — triggered from SRS, "3 words are at their peak review moment"

### Account / admin / ops
- **Security events** — new device login, password change, email change confirmation
- **Data export ready** (if/when you add GDPR export)
- **Account deletion grace period** reminder
- **Plan change confirmations** — upgrade / downgrade summary
- **Refund issued / invoice available**
- **Admin broadcast** — scheduled maintenance, ToS / privacy updates, outage post-mortems
- **Beta feature invites** — targeted to specific users

### Social / community (if social layer is added)
- Friend joined the app, friend passed your word count, friend sent encouragement
- Shared lesson or study list received
- Study-partner activity

### Meta / support
- **Survey / NPS prompts** triggered at behavioral milestones (e.g. after 30 days active)
- **Bug-report follow-up** — "We fixed the issue you reported"
- **Feature-request upvote results** — "The feature you upvoted just shipped"

---

## Clever Uses of the `data` JSONB

- `cta: { label, href }` — admin CMS can create arbitrary deep-links without schema changes
- `dismissed_at` separate from `is_read` — distinguish "seen" vs "actioned"
- `expires_at` — auto-hide stale reminders client-side
- `group_key` — collapse bursts like "12 words reviewed today" into a single notification
- `severity: 'info' | 'warning' | 'critical'` — drive icon / color in the UI
- `subtype` — more granular categorization under a broad `type` (e.g. `type: 'system'`, `data.subtype: 'payment_failed'`)

---

## Recommended Next Steps (when we ship this)

1. **Fix the Stripe bug** — either expand the `type` `CHECK` constraint (add `'billing'`) or change the webhook to use `'system'` with `data.subtype: 'payment_failed'`.
2. **Formalize `type` as an enum** — so the UI can render icons / colors consistently: `system`, `billing`, `learning`, `reminder`, `achievement`, `content`, `admin`.
3. **Build query + mutation helpers:**
   - `getUnreadCount(userId)`
   - `listNotifications(userId, { limit, cursor })`
   - `markAsRead(id)`
   - `markAllAsRead(userId)`
   - `dismiss(id)` (if we add soft-delete)
4. **Wire up the Bell** — unread count badge, dropdown list, "mark all read" button, deep-link on click.
5. **Add a preferences table** (`user_notification_preferences`) keyed on `type` with `in_app`, `email`, `push` booleans — sets us up for future channel expansion without a rewrite.
6. **Admin CMS** — a `/admin/notifications` page to broadcast `system` / `admin` notifications to all users or cohorts.

---

## Key File References

- Schema: `supabase/migrations/20260128000001_initial_schema.sql`
- RLS: `supabase/migrations/20260128000002_rls_policies.sql`
- Type: `src/types/database.ts` (`Notification`)
- Current insert: `src/app/api/webhooks/stripe/route.ts:233`
- Current UI placeholder: `src/components/Header.tsx:291`
- Account-reset wipe: `src/app/api/account/reset/route.ts:47`
