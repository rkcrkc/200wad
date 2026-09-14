# Billing & Subscriptions Plan

## 1. Overview

200 Words a Day uses a tiered subscription model. The first N lessons of every course are free (configurable per course, default 10). Users need an active subscription to access lessons beyond the free threshold. The initial frontend launch supports **language-level and all-languages subscriptions only**, but the backend is architected to support course-level subscriptions when needed.

---

## 2. Subscription Tiers

| Tier | Scope | Initial Frontend | Backend Support |
|---|---|---|---|
| **Course** | Single course | Hidden | Yes (is_active: false) |
| **Language** | All courses in one language | Shown | Yes |
| **All Languages** | Everything, all languages | Shown | Yes |

A `platform_config` table (or equivalent settings mechanism) stores `enabled_tiers`. Initially set to `['language', 'all-languages']`. Adding `'course'` later requires no code changes—just config + activating pricing plans.

---

## 3. Billing Models

Each tier supports three billing models:

| Model | Behavior |
|---|---|
| **Monthly** | Recurring charge every month via Stripe |
| **Annual** | Recurring charge every year via Stripe, discounted vs monthly |
| **Lifetime** | One-time payment, permanent access, no expiration |

---

## 4. Pricing (Initial)

From admin-configurable `pricing_plans` table. Starting values:

| Tier | Monthly | Annual | Lifetime |
|---|---|---|---|
| Single Course | $9.99/mo | $99.00/yr ($8.25/mo) | $50.00 |
| Single Language | $14.99/mo | $129.00/yr ($10.75/mo) | $120.00 |
| All Languages | $19.99/mo | $149.00/yr ($12.42/mo) | $299.00 |

Course-tier prices exist in the DB but are not shown in the frontend initially.

Individual courses can have a `price_override_cents` field on the `courses` table that overrides the default course-tier price. Unused initially but ready for when course-level billing is enabled.

---

## 5. Free Lesson Policy

- Each course has a `free_lessons` field (already exists in DB, default: 10)
- A global default lives in `platform_config` (e.g., `default_free_lessons: 10`)
- Access control checks: `course.free_lessons ?? globalDefault`
- If `free_lessons` is null, the global default applies
- Admins can override per course for promotions or A/B testing
- For A/B testing: add a `cohort` field on users that maps to different global defaults

---

## 6. Database Schema

### New Tables

#### `platform_config`
General app configuration. Key-value or structured.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `key` | text | e.g., 'enabled_tiers', 'default_free_lessons' |
| `value` | jsonb | e.g., '["language", "all-languages"]', '10' |
| `updated_at` | timestamptz | |

#### `pricing_plans`
Admin-managed pricing, synced to Stripe.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `tier` | text | 'course', 'language', 'all-languages' |
| `billing_model` | text | 'monthly', 'annual', 'lifetime' |
| `amount_cents` | integer | Price in cents |
| `currency` | text | Default 'usd' |
| `is_active` | boolean | Controls visibility in UI |
| `stripe_price_id` | text | Synced when admin updates price |
| `stripe_product_id` | text | Stripe product reference |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `subscriptions`
User subscription records.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → users |
| `type` | text | 'course', 'language', 'all-languages' |
| `plan` | text | 'monthly', 'annual', 'lifetime' |
| `status` | text | 'active', 'cancelled', 'expired' |
| `target_id` | uuid | FK → courses.id or languages.id, null for all-languages |
| `amount_cents` | integer | What the user paid |
| `currency` | text | Default 'usd' |
| `stripe_subscription_id` | text | Null for lifetime (one-time payment) |
| `stripe_customer_id` | text | Stripe customer reference |
| `current_period_start` | timestamptz | Start of current billing period |
| `current_period_end` | timestamptz | End of current billing period / access expiry |
| `cancel_at_period_end` | boolean | True if user has cancelled but access continues |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

For lifetime subscriptions: `current_period_end` is null (never expires), `stripe_subscription_id` is null.

