# v1b Leaderboard — XP Leagues Plan

Rearchitects the leaderboard around a single metric (**XP**) and adds Duolingo-style
**leagues** (tiered, division-based weekly competition). This document is the source
of truth for the v1b leaderboard build. It captures the locked design decisions, the
schema, and the phased rollout.

Companion docs: `docs/GAMIFICATION_ANALYSIS.md` (strategy) and
`docs/V1A_GAMIFICATION_PLAN.md` (coins / XP / achievements foundation this builds on).

## Why rearchitect

The current board ranks on three metrics (`avg_words_per_day`, `words_mastered`,
`streak`) per language. That is more surface area than we want and splits the
population by course. The live RPC already works, but the UI shows sample data
because real data is sparse (`LeaderboardClient.tsx:198` → `useMockData = data.entries.length < 5`).

We are collapsing to **XP only**, **global (cross-language)**, with **leagues** layered
on top. This is simpler to reason about, matches the global XP/levels model already
shipped, and gives every learner one room to compete in regardless of course.

## Locked decisions

| # | Decision | Detail |
|---|---|---|
| 1 | **Single metric: XP** | XP = `user_daily_activity.test_points_earned` (per-day, per-language). No schema change needed. |
| 2 | **Global / cross-language** | Sum XP across all of a user's languages. No `language_id` filter. |
| 3 | **Two tabs** | **Weekly** (this week's XP — the league board) + **All-time** (`users.lifetime_xp`, reference only, no rewards for now). |
| 4 | **Leagues as a config table** | Admin-managed `leagues` table mirroring the `levels` catalogue pattern. |
| 5 | **Division model: 30 / 8 / 8** | Rooms of ~30; top 8 promote, bottom 8 relegate. Symmetric movement (see below). |
| 6 | **Rewards in coins** | Weekly placement pays coins (not cash credits). Reuses the v1a coin ledger. |
| 7 | **Streak board removed from UI** | But the `get_leaderboard(..., 'streak')` infrastructure stays for the "top 10 in streaks" badge on `/streak` (`src/lib/queries/streaks.ts`). |
| 8 | **League unlock gate** | Eligible once the user has **tested ≥ 3 distinct real lessons** (global, across languages). Paired visible trophy. |
| 9 | **Trophies are global** | Confirmed: `user_achievements` is keyed `UNIQUE(user_id, achievement_id)`, all progress aggregates are per-user across every language. The unlock trophy fits this model directly. |

### On symmetric promote/relegate (the 8/8)

In a **closed population**, promotions out of a tier must be balanced by relegations
into it from the tier above (and vice-versa), or tiers drift empty/overflowing.
Duolingo can run asymmetric movement because constant growth + churn + the top/bottom
endpoints absorb the imbalance; we should not assume that. So:

- **Promote count == relegate count** per tier (default 8/8).
- **Top tier**: nobody promotes (nowhere to go) — those 8 slots just "hold".
- **Bottom tier**: nobody relegates — those 8 slots "hold".
- New / returning users always enter at the **bottom tier**, which naturally absorbs
  growth without breaking the balance of the middle tiers.

Division **count** per tier is automatic: `ceil(active_members_in_tier / division_size)`.
Capacity scales with the user base — 100,000 active users is just more rooms of 30,
each user only ever sees their own ~30-person room.

## Current state (what exists today)

- **RPCs (live, SECURITY DEFINER):** `get_leaderboard(p_language_id, p_metric, p_period, p_limit)`
  and `get_user_leaderboard_position(...)` compute live from `user_daily_activity` +
  `users.current_streak`. They do **not** read `weekly_leaderboard_snapshots` (0 rows).
- **`get_users_levels(p_user_ids)`** batch-resolves rank badges for the board.
- **Tables:** `leaderboard_rewards` (10 rows, `reward_cents`), `weekly_leaderboard_snapshots`
  (empty), `platform_config.leaderboard_leagues` (legacy league JSON).
- **Queries:** `src/lib/queries/leaderboard.ts` — `getLeaderboard`, `getUserLeaderboardPosition`,
  `getLeaderboardRewards`, `getLeagueConfig`, `getPersonalBests`.
- **UI:** `src/components/community/LeaderboardClient.tsx` (metric selector, week/all-time
  toggle, mock fallback) at `src/app/(dashboard)/community/page.tsx`.

## XP model

- **Weekly XP** = `SUM(user_daily_activity.test_points_earned)` over the competition week
  (ISO Monday→Sunday), across all languages, per user.
- **All-time XP** = `users.lifetime_xp` (already cached).
- No new columns. The only thing missing is a place to persist league membership and
  weekly results.

## Schema

### `leagues` — tier catalogue (mirrors `levels`)

```sql
CREATE TABLE public.leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Tier order. 1 = lowest tier (entry / bottom), ascending. UNIQUE so the
  -- promote/relegate ladder is unambiguous.
  tier_order integer NOT NULL UNIQUE CHECK (tier_order > 0),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#9ca3af',
  -- Room size + symmetric movement, admin-tunable per tier. Defaults 30/8/8.
  division_size integer NOT NULL DEFAULT 30 CHECK (division_size > 0),
  promote_count integer NOT NULL DEFAULT 8 CHECK (promote_count >= 0),
  relegate_count integer NOT NULL DEFAULT 8 CHECK (relegate_count >= 0),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read enabled leagues"
  ON public.leagues FOR SELECT USING (enabled = true);
-- Admin writes via service role only.
```

Seed (locked 6-tier ladder, names/colours admin-editable). `tier_order` ascends
with prestige: the bottom two tiers use humble materials (Wood, Stone) that read as
"you've slipped / starting out", climbing through the precious-metal run
Copper → Bronze → Silver → Gold:

```sql
INSERT INTO public.leagues (tier_order, slug, name, color) VALUES
  (1, 'wood',   'Wood',   '#8b5e3c'),
  (2, 'stone',  'Stone',  '#78716c'),
  (3, 'copper', 'Copper', '#b87333'),
  (4, 'bronze', 'Bronze', '#cd7f32'),
  (5, 'silver', 'Silver', '#9ca3af'),
  (6, 'gold',   'Gold',   '#f59e0b')
ON CONFLICT (slug) DO NOTHING;
```

### `league_memberships` — per-user, per-week room assignment

```sql
CREATE TABLE public.league_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- ISO Monday of the competition week this row belongs to.
  week_start date NOT NULL,
  league_id uuid NOT NULL REFERENCES leagues(id),
  -- Room number within the tier (1..N). The board a user sees = everyone
  -- sharing the same (week_start, league_id, division).
  division integer NOT NULL CHECK (division > 0),
  -- Snapshot of weekly XP at close; live value is recomputed during the week.
  xp_earned integer NOT NULL DEFAULT 0,
  -- Set at weekly close.
  final_rank integer,
  result text CHECK (result IN ('promoted', 'relegated', 'held')),
  coin_reward integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX league_memberships_room_idx
  ON public.league_memberships (week_start, league_id, division);

ALTER TABLE public.league_memberships ENABLE ROW LEVEL SECURITY;
-- Read own row; the room board is served via SECURITY DEFINER RPC so other
-- users' rows aren't directly exposed (same pattern as get_leaderboard today).
CREATE POLICY "users read own membership"
  ON public.league_memberships FOR SELECT USING (auth.uid() = user_id);
```

### Reward bands (coins) — `league_rewards`

**Locked (Phase 2):** new `league_rewards` table keyed by `league_id` + an inclusive
finishing-rank band, paying **coins**. Kept separate from the legacy cash
`leaderboard_rewards` (`reward_cents`), which can be retired later.

**Podium-only payout (Duolingo-style):** coins go to the **top 3** of each room only;
promotion up the ladder is its own reward for the rest of the top 8. Amounts scale up
per tier and are admin-tunable.

```sql
CREATE TABLE public.league_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  rank_min integer NOT NULL CHECK (rank_min > 0),     -- inclusive band within the room
  rank_max integer NOT NULL CHECK (rank_max >= rank_min),
  coin_reward integer NOT NULL DEFAULT 0 CHECK (coin_reward >= 0),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, rank_min, rank_max)
);
ALTER TABLE public.league_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read enabled league rewards"
  ON public.league_rewards FOR SELECT USING (enabled = true);
```

Seeded podium bands (#1 / #2 / #3), scaling roughly 1.4–1.5× per tier:

| Tier   | #1  | #2  | #3 |
|--------|-----|-----|----|
| Wood   | 30  | 20  | 10 |
| Stone  | 45  | 30  | 15 |
| Copper | 65  | 45  | 20 |
| Bronze | 95  | 60  | 30 |
| Silver | 140 | 90  | 45 |
| Gold   | 200 | 130 | 65 |

Migrations: `…000016_v1b_league_rewards_table.sql` (table + RLS + seed).

### Config

Global, non-per-tier knobs live in `platform_config`:

- `min_lessons_tested_to_join_leagues` → default `3`.

(Division size / promote / relegate are per-tier columns on `leagues` so admins can
tune individual tiers.)

## League-unlock gate

**Eligible when the user has tested ≥ N distinct real lessons** (default N = 3),
counted globally across all languages:

```sql
SELECT COUNT(DISTINCT lesson_id)
FROM test_sessions
WHERE user_id = ?
  AND lesson_id IS NOT NULL   -- excludes virtual auto-review lessons
  AND taken_at IS NOT NULL;   -- only actually-taken tests
```

- A test is always scoped to exactly one lesson (`test_sessions.lesson_id`,
  enforced in `src/lib/mutations/test.ts`), so `COUNT(DISTINCT lesson_id)` is exact.
- `lesson_id IS NOT NULL` keeps the gate honest: auto-review tests don't count, so a
  user can't farm the same review to unlock.
- **Cross-language by design** — any course's lessons count, matching the global XP model.
- New query: `getDistinctLessonsTested(userId)` in `src/lib/queries/leaderboard.ts`
  (promote to a small RPC if the weekly snapshot job needs it server-side).

### Paired trophy

Add a global achievement (trophies are global — confirmed) to the achievements
catalogue:

- slug `leagues_unlocked`, criteria type counting distinct lessons tested, threshold 3.
- Copy: **"Test 3 lessons → Leagues unlocked."**
- Until unlocked, the **Weekly** tab on the leaderboard renders a locked state with
  progress ("2 / 3 lessons tested"); the All-time tab stays open to everyone.

## League placement trophies — **IMPLEMENTED**

Implemented via migrations `20260616000001`–`20260616000003`, the Hall of Fame block in
`recordProgressAchievements` (`src/lib/notifications/achievements.ts`), and the three
`resolveProgress` branches + `get_league_achievement_stats` aggregates in
`src/lib/queries/achievements.ts`. See the "League placement achievements" tech-debt note
below for the small representation choices made. The original draft is retained below for
reference.

Beyond the single `leagues_unlocked` gate trophy, no achievements rewarded competitive
**placement** before this set (climbing tiers, podium finishes, league wins, all-time rank).

All rows sit in the existing `social` category (currently empty), `is_mystery = false`
(visible goals), and follow the existing reward/tier conventions (bronze 25–50, silver
50–100, gold 150–300, platinum 500). `notification_template_key` would be `NULL` for v1
(silent unlock, like the `streak_<N>` rows); per-trophy templates can be added later
mirroring the v1a notification-template seed.

**A. Climb the ladder** — fired at weekly close when the member's new tier reaches the milestone:

| slug | title | description | tier | coins | unlock_criteria |
|---|---|---|---|---|---|
| `league_stone_reached` | Climbing | Reached the Stone League. | bronze | 25 | `{"type":"league_tier_reached","tier_order":2}` |
| `league_copper_reached` | Copper tier | Reached the Copper League. | bronze | 50 | `{"type":"league_tier_reached","tier_order":3}` |
| `league_bronze_reached` | Bronze tier | Reached the Bronze League. | silver | 75 | `{"type":"league_tier_reached","tier_order":4}` |
| `league_silver_reached` | Silver tier | Reached the Silver League. | gold | 150 | `{"type":"league_tier_reached","tier_order":5}` |
| `league_gold_reached` | Top of the world | Reached the Gold League — the top tier. | platinum | 400 | `{"type":"league_tier_reached","tier_order":6}` |

**B. Podium & wins** — based on `final_rank` at close (cumulative counts over a user's history):

| slug | title | description | tier | coins | unlock_criteria |
|---|---|---|---|---|---|
| `league_first_podium` | On the podium | Finished top 3 in your league. | bronze | 50 | `{"type":"league_podium_finishes","threshold":1}` |
| `league_first_win` | League champion | Finished #1 in your league. | silver | 100 | `{"type":"league_wins","threshold":1}` |
| `league_wins_5` | Dynasty | Won your league five times. | gold | 300 | `{"type":"league_wins","threshold":5}` |

**C. Hall of Fame (all-time board):**

| slug | title | description | tier | coins | unlock_criteria |
|---|---|---|---|---|---|
| `hall_of_fame_top20` | Hall of Fame | Broke into the all-time top 20. | gold | 200 | `{"type":"alltime_rank_reached","threshold":20}` |
| `alltime_champion` | World #1 | Reached #1 on the all-time leaderboard. | platinum | 500 | `{"type":"alltime_rank_reached","threshold":1}` |

`display_order` 10–100 within the `social` group.

### Trigger wiring (to build)

`unlock_achievement(user, slug)` does **not** evaluate criteria — it unlocks idempotently;
the **caller** decides when to fire (exactly how `update_daily_activity` fires `streak_<N>`).
So the `unlock_criteria` JSON above is declarative documentation; the actual triggers are:

1. **Seed migration** — insert the 10 `social` rows (`ON CONFLICT (slug) DO UPDATE`
   structural-only, matching `…000008_v1a_seed_achievements.sql`).
2. **`close_league_week`** — after settlement (step 4), loop members and call
   `unlock_achievement` for each qualifying slug:
   - **tier reached** — from the next-week league `tier_order`,
   - **podium** — `COUNT(*)` of the user's historical `league_memberships` with
     `final_rank ≤ 3` ≥ threshold,
   - **wins** — historical `final_rank = 1` count ≥ threshold.
   All cheap queries against `league_memberships`.
3. **Hall of Fame trophies** — no settlement job covers the all-time board. Recommended:
   evaluate in **`complete_test_session`** (already a definer caller of `unlock_achievement`)
   using `get_user_leaderboard_position`. Since only the user's own XP gains move them
   *up*, a post-test rank check catches them crossing the threshold by their own action;
   being pushed back out later does not revoke the (permanent) unlock.

### Open questions (before building)

- **Promotion vs tier-reached overlap** — `league_stone_reached` already covers the first
  move up, so no standalone "first promotion" trophy is drafted. Add a promotion-streak
  trophy (e.g. "Promoted 3 weeks running") instead?
- **Hall of Fame trigger** — evaluate in `complete_test_session`, or only on a weekly job?
- **Coin values** — drafted figures above are provisional and admin-tunable.

## Weekly close job — `close_league_week(p_week_start date DEFAULT NULL)`

**Locked (Phase 2).** SECURITY DEFINER, execute revoked from anon/authenticated.
`p_week_start` defaults to the **previous** ISO week
(`date_trunc('week', CURRENT_DATE)::date - 7`), so running it at the Monday boundary
closes the week that just ended. Per `(league_id, division)`:

1. Freeze each member's `xp_earned` = `SUM(user_daily_activity.test_points_earned)` over
   `[week_start, week_start + 7)` (global, all languages).
2. Assign `final_rank` by `xp_earned DESC, created_at ASC` (tie-break: earlier enrolment).
3. Set `result`: top `promote_count` → `'promoted'`, bottom `relegate_count` →
   `'relegated'`, rest `'held'`. The **top tier caps promotion** and the **bottom tier
   caps relegation** (nowhere to go → those slots hold).
4. Resolve `coin_reward` from `league_rewards` (podium bands) and pay it via the v1a
   `award_coins` ledger (`type = 'leaderboard'`, `reference_type = 'league_membership'`,
   `reference_id = membership.id`, description e.g. `"Gold League · #1 finish"`).
5. Seed next week's memberships (`week_start + 7`): move each member to their new tier
   and pack into divisions of the **target tier's** `division_size`
   (`CEIL(row_number_by_xp / division_size)`). New/returning users are **not** seeded
   here — `get_or_create_league_room` lazily enrols them into the bottom tier on first view.

Idempotency: keyed by `p_week_start`. If any row for the week already has a `final_rank`,
the function is a no-op, so a re-run never double-pays. (Verified against a synthetic
far-past week: ranks/results/payouts correct, second run paid nothing extra.)

Migrations: `…000017_v1b_close_league_week.sql` (function).

### Schedule (pg_cron)

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('close_league_week_weekly', '5 0 * * 1',
  $$SELECT public.close_league_week();$$);   -- 00:05 UTC every Monday
```

Migration `…000018_v1b_schedule_close_league_week.sql` installs the extension and
registers the job idempotently (unschedules any same-named job first). Manual fallback
if `CREATE EXTENSION` is gated: enable **pg_cron** in the Supabase dashboard and re-run
the `cron.schedule` block, or invoke `SELECT public.close_league_week();` by hand on
Mondays.

## Phased rollout

**Phase 0 — XP-only live board (no leagues yet)**
- Switch the board metric to XP (weekly = summed `test_points_earned`; all-time =
  `lifetime_xp`), global across languages. Update `get_leaderboard` to support an XP
  metric and a null/global language.
- Collapse the metric selector to the two period tabs (Weekly / All-time). Remove the
  three-metric selector and the streak metric **from this UI** (keep the streak RPC for
  `/streak`).
- Remove the mock fallback (`MOCK_USERS` / `useMockData`) and show a genuine empty/low-
  population state instead.

**Phase 1 — Leagues scaffolding**
- Add `leagues` + `league_memberships` tables and seed the tier ladder.
- Build the room-board RPC (members sharing `week_start`/`league_id`/`division`, ranked
  by live weekly XP). Render the league room in the Weekly tab.

**Phase 2 — Movement + coin payouts** ✅ done
- ~~Implement the weekly close job (promote/relegate 8/8, coin rewards, reseed).~~
  `close_league_week()` + pg_cron Mondays 00:05 UTC.
- ~~Add `coin_reward` bands per tier.~~ New `league_rewards` table, **podium-only**
  (#1–3) payouts seeded per tier.
- ~~Follow-up: rework the legacy cash "Weekly Leaderboard Rewards" banner in the UI to
  show the new coin podium bands.~~ Done — banner now reads the user's current league's
  podium bands from `getLeagueRewards()` (coins, amber styling). The legacy cash
  `leaderboard_rewards` table + admin tooling are untouched.

**Phase 3 — Unlock gate + trophy**
- Add `min_lessons_tested_to_join_leagues` config + `getDistinctLessonsTested`.
- Seed the `leagues_unlocked` achievement; gate the Weekly tab with a locked/progress state.

**Phase 4 — Notifications + seasons**
- ~~Promotion/relegation/weekly-result notifications~~ — **Done.** `close_league_week`
  fires `league.promoted` / `league.relegated` / `league.reward` templates (migrations
  `…000003` + `…000004`); muteable via the `league` notification type.
- "Overtaken" toasts (infra already noted in analysis); later, season rollups.

## Open items / follow-ups

- ~~Confirm tier count and names~~ — **Locked: 6-tier Wood → Stone → Copper → Bronze → Silver → Gold.**
- ~~Decide coin reward amounts per tier/rank band.~~ — **Locked: podium-only (#1–3), seeded per tier (Wood 30/20/10 … Gold 200/130/65).**
- ~~Confirm migration of `leaderboard_rewards.reward_cents` → coins vs. a new table.~~ — **Locked: new `league_rewards` table; legacy `leaderboard_rewards` (cash) left in place for now, retire later.**
- ~~Rework the UI rewards banner from legacy cash bands to the coin podium bands.~~ — **Done.**

## UX / tech-debt follow-ups

- **Admin edit modals reset state via `useEffect` (extra render on open).** The admin
  CMS edit popups (`LeagueEditModal`, `LevelEditModal`, `AdminTipEditModal`,
  `AdminWordEditModal`, …) seed their form fields from the editing row inside a
  `useEffect`, which lints as `setState-within-an-effect` ("cascading renders"). Harmless
  in practice — the popup just renders once blank then once filled, imperceptibly, on open
  — and **left as-is for consistency** across all admin modals. Cleaner pattern: remount
  the modal with a React `key` (e.g. `key={editing?.id ?? "create"}`) so the `useState`
  initializers run fresh and the effect (and the warning) disappears. Worth doing as a
  single sweep across all the admin modals rather than one-off.

- **League unlock gate threshold vs. achievement progress denominator can drift.**
  Phase 3 gates the weekly Leagues tab (and enrolment, inside
  `get_or_create_league_room`) behind a "tested ≥ N distinct real lessons" check,
  where N comes from `platform_config.min_lessons_tested_to_join_leagues` (default
  3). The paired `leagues_unlocked` achievement stores its own
  `unlock_criteria.threshold` (also 3), which is what the `/trophies` progress bar
  uses as its denominator. These two are independent: if an admin changes the
  config, the gate moves but the achievement progress bar's `x / 3` denominator
  won't auto-track until the achievement's `unlock_criteria` is edited to match.
  Accepted for V1B — both ship at 3 and the config is not currently surfaced for
  admin editing. If the config becomes admin-editable, resolve the achievement
  denominator from the same config key (or a shared helper) instead of the static
  `unlock_criteria.threshold`.

- **League placement achievements (implemented) — minor representation choices.**
  The 10 placement trophies (`league_*_reached`, `league_first_podium`,
  `league_first_win`, `league_wins_5`, `hall_of_fame_top20`, `alltime_champion`)
  are wired up via migrations `20260616000001`–`20260616000003`,
  `recordProgressAchievements` (Hall of Fame), and `resolveProgress`. Three accepted
  shortcuts:
  - `league_tier_reached` stores its target tier as `unlock_criteria.threshold`
    (not the draft's `tier_order` key) so it passes the shared `resolveProgress`
    threshold guard uniformly — the progress bar shows `highestTier / targetTier`.
  - `alltime_rank_reached` (Hall of Fame) is intentionally **binary** (no fill-up
    bar): a leaderboard rank doesn't map cleanly to a `current / threshold` strip,
    so those two rows just show Locked/Unlocked.
  - The A/B trophies' in-app notifications are fired by the SQL `unlock_achievement`
    path inside `close_league_week` (Monday cron). That path skips the `toast`
    channel — fine, since the user is offline when the weekly close runs, so the
    `in_app` notification is the meaningful delivery. Hall of Fame (C) fires in TS
    during the user's live session, so its toasts surface immediately.
