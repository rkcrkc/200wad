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

---

# v1 Build Plan

_Last planned: 2026-04-27_

## Scope decisions for v1

| Decision | Choice | Implication |
|---|---|---|
| **Channels** | In-app only at runtime; email scaffolded but not wired | Schema, sender interface, and admin form all support `channels` from day one. The email driver is a no-op until we add a provider (Resend/SendGrid). |
| **Targeting** | All users + simple cohorts (plan, language, active/inactive) | Cohort filter stored as JSONB on the broadcast row; resolved into recipients at send-time. |
| **Scheduling** | Send now + scheduled future send | `scheduled_for` column + a cron worker that dispatches due broadcasts. |
| **Preferences UI** | Deferred | Ship the `user_notification_preferences` table schema in v1 so we don't migrate later, but no settings UI yet. |

## Data model (two-table)

We split the editorial layer (admin-authored content) from the delivery layer (per-user inbox).

### `notification_broadcasts` — new table

What admin creates and edits. One row per broadcast.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `title` | text | required |
| `message` | text | required |
| `type` | text | enum (see below) |
| `data` | jsonb | optional `{ cta: { label, href }, severity, subtype, ... }` |
| `audience` | jsonb | cohort filter, e.g. `{ all: true }` or `{ plan: ['paid'], language: ['it'], active_within_days: 14 }` |
| `channels` | text[] | subset of `['in_app','email']` — v1 accepts `email` but driver is a no-op |
| `scheduled_for` | timestamptz | null = send immediately when admin clicks Send |
| `sent_at` | timestamptz | set by dispatcher; null = pending |
| `recipient_count` | int | populated at dispatch time |
| `status` | text | `'draft' \| 'scheduled' \| 'sending' \| 'sent' \| 'failed'` |
| `created_by` | uuid | FK → users.id (admin) |
| `created_at` / `updated_at` | timestamptz | |

### `notifications` — existing table, evolved

Per-user inbox row. One per (user, broadcast) pair, plus event-driven inserts (Stripe, etc.).

Migrations to apply:
1. **Broaden `type` CHECK** — replace the 2-value enum with: `'system' | 'billing' | 'learning' | 'reminder' | 'achievement' | 'content' | 'admin'`. (Fixes the silent Stripe insert failure.)
2. **Add `broadcast_id uuid` (nullable, FK → notification_broadcasts.id ON DELETE SET NULL)** — links inbox rows back to their broadcast for analytics ("X% read").
3. **Add `channel text NOT NULL DEFAULT 'in_app'`** — `'in_app' | 'email'`. An in-app + email broadcast produces two rows per user (one per channel).
4. **Add `dismissed_at timestamptz`** — distinct from `is_read`; "seen" vs "actioned/cleared".
5. **Add `expires_at timestamptz`** — auto-hide stale items client-side.
6. **Index** `(user_id, channel, dismissed_at, created_at DESC)` for the bell dropdown query.

### `user_notification_preferences` — new table (schema only, no UI in v1)

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | PK part, FK → users.id ON DELETE CASCADE |
| `type` | text | PK part, matches the `notifications.type` enum |
| `in_app` | boolean | default true |
| `email` | boolean | default true |
| `updated_at` | timestamptz | |

Compound PK `(user_id, type)`. RLS: users read/write their own; insert via server.

### Stripe bug fix (do this in the same migration)

The webhook insert at `src/app/api/webhooks/stripe/route.ts:233` writes `type: 'payment_failed'` which violates the CHECK constraint. Once we broaden the enum, change the webhook to `type: 'billing'` with `data.subtype: 'payment_failed'`.

---

## Build phases

Each phase is independently shippable.

### Phase 1 — Schema + Stripe bug fix
- New migration `20260428000001_notifications_v1.sql`:
  - Broaden `notifications.type` CHECK
  - Add `broadcast_id`, `channel`, `dismissed_at`, `expires_at` columns
  - Create `notification_broadcasts` table + RLS (admin only via service role)
  - Create `user_notification_preferences` table + RLS (user owns their rows)
  - Index on `notifications`
- Update `src/app/api/webhooks/stripe/route.ts:233` to `type: 'billing'` with `data.subtype: 'payment_failed'`
- Update `src/app/api/account/reset/route.ts` to also wipe `user_notification_preferences` for the user
- Regenerate `src/types/database.ts`

### Phase 2 — Server-side helpers (queries + mutations)

**Queries — `src/lib/queries/notifications.ts`** (new):
- `getUnreadCount(userId)` — count where `is_read=false AND dismissed_at IS NULL AND channel='in_app' AND (expires_at IS NULL OR expires_at > now())`
- `listInboxNotifications(userId, { limit, cursor })` — bell dropdown source
- `getNotification(id, userId)` — for deep-link landing pages