#### `credit_transactions`
Ledger for all credit activity.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → users |
| `amount_cents` | integer | Positive = credit earned, negative = credit spent |
| `type` | text | 'referral', 'reward', 'redemption', 'adjustment' |
| `status` | text | 'pending', 'confirmed', 'expired' |
| `reference_id` | uuid | e.g., referral record ID |
| `description` | text | Human-readable description |
| `created_at` | timestamptz | |

#### `referrals`
Tracks referral relationships and status.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `referrer_id` | uuid | FK → users (the person sharing) |
| `referred_user_id` | uuid | FK → users (the person signing up) |
| `referral_code` | text | Unique code for the referrer |
| `status` | text | 'pending', 'completed', 'expired' |
| `credit_amount_cents` | integer | Amount to credit (e.g., 400 = $4) |
| `credited_at` | timestamptz | When credit was confirmed |
| `created_at` | timestamptz | |

### Modified Tables

#### `courses` (existing)
- **Keep**: `free_lessons` (already exists)
- **Rename/repurpose**: `price_cents` → `price_override_cents` (nullable, overrides default course-tier price when course billing is enabled)

#### `users` (existing)
- **Add**: `referral_code` (unique text, auto-generated on account creation)
- **Add**: `stripe_customer_id` (text, created on first checkout)
- **Add**: `cohort` (text, nullable, for A/B testing free lesson thresholds)

---

## 7. Access Control Algorithm

```
function canAccessLesson(user, lesson, course):
    freeLessons = course.free_lessons ?? platformConfig.default_free_lessons

    // Free lessons always accessible
    if lesson.number <= freeLessons:
        return true

    // Must be logged in
    if !user:
        return false

    // Get active subscriptions
    activeSubscriptions = user.subscriptions.filter(s =>
        s.status === 'active' OR
        (s.status === 'cancelled' AND s.current_period_end > now())
    )

    for sub in activeSubscriptions:
        // All-languages unlocks everything
        if sub.type === 'all-languages':
            return true

        // Language subscription unlocks all courses in that language
        if sub.type === 'language' AND sub.target_id === course.language_id:
            return true

        // Course subscription unlocks that specific course
        if sub.type === 'course' AND sub.target_id === course.id:
            return true

    return false
```

Note: Cancelled subscriptions with `cancel_at_period_end: true` still grant access until `current_period_end`. This mirrors Stripe's native behavior.

---

## 8. Stripe Integration

### Architecture
- **Payment flow**: Hosted Stripe Checkout (redirect to stripe.com, return to app)
- **Self-service cancellation**: Stripe Customer Portal (linked from subscription management page)
- **Pricing source of truth**: Admin DB (`pricing_plans` table), synced to Stripe
- **Subscription lifecycle**: Managed by Stripe, synced to app DB via webhooks

### Stripe Products & Prices
- Create one Stripe Product per tier: "Course Subscription", "Language Subscription", "All Languages Subscription"
- Create Stripe Prices for each billing model under each product
- When admin updates a price in `pricing_plans`, a server action creates a new Stripe Price (Stripe Prices are immutable) and archives the old one
- Store the `stripe_price_id` on each `pricing_plans` row

### Checkout Flow
1. User toggles subscriptions on management page → items appear in sticky cart bar
2. User clicks "Proceed to Checkout"
3. Server action creates a Stripe Checkout Session with:
   - Line items (one per toggled subscription, referencing `stripe_price_id`)
   - Customer (create or retrieve Stripe customer by `users.stripe_customer_id`)
   - Customer balance applied automatically (credits)
   - Success/cancel redirect URLs
   - Metadata: user_id, subscription type, target_id for each item
4. User redirected to Stripe Checkout
5. On success, Stripe fires `checkout.session.completed` webhook
6. Webhook handler creates `subscriptions` records in DB

### Webhook Events to Handle

