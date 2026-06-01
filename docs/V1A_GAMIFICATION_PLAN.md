# v1a Gamification — Schema & Migration Plan

Concrete schema design and migration ordering for the v1a gamification scope locked in via `docs/GAMIFICATION_ANALYSIS.md` Round 2.

This document is the source of truth for the v1a build. Cross-references to the analysis doc cover the strategic decisions; here we cover only the implementation.

## Scope

In v1a:

- Coin balance + ledger (XP separate, raw, cached)
- Streak page with freeze/recover power (freeze primitive in v1a; recover-from-shop in v1b)
- Day-streak naming hard-rename
- Achievements page backed by persistent catalogue + per-user unlocks; regular + Special/Mystery sections
- Daily goal + completion celebrations
- Personal-best celebrations
- New admin-managed notification templates
- Admin CRUD for achievements

Not in v1a (architect for, don't build): levels/belts, shop UI/catalogue, multipliers, annual leaderboard rollup, leaderboard-overtaken toasts, variable rewards beyond mystery achievements.

## High-level data model

| Concept | Storage strategy |
|---|---|
| Coins | Cached balance on `users` + full ledger in `coin_transactions` (mirrors `credit_transactions`). |
| XP | Cached lifetime total on `users`. No ledger — XP is deterministic from `test_questions.points_earned` (server-scored), so it's recomputable from source. |
| Streak freeze | Token counter on `users` + per-day `streak_frozen` flag on `user_daily_activity`. |
| Daily goal | Target int on `users` + `daily_goal_met` flag on `user_daily_activity`. |
| Personal bests | Cached fields on `users` (compare-then-update pattern on session complete). |
| Achievements | Two new tables: `achievements` (catalogue) + `user_achievements` (unlocks). |
| Notifications | New templates seeded into existing `notification_templates`. |

## New tables

### `coin_transactions`

```sql
CREATE TABLE coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount integer NOT NULL,          -- positive = earn, negative = spend
  type text NOT NULL,               -- see "Type values" below
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'reversed')),
  description text,
  reference_type text,              -- 'test_session' | 'lesson' | 'achievement' | 'referral' | 'leaderboard_snapshot' | 'admin_grant' | etc.
  reference_id uuid,
  balance_after integer NOT NULL,   -- snapshot for audit + cheap "last N transactions" UI
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX coin_transactions_user_created_idx
  ON coin_transactions (user_id, created_at DESC);

ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can read own coin transactions"
  ON coin_transactions FOR SELECT
  USING (auth.uid() = user_id);
-- No client INSERT/UPDATE/DELETE — all writes via SECURITY DEFINER RPC.
```

**Type values** (kept as free-text + app-side allowlist rather than PG enum for easy expansion):

- **Earn (v1a):** `earn_test_answer`, `earn_lesson_mastered`, `earn_course_mastered`, `earn_language_mastered`, `earn_streak_milestone`, `earn_daily_goal`, `earn_achievement`, `earn_admin_grant`
- **Earn (v1b):** `earn_referral_conversion`, `earn_leaderboard_reward`
- **Spend (v1b):** `spend_streak_freeze`, `spend_streak_recovery`, `spend_subscription_discount`, `spend_cosmetic`, `spend_multiplier`

### `achievements` (catalogue)

```sql
CREATE TABLE achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  icon text,
  category text NOT NULL
    CHECK (category IN ('progress', 'streak', 'mastery', 'social', 'special')),
  is_mystery boolean NOT NULL DEFAULT false,
  tier text
    CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  coin_reward integer NOT NULL DEFAULT 0,
  xp_reward integer NOT NULL DEFAULT 0,
  notification_template_key text,
  unlock_criteria jsonb,
  display_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX achievements_category_display_idx
  ON achievements (category, display_order)
  WHERE enabled = true;

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read enabled achievements"
  ON achievements FOR SELECT
  USING (enabled = true);
-- Admin writes only via service role / admin RPC.
```

**`is_mystery=true`** drives the "??? Locked" UI in the Special section. Mystery achievements hide title/description until unlocked.

**`unlock_criteria` (jsonb) shapes** — declarative, evaluated by a single TS function so new criteria types just add a branch:

```json
// Threshold milestones
{ "type": "words_mastered", "threshold": 50 }
{ "type": "day_streak", "threshold": 7 }
{ "type": "lessons_mastered", "threshold": 10 }

// First-of-its-kind (one-shot)
{ "type": "first_word_learned" }
{ "type": "first_word_mastered" }
{ "type": "first_perfect_test" }
{ "type": "first_lesson_mastered" }
{ "type": "first_word_re_mastered" }

// Mystery / behavioural
{ "type": "test_completed_in_window", "start_hour": 23, "end_hour": 3 }
{ "type": "test_completed_in_window", "start_hour": 0, "end_hour": 6 }
{ "type": "returned_after_inactive_days", "days": 14 }
{ "type": "consecutive_perfect_lessons", "count": 10 }
{ "type": "languages_with_lessons_completed", "count": 2 }
{ "type": "lessons_completed_in_language", "count": 30 }
{ "type": "perfect_session_no_clues_no_mistakes" }
{ "type": "daily_goal_met_streak", "days": 7 }
```

### `user_achievements` (unlocks)

```sql
CREATE TABLE user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  coin_transaction_id uuid REFERENCES coin_transactions(id),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX user_achievements_user_unlocked_idx
  ON user_achievements (user_id, unlocked_at DESC);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own unlocks"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);
-- Writes via SECURITY DEFINER RPC only.
```

UNIQUE constraint ensures no re-unlocks; once earned, stays earned.

## Column additions

### `users`

```sql
ALTER TABLE users
  ADD COLUMN coin_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN lifetime_xp integer NOT NULL DEFAULT 0,
  ADD COLUMN streak_freezes_available integer NOT NULL DEFAULT 1,
  ADD COLUMN daily_xp_goal integer NOT NULL DEFAULT 30,

  -- Personal-best caches (nullable until first comparison)
  ADD COLUMN pb_day_test_points integer,
  ADD COLUMN pb_day_test_points_at date,
  ADD COLUMN pb_week_test_points integer,
  ADD COLUMN pb_week_test_points_at date,
  ADD COLUMN pb_session_score_percent integer,
  ADD COLUMN pb_session_score_at timestamptz;
```

**`streak_freezes_available DEFAULT 1`** = the launch grant. New users automatically have one freeze ready to use. A separate backfill migration grants the same to existing users.

### Day-streak naming

No DB rename. `users.current_streak` and `users.longest_streak` stay as-is. Disambiguation from `user_word_progress.correct_streak` is already handled by the latter being the explicitly-named one and living on a different table — code references always carry table context. In user-facing copy, "streak" defaults to the day streak.

### `user_daily_activity`

```sql
ALTER TABLE user_daily_activity
  ADD COLUMN streak_frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN daily_goal_met boolean NOT NULL DEFAULT false;
```

`streak_frozen=true` rows are created by the RPC when a freeze auto-consumes on a missed day. Render distinctly on the calendar heatmap.

### `referrals` — deferred

Paid-conversion referral attribution is locked in but invasive (new Stripe webhook handler, status transitions, coin reward path). Holding for a v1a.5 mini-migration so the rest of v1a ships clean.

## RPCs

### New: `award_coins` (SECURITY DEFINER)

```
award_coins(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS uuid
```

Atomic: inserts `coin_transactions` row with computed `balance_after`, then bumps `users.coin_balance`. The single source of truth for coin movements — every awarding path goes through this.

In v1a `amount` is always positive. Negative-amount support is built in so v1b spend paths layer in without re-plumbing.

### New: `unlock_achievement` (SECURITY DEFINER)

```
unlock_achievement(
  p_user_id uuid,
  p_achievement_slug text
) RETURNS uuid
```

Idempotent — UNIQUE constraint handles re-entry. On first unlock:

1. INSERT `user_achievements` row
2. If achievement has `coin_reward > 0`, call `award_coins` and link the transaction id back
3. If achievement has `notification_template_key`, insert a notification via the existing template system

Returns the `user_achievements.id` on first unlock, NULL if already unlocked.

### Modify: `update_daily_activity`

Existing signature: `(p_user_id, p_language_id, p_test_points_earned, p_test_max_points, p_words_studied, p_words_mastered, p_study_time_seconds)`.

New responsibilities after the existing activity-row update:

1. **Honour streak freezes on gap detection.** If gap detected and `users.streak_freezes_available > 0`: decrement counter, write `streak_frozen=true` row for the missed day, preserve `current_day_streak`. Otherwise reset per existing logic. Fire `streak.frozen_today` template.
2. **Award XP.** `UPDATE users SET lifetime_xp = lifetime_xp + p_test_points_earned WHERE id = p_user_id`. Raw, no multipliers.
3. **Daily-goal completion.** If today's cumulative `test_points_earned` (summed across languages) >= `users.daily_xp_goal` AND today's `daily_goal_met=false`, set true, call `award_coins(..., 20, 'earn_daily_goal', ...)`, fire `goal.daily_complete`.
4. **Day-streak milestone.** If new `current_day_streak` matches a milestone, call `award_coins`, `unlock_achievement` for matching slug, fire `streak.day_streak_milestone` with `{{count}}`.
5. **PB comparison.** Today's total `test_points_earned` vs `pb_day_test_points`; same for week. Update + fire `personal_best.day` / `.week` if broken.
6. **Mystery achievement evaluation (low-cost only).** night_owl / early_bird (current-time-based), comeback_kid (gap-based). Higher-cost evaluations live in `complete_test_session`.

### Modify: `complete_test_session` (or wherever session-complete logic lives)

1. **Per-answer coins.** Count session's `test_questions` where `mistake_count = 0 AND clue_level = 0`; `award_coins` for that many @ 1 coin each, type `earn_test_answer`.
2. **Lesson-mastered bonus.** If `user_lesson_progress` for this lesson transitioned to mastered, `award_coins(..., 5, 'earn_lesson_mastered', ...)`.
3. **Course / language mastered bonuses.** Same pattern, larger amounts (25 / 100).
4. **First-of-kind achievements.** Evaluated here with `unlock_achievement` calls.
5. **Threshold milestone achievements.** `words_mastered_milestone @ 25/50/100/200/500`, `lessons_complete_milestone @ 5/10/25/50`.
6. **Higher-cost mystery achievements.** `consecutive_perfect_lessons`, `perfect_session_no_clues_no_mistakes`, `polyglot_starter`, `dedicated`, `phoenix`.

This consolidates achievement firing through a single helper. The existing `recordProgressAchievements` in `src/lib/notifications/achievements.ts` becomes a thin layer that calls `unlock_achievement` — notification firing is a side effect of the unlock, not the unlock itself.

## Seed migrations

### Achievements catalogue

**Batch A — port existing trophies** (preserve current notification firing):

| Slug | Title | Criteria | Tier | Coin reward |
|---|---|---|---|---|
| `first_word_learned` | First word learned | first_word_learned | bronze | 10 |
| `first_word_mastered` | First word mastered | first_word_mastered | bronze | 25 |
| `first_perfect_test` | Perfect score | first_perfect_test | bronze | 25 |
| `first_lesson_mastered` | First lesson mastered | first_lesson_mastered | silver | 50 |
| `words_mastered_25` | 25 words mastered | words_mastered 25 | bronze | 25 |
| `words_mastered_50` | 50 words mastered | words_mastered 50 | bronze | 50 |
| `words_mastered_100` | 100 words mastered | words_mastered 100 | silver | 100 |
| `words_mastered_200` | 200 words mastered | words_mastered 200 | gold | 250 |
| `words_mastered_500` | 500 words mastered | words_mastered 500 | platinum | 500 |
| `lessons_complete_5` | 5 lessons complete | lessons_mastered 5 | bronze | 25 |
| `lessons_complete_10` | 10 lessons complete | lessons_mastered 10 | bronze | 50 |
| `lessons_complete_25` | 25 lessons complete | lessons_mastered 25 | silver | 150 |
| `lessons_complete_50` | 50 lessons complete | lessons_mastered 50 | gold | 300 |

**Batch B — new v1a achievements**:

| Slug | Title | Criteria | Category | Mystery? | Coin |
|---|---|---|---|---|---|
| `day_streak_3` | 3-day streak | day_streak 3 | streak | no | 5 |
| `day_streak_5` | 5-day streak | day_streak 5 | streak | no | 10 |
| `day_streak_10` | 10-day streak | day_streak 10 | streak | no | 25 |
| `day_streak_15` | 15-day streak | day_streak 15 | streak | no | 50 |
| `day_streak_30` | 30-day streak | day_streak 30 | streak | no | 100 |
| `day_streak_45` | 45-day streak | day_streak 45 | streak | no | 200 |
| `day_streak_60` | 60-day streak | day_streak 60 | streak | no | 300 |
| `day_streak_90` | 90-day streak | day_streak 90 | streak | no | 500 |
| `night_owl` | Night owl | test_completed_in_window 23-03 | special | yes | 25 |
| `early_bird` | Early bird | test_completed_in_window 0-6 | special | yes | 25 |
| `comeback_kid` | Comeback kid | returned_after_inactive_days 14 | special | yes | 50 |
| `perfectionist` | Perfectionist | consecutive_perfect_lessons 10 | special | yes | 100 |
| `polyglot_starter` | Polyglot starter | languages_with_lessons_completed 2 | special | yes | 50 |
| `dedicated` | Dedicated | lessons_completed_in_language 30 | special | yes | 100 |
| `clean_sheet` | Clean sheet | perfect_session_no_clues_no_mistakes | special | yes | 25 |
| `phoenix` | Phoenix | first_word_re_mastered | special | yes | 50 |
| `goal_keeper_7` | Goal keeper (week) | daily_goal_met_streak 7 | special | yes | 50 |

All numbers above are starting values; admin dashboard can retune any of them via the row's `coin_reward` column.

### Notification templates

Single migration appends:

- `streak.day_streak_milestone` — uses `{{count}}` substitution
- `streak.about_to_break` — evening reminder (cron-driven)
- `streak.broken` — first-login-after-break
- `streak.frozen_today` — confirmation toast
- `goal.daily_complete` — "Daily goal complete!"
- `goal.daily_50_percent` — mid-day nudge (optional firing)
- `coins.earned` — toast-only, `{{amount}}` placeholder
- `achievement.unlocked` — generic fallback (per-achievement keys override where they exist)
- `personal_best.day` / `.week` / `.session`
- `wordprogress.re_mastered`

## Migration ordering

```
20260530000001_v1a_users_columns.sql            -- ADD coin_balance, lifetime_xp, streak_freezes_available, daily_xp_goal, pb_*
20260530000002_v1a_user_daily_activity_cols.sql -- ADD streak_frozen, daily_goal_met
20260530000003_v1a_coin_transactions.sql        -- new table + RLS + indexes
20260530000004_v1a_achievements_tables.sql      -- achievements + user_achievements + RLS + indexes
20260530000005_v1a_award_coins_rpc.sql          -- award_coins SECURITY DEFINER
20260530000006_v1a_unlock_achievement_rpc.sql   -- unlock_achievement SECURITY DEFINER
20260530000007_v1a_update_daily_activity_rpc.sql -- REPLACE update_daily_activity with extended version
20260530000008_v1a_seed_achievements.sql        -- catalogue rows
20260530000009_v1a_seed_notification_templates.sql -- new templates
20260530000010_v1a_backfill_lifetime_xp.sql     -- one-shot SUM(test_questions.points_earned)
20260530000011_v1a_backfill_streak_freeze_grant.sql -- UPDATE users SET streak_freezes_available = 1 (idempotent: only if currently 0)
20260530000012_v1a_backfill_user_achievements.sql -- recreate unlocks from existing notifications history
20260530000013_v1a_backfill_personal_bests.sql  -- compute pb_* from user_daily_activity + test_sessions
```

Dependencies: 5/6 depend on 3/4. 7 depends on 5/6. 8 depends on 4. 10-13 are idempotent backfills, run last.

All migrations can ship dark before any UI work — none change runtime behaviour until the corresponding code change calls the new RPCs.

## Backfill plan

| What | Source | Notes |
|---|---|---|
| `users.lifetime_xp` | `SUM(test_questions.points_earned)` per user (via `test_sessions.user_id`) | One-shot. |
| `users.coin_balance` | 0 for everyone | Coins are forward-only — no retroactive grant. |
| `users.streak_freezes_available` | 1 for everyone (idempotent: only `WHERE streak_freezes_available = 0`) | Launch grant. |
| `users.pb_day_test_points` | `MAX(SUM(test_points_earned)) GROUP BY user_id, activity_date` | Highest single-day total across all languages. |
| `users.pb_week_test_points` | Same, ISO-week-grouped | |
| `users.pb_session_score_percent` | `MAX(score_percent)` from `test_sessions` per user | |
| `user_achievements` | Scan `notifications` where `data->>template_key` matches `achievements.notification_template_key`; insert | Restores trophy state from existing notification log. Idempotent via UNIQUE. |

## RLS summary

| Table | Read | Write |
|---|---|---|
| `coin_transactions` | own (`user_id = auth.uid()`) | RPC only |
| `achievements` | all (`enabled = true`) | admin / service role only |
| `user_achievements` | own | RPC only |
| `users` new cols | own + admin (existing policies) | RPC only for `coin_balance` / `lifetime_xp` / `pb_*`; `daily_xp_goal` allowed via user settings update |
| `user_daily_activity` new cols | own (existing) | RPC only |

## Routes & UI work in v1a

- `/achievements` — top-level. Lists all enabled `achievements` rows, grouped by category. Regular section shows title/description/progress. Special section shows mystery achievements as "???" until unlocked, then title+description revealed.
- `/streak` — top-level. Calendar heatmap from `user_daily_activity`. Distinguishes active / frozen / missed days. Shows current + longest day streak, freezes remaining, "Get more" CTA (dormant link to shop until v1b).
- Dashboard daily-goal ring component (existing dashboard, new widget).
- `/admin/achievements` — CRUD over the catalogue.
- Toast wiring for the new templates.

## Decisions still to make

- **Multi-language daily goal split.** Total-across-languages confirmed for v1a. Per-language surfacing deferred — when it ships, no schema work needed (data already segmented in `user_daily_activity`).
- **Personal-best per-language surfacing.** Same as above — deferred to a "Per-language stats" backlog item.