**Mutations — `src/lib/mutations/notifications.ts`** (new, user-facing):
- `markAsRead(id)`
- `markAllAsRead()`
- `dismiss(id)` — sets `dismissed_at`

**Admin mutations — `src/lib/mutations/admin/notifications.ts`** (new):
- `createBroadcast(input)` — saves draft or scheduled
- `updateBroadcast(id, input)` — only allowed while `status IN ('draft','scheduled')`
- `deleteBroadcast(id)`
- `sendBroadcastNow(id)` — wraps the dispatcher (see Phase 4)
- `cancelScheduledBroadcast(id)` — flips `scheduled` back to `draft`
- All wrapped in `requireAdmin()` from `src/lib/utils/adminGuard.ts`

**Validation — `src/lib/validations/notifications.ts`** (new):
- `broadcastInputSchema` — Zod schema for title, message, type, data, audience, channels, scheduled_for
- `audienceSchema` — discriminated union: `{ all: true }` or `{ plan?, language?, active_within_days? }`

### Phase 3 — Bell UI in Header

- **New primitive — `src/components/ui/dropdown.tsx`**: click-to-open dropdown (we have Popover, but it's hover-based). Lightweight: button trigger + outside-click-close + escape-close. Used for the bell dropdown today, available for future menus.
- **New component — `src/components/notifications/NotificationBell.tsx`** (client):
  - Fetches unread count on mount + on route change
  - Renders `Bell` icon with conditional red badge driven by real count
  - Click opens `NotificationDropdown`
- **New component — `src/components/notifications/NotificationDropdown.tsx`**:
  - Lists recent notifications (latest 20)
  - Each row: icon (by `type`), title, message, relative time, unread dot
  - Row click: marks read → navigates to `data.cta.href` if present
  - Footer actions: "Mark all read", "View all" (links to `/notifications`)
- **New page — `src/app/(dashboard)/notifications/page.tsx`**: full-page archive, paginated.
- Wire into `src/components/Header.tsx:291` — replace the static button.

### Phase 4 — Admin CMS at `/admin/notifications`

Follows the existing admin pattern (server page → client list, modals for create/edit).

**Files:**
- `src/app/admin/notifications/page.tsx` — server component, fetches broadcast list with status, scheduled_for, recipient_count
- `src/app/admin/notifications/NotificationsClient.tsx` — client list + actions
- `src/components/admin/notifications/BroadcastFormModal.tsx` — create/edit form
- `src/components/admin/notifications/AudienceBuilder.tsx` — cohort filter UI (radio for All vs Cohort, then plan/language multiselect, active-within slider)
- `src/components/admin/notifications/RecipientPreview.tsx` — live count "≈ 1,247 users will receive this" using a server action that re-runs the audience query
- Add nav entry to `src/app/admin/layout.tsx` sidebar (under "Content & media" or a new "Engagement" section)

**Form fields:**
- Title (AdminInput)
- Message (AdminTextarea — markdown allowed)
- Type (AdminSelect — the broadened enum)
- CTA label + href (AdminInput, optional, stored under `data.cta`)
- Severity (AdminSelect — info/warning/critical, stored under `data.severity`)
- Audience (AudienceBuilder)
- Channels (checkbox group: In-app, Email; email shown disabled with "Coming soon" badge in v1)
- Schedule (radio: Send now / Schedule for later → datetime picker)

**List page columns:**
- Title, Type, Audience summary ("All users" / "Paid · Italian"), Channels, Status, Scheduled / Sent, Recipients, Actions (Edit / Cancel / Resend / Delete)

### Phase 5 — Dispatcher

The component that resolves a broadcast into per-user `notifications` rows.

- **New file — `src/lib/notifications/dispatcher.ts`**:
  - `resolveAudience(audience)` → `string[]` of user IDs (uses service role; queries `users` + `user_languages` + `subscriptions` + `user_word_progress` for `active_within_days`)
  - `dispatchBroadcast(broadcastId)`:
    1. Set `status = 'sending'`
    2. Resolve recipients
    3. Bulk insert `notifications` rows (one per user × channel)
    4. For each `email` channel row, call `emailSender.send(...)` (no-op in v1, see Phase 6)
    5. Set `status = 'sent'`, `sent_at`, `recipient_count`
    6. On error: `status = 'failed'`, log
- Used by both `sendBroadcastNow` and the cron worker.

- **New cron route — `src/app/api/cron/dispatch-notifications/route.ts`**:
  - Protected by `CRON_SECRET` header
  - Selects all broadcasts where `status = 'scheduled' AND scheduled_for <= now()`
  - Calls `dispatchBroadcast(id)` for each
  - Wired into Vercel Cron (1-minute cadence) via `vercel.json`

### Phase 6 — Email-ready scaffolding (no-op in v1)

- **New file — `src/lib/notifications/sender.ts`**:
  - `interface NotificationSender { send(notification, user): Promise<void> }`
  - `inAppSender` — already covered (the row insert _is_ the in-app delivery)
  - `emailSender` — implements the interface but logs `[email-disabled]` and returns. Provider switch lives behind an env flag (`EMAIL_PROVIDER=none|resend|sendgrid`).
- Templates folder `src/lib/notifications/templates/` — empty for v1, placeholder so the layout exists.
- Admin form shows the Email channel checkbox **disabled** with a "Coming soon" tooltip until `EMAIL_PROVIDER !== 'none'`.

### Phase 7 — Hooks for event-driven notifications (light touch in v1)

We're not building behavioral triggers yet, but expose the helper so they slot in cleanly later.

- **New file — `src/lib/notifications/insert.ts`**:
  - `insertNotification({ userId, type, title, message, data?, channel? })` — server-only helper that does the right insert + respects `user_notification_preferences` (when set) + obeys `expires_at`.
- Migrate the Stripe webhook to use this helper (replaces the raw SQL insert).
- Document in the helper's JSDoc that future triggers (streak, mastery regression, etc.) should call it from cron jobs.

---

## Admin CMS — what gets managed

Per the user's ask, this is the surface where admins control delivered content:

| Capability | Where | v1? |
|---|---|---|
| Create / edit / delete broadcasts | `/admin/notifications` list + modal | ✅ |
| Audience targeting (all / plan / language / active) | `AudienceBuilder` component | ✅ |
| Live recipient count preview | `RecipientPreview` server action | ✅ |
| Channel selection (in-app, email) | Checkboxes in form (email disabled) | ✅ schema, ❌ runtime email |
| Send now | Action button, calls `sendBroadcastNow` | ✅ |
| Schedule for later | Datetime picker → cron dispatcher | ✅ |
| Cancel scheduled | Action button on list row | ✅ |
| Resend (clone) | Pre-fills the form with the original payload | ✅ |
| Read-rate analytics ("47% opened") | Aggregate of `notifications.is_read` filtered by `broadcast_id` | ✅ basic counter, ❌ charts |
| Per-type icon / color theming | Driven by `type` enum + `data.severity` | ✅ |
| Preview as user | Renders the dropdown row + (future) email template in a modal | ✅ in-app preview only |
| User preference editing | Settings page | ❌ deferred |
| A/B testing, drip campaigns | — | ❌ out of scope |

---

## File-level deliverables checklist

```
supabase/migrations/
  20260428000001_notifications_v1.sql        NEW

src/app/admin/notifications/
  page.tsx                                   NEW
  NotificationsClient.tsx                    NEW

src/app/(dashboard)/notifications/
  page.tsx                                   NEW

src/app/api/cron/dispatch-notifications/
  route.ts                                   NEW

src/components/admin/notifications/
  BroadcastFormModal.tsx                     NEW
  AudienceBuilder.tsx                        NEW
  RecipientPreview.tsx                       NEW

src/components/notifications/
  NotificationBell.tsx                       NEW
  NotificationDropdown.tsx                   NEW
  NotificationRow.tsx                        NEW

src/components/ui/
  dropdown.tsx                               NEW (click-based)

src/lib/queries/
  notifications.ts                           NEW

src/lib/mutations/
  notifications.ts                           NEW
  admin/notifications.ts                     NEW

src/lib/validations/
  notifications.ts                           NEW

src/lib/notifications/
  dispatcher.ts                              NEW
  sender.ts                                  NEW
  insert.ts                                  NEW
  templates/                                 NEW (empty for v1)

src/types/database.ts                        REGENERATED
src/components/Header.tsx                    EDITED (replace static bell)
src/app/admin/layout.tsx                     EDITED (sidebar nav entry)
src/app/api/webhooks/stripe/route.ts         EDITED (use insertNotification + 'billing' type)
src/app/api/account/reset/route.ts           EDITED (wipe prefs table too)
vercel.json                                  EDITED (cron schedule)
.env.example                                 EDITED (CRON_SECRET, EMAIL_PROVIDER)
```

## Suggested phase order (each independently shippable)

1. Phase 1 — Schema + Stripe bug fix
2. Phase 2 — Server helpers
3. Phase 3 — Bell UI (real unread count, even with no admin CMS yet)
4. Phase 4 — Admin CMS (broadcast creation, send-now only)
5. Phase 5 — Dispatcher + cron (unlocks scheduling)
6. Phase 6 — Email scaffolding (no-op driver, form support)
7. Phase 7 — `insertNotification` helper + migrate Stripe site

After v1, the natural follow-ups are: behavioral triggers (cron jobs that call `insertNotification`), preferences UI, email driver swap-in, and read-rate charts in the admin list.