| Event | Action |
|---|---|
| `checkout.session.completed` | Create subscription record(s), set status: active |
| `invoice.paid` | Update current_period_start/end, confirm status: active |
| `invoice.payment_failed` | Notify user to update payment method (grace period) |
| `customer.subscription.updated` | Sync status, cancel_at_period_end, period dates |
| `customer.subscription.deleted` | Set status: expired |

### Lifetime Purchases
- Use Stripe Checkout in `payment` mode (not `subscription` mode)
- Creates a one-time charge, no recurring billing
- Webhook: `checkout.session.completed` → create subscription with plan: 'lifetime', no period_end

---

## 9. Credits System

### How Credits Work
1. User earns credits through actions (initially: referrals at $4 per successful referral)
2. Credits are tracked in `credit_transactions` table (ledger pattern)
3. Credit balance is also synced to **Stripe Customer Balance** (negative balance = credit)
4. At checkout, Stripe automatically applies customer balance to reduce the charge
5. For recurring subscriptions, Stripe applies balance each billing cycle until depleted

### Referral Flow
1. Each user gets a unique `referral_code` on account creation
2. User shares link: `https://200wordsaday.com/join/{referral_code}`
3. Friend signs up → `referrals` record created with status: 'pending'
4. Friend completes their first lesson → referral status: 'completed'
5. `credit_transactions` record created: +$4.00 (400 cents), status: 'confirmed'
6. Stripe Customer Balance incremented by $4.00
7. Next checkout or billing cycle, credit is auto-applied

### Credit Display
- **Refer & Earn page**: Total referrals, pending, credits earned
- **Subscription management page**: Credit balance shown (TBD placement)
- **Checkout cart (sticky bar)**: Available credits shown, reducing displayed total

### Future Credit Sources
The `credit_transactions.type` field supports expansion beyond referrals:
- 'reward' - for completing streaks, milestones, etc.
- 'adjustment' - admin manual credits
- Additional types as needed

---

## 10. UI Flows

### Subscription Management Page (`/subscriptions` or `/account/subscriptions`)

**Top section: Pricing tier overview cards**
- Two cards shown initially: Single Language, All Languages (gold gradient, "Best value")
- Single Course card hidden (backend ready, `enabled_tiers` excludes 'course')
- Each card shows monthly price with annual and lifetime alternatives

**Middle section: Active Subscriptions & Lifetime Purchases**
- Lists all user's active/cancelled subscriptions
- Color-coded borders: green for recurring, purple for lifetime
- Each row expandable:
  - **Recurring**: Subscription details (date started, next billing date), Cancel button, included courses list with "Included" badge
  - **Lifetime**: Purchase details (purchase date, access: Lifetime, course progress)
- Cancelled subscriptions show remaining access period

**Bottom section: Available Subscriptions**
- Toggle: Monthly / Annual / Lifetime
- "All Languages Access" row at top (gold icon)
- Individual language rows below, each showing price and toggle
- Toggling a subscription ON → **confirmation dialog** → item added to cart
- If "All Languages" is toggled on, individual language toggles auto-disable (redundant)
- Smart upsell: if user toggles multiple languages, suggest All Languages

**Sticky cart bar (bottom)**
- Appears when 1+ items toggled on
- Shows: cart icon, item count, item chips (removable with X), credit balance, total after credits, "Proceed to Checkout" button
- Credits shown as line item reducing total: "Credits: -$12.00"

### Upgrade Modal (locked lesson click)

When user clicks a locked lesson (lesson number > free threshold):
1. Modal appears with context: "Continue your learning journey"
2. Shows lesson being unlocked, total lessons in course
3. Two subscription cards:
   - **Language subscription**: language name, monthly price, "all courses in [language]"
   - **All Languages**: monthly price, all languages and courses (highlighted as "BEST VALUE")
4. Clicking either card navigates to subscription management page with that tier pre-selected

### Lesson Locking UI
- All lessons visible in list
- Locked lessons (beyond free threshold, no valid subscription):
  - Orange lock icon on lesson card
  - Reduced opacity / dimmed appearance
  - Clickable → opens Upgrade Modal

---

## 11. Admin Management

### Pricing Management
- Admin page to view/edit all `pricing_plans` rows
- Edit price → server action updates DB + creates new Stripe Price + archives old one
- Toggle `is_active` per plan
- Manage `enabled_tiers` in platform config

### Course Configuration (existing, enhanced)
- `free_lessons` per course (already exists)
- `price_override_cents` per course (for future course-tier billing)

### Platform Config
- `default_free_lessons`: global default
- `enabled_tiers`: which subscription tiers are shown in frontend
- `referral_credit_cents`: amount credited per referral (default 400)

---

## 12. Future Flexibility

### Enabling Course-Level Billing
1. Add `'course'` to `enabled_tiers` config
2. Set course-tier `pricing_plans` rows to `is_active: true`
3. Frontend renders course sub-items within expanded language rows
4. Course sub-items show "Unlock $X / One-time purchase" with toggles
5. Cart supports mixed tier items
6. Access control already handles course-level checks
7. No code changes to backend/access control needed

### Switching to Language-Only (dropping course tier later)
1. Already the initial state - no action needed
2. If course-tier was enabled and needs disabling: remove from `enabled_tiers`, deactivate plans
3. Existing course subscriptions continue to work until they expire/cancel

### A/B Testing Free Lessons
- `users.cohort` field maps to different `default_free_lessons` values
- Or per-cohort overrides in `platform_config`
- Access control reads user's cohort to determine threshold

---

## 13. Implementation Order

### Phase 1: Database & Backend Foundation
1. Create `platform_config` table + seed initial values
2. Create `pricing_plans` table + seed 9 price points (3 tiers × 3 billing models)
3. Create `subscriptions` table with RLS policies
4. Create `credit_transactions` table
5. Create `referrals` table
6. Add `stripe_customer_id`, `referral_code`, `cohort` to users table
7. Rename `price_cents` → `price_override_cents` on courses table
8. Build access control utility function

### Phase 2: Lesson Locking UI
1. Integrate access control into lesson list rendering
2. Add lock icons and dimmed styling to locked lessons
3. Build Upgrade Modal component
4. Wire locked lesson click → modal → subscription page navigation

### Phase 3: Subscription Management Page
1. Pricing tier overview cards
2. Active subscriptions list with expand/collapse and details
3. Available subscriptions list with toggles
4. Confirmation dialog on toggle
5. Sticky cart bar with credit display
6. Monthly/Annual/Lifetime billing toggle

### Phase 4: Stripe Integration
1. Set up Stripe Products and Prices (synced from pricing_plans)
2. Checkout Session creation (server action)
3. Webhook endpoint for subscription lifecycle events
4. Stripe Customer Portal integration for cancellation
5. Success/cancel redirect pages

### Phase 5: Credits & Referrals
1. Referral code generation on user creation
2. Referral link tracking (join page with code capture)
3. Referral completion trigger (first lesson completed)
4. Credit transaction creation + Stripe Customer Balance sync
5. Refer & Earn page UI
6. Credit display in checkout cart

### Phase 6: Admin Tooling
1. Pricing plans admin page (CRUD + Stripe sync)
2. Platform config admin page
3. Subscription overview/management for admin
4. Credit adjustment tools

---

## 14. Testing Scenarios

- User with no subscriptions: sees free lessons unlocked, rest locked
- User with language subscription (Italian): all Italian lessons unlocked, other languages locked beyond free
- User with all-languages subscription: everything unlocked
- Cancelled subscription: access continues until period end, then locked
- Expired subscription: same as no subscription
- Multiple subscriptions: union of all access granted
- Free lesson threshold: respects per-course value, falls back to global default
- Credits applied at checkout: total reduced by credit balance
- Referral completion: credit appears in balance, synced to Stripe
- Admin price change: new Stripe Price created, old archived, UI reflects new price
- Tier toggle: disabling course tier hides it from frontend, existing subscriptions unaffected
