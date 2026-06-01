-- ============================================================================
-- v1a Gamification — achievements catalogue + user_achievements unlocks
-- ============================================================================
--
-- Adds the persistent achievement model. Distinct from the existing
-- `notifications` table, which only ever held one-shot achievement *messages*
-- (no catalogue, no unlock history, no rewards). The new pair:
--
--   * `achievements`         — admin-managed catalogue of every achievement
--                              the app can award. Seeded in a later migration
--                              (Batch A: existing trophy parity, Batch B: new
--                              v1a additions). Admin-editable from the new
--                              /admin/achievements page.
--   * `user_achievements`    — per-user unlock log: which achievement, when,
--                              and the coin_transactions row that paid the
--                              reward (if any). UNIQUE (user_id, achievement_id)
--                              gates the once-per-user contract.
--
-- Ordering: this migration runs after `coin_transactions` because
-- `user_achievements.coin_transaction_id` references it.
--
-- Mystery achievements
-- --------------------
-- `is_mystery = true` flags an achievement the user cannot see in the
-- catalogue until they unlock it. These show in a separate "Special / Mystery"
-- section of the trophies UI. The unlock_criteria column still defines the
-- trigger, but the UI hides title/description until user_achievements has a
-- matching row.
--
-- Declarative unlock_criteria (jsonb)
-- -----------------------------------
-- Unlocks are driven by typed JSON read by the `unlock_achievement` RPC
-- (migration 7). Shape examples:
--   { "type": "word_count", "metric": "learned",     "threshold": 1 }
--   { "type": "word_count", "metric": "mastered",    "threshold": 100 }
--   { "type": "day_streak",                          "threshold": 7 }
--   { "type": "perfect_session",                     "threshold": 1 }
--   { "type": "coin_balance",                        "threshold": 1000 }
--   { "type": "manual" }   -- admin / event-driven only, no auto-trigger
-- The schema is intentionally not constrained to a CHECK enum — adding a new
-- unlock type is a code change in `unlock_achievement` and a seed change in
-- this table, no migration needed.
--
-- Tier
-- ----
-- Optional bronze/silver/gold/platinum grouping for milestone families
-- (e.g. words-learned 10 / 100 / 500 / 1000). Surfaces as a badge frame
-- colour in the UI. NULL = standalone achievement, no tier.
--
-- Rewards
-- -------
-- coin_reward / xp_reward are integers, NOT NULL DEFAULT 0. The
-- unlock_achievement RPC reads these at unlock time and:
--   1. Calls award_coins to insert a coin_transactions row and bump
--      users.coin_balance. Stores the resulting row's id on
--      user_achievements.coin_transaction_id for audit.
--   2. Adds xp_reward to users.lifetime_xp directly (no XP ledger in v1a).
-- Editable in admin without code change.
--
-- notification_template_key
-- -------------------------
-- Optional FK-by-key to notification_templates. When set, unlock_achievement
-- fires `fireTemplateNotification(key, { user_id, achievement_id })` so the
-- bell entry / toast is admin-controlled in the same place as every other
-- notification. NULL = no notification (silent unlock, useful for some
-- mystery achievements).
--
-- Idempotency
-- -----------
-- CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / DO-block-guarded
-- CREATE POLICY for re-runnability.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Catalogue
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  icon text,
  category text NOT NULL
    CHECK (category IN ('progress', 'streak', 'mastery', 'social', 'special')),
  is_mystery boolean NOT NULL DEFAULT false,
  tier text
    CHECK (tier IS NULL OR tier IN ('bronze', 'silver', 'gold', 'platinum')),
  coin_reward integer NOT NULL DEFAULT 0 CHECK (coin_reward >= 0),
  xp_reward integer NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  notification_template_key text,
  unlock_criteria jsonb,
  display_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Catalogue listing by section, ordered. Partial on enabled to skip
-- archived/disabled rows in the trophies UI without an extra WHERE clause.
CREATE INDEX IF NOT EXISTS achievements_category_display_idx
  ON achievements (category, display_order)
  WHERE enabled = true;

-- ----------------------------------------------------------------------------
-- Per-user unlocks
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  coin_transaction_id uuid REFERENCES coin_transactions(id) ON DELETE SET NULL,
  UNIQUE (user_id, achievement_id)
);

-- Primary access: a user's unlocked achievements newest-first for the
-- profile / trophies UI.
CREATE INDEX IF NOT EXISTS user_achievements_user_unlocked_idx
  ON user_achievements (user_id, unlocked_at DESC);

-- Reverse lookup: "how many users have unlocked this achievement" for the
-- admin dashboard / rarity surfacing.
CREATE INDEX IF NOT EXISTS user_achievements_achievement_idx
  ON user_achievements (achievement_id);

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Catalogue: any authenticated/anon user can read enabled rows (so guests
-- can see the trophies they could earn). Disabled rows are admin-only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'achievements'
      AND policyname = 'achievements_select_enabled'
  ) THEN
    CREATE POLICY achievements_select_enabled
      ON achievements
      FOR SELECT
      USING (enabled = true);
  END IF;
END$$;

-- user_achievements: users read their own unlock rows. No client writes —
-- inserts are RPC-only via unlock_achievement (SECURITY DEFINER).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_achievements'
      AND policyname = 'user_achievements_select_own'
  ) THEN
    CREATE POLICY user_achievements_select_own
      ON user_achievements
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- ----------------------------------------------------------------------------
-- Table + column documentation
-- ----------------------------------------------------------------------------

COMMENT ON TABLE achievements IS
  'Admin-managed catalogue of every achievement the app can award. Seeded in a later migration with Batch A (parity with existing trophies) and Batch B (new v1a additions). Editable in /admin/achievements without code changes — including coin/xp rewards and unlock_criteria thresholds.';

COMMENT ON COLUMN achievements.slug IS
  'Stable identifier used in code (`unlockAchievement(''first_word_learned'')`). Never change a slug post-seed — change title/description/icon instead.';

COMMENT ON COLUMN achievements.category IS
  'Grouping for the trophies UI. progress=word-count milestones, streak=day/week streak, mastery=perfect sessions/lesson/course mastery, social=referrals/leaderboard, special=mystery achievements (always show in the Special / Mystery section regardless of is_mystery).';

COMMENT ON COLUMN achievements.is_mystery IS
  'True hides title/description from the catalogue UI until the user has unlocked it. The Special / Mystery trophies section reveals the contents on unlock. Useful for less-structured / surprise achievements.';

COMMENT ON COLUMN achievements.tier IS
  'Optional bronze/silver/gold/platinum grouping for milestone families (10/100/500/1000 words etc). Surfaces as a badge frame colour. NULL = standalone achievement.';

COMMENT ON COLUMN achievements.coin_reward IS
  'Coins granted on first-time unlock. Resolved by unlock_achievement (SECURITY DEFINER): writes a coin_transactions row of type ''achievement'' and stores its id on user_achievements.coin_transaction_id.';

COMMENT ON COLUMN achievements.xp_reward IS
  'Lifetime XP granted on first-time unlock. Applied directly to users.lifetime_xp by unlock_achievement (no XP ledger in v1a). Subject to the same raw / never-multiplied rule as test-earned XP.';

COMMENT ON COLUMN achievements.notification_template_key IS
  'Optional key in notification_templates. When set, unlock_achievement fires the named template (bell entry + optional toast) on unlock. NULL = silent unlock (useful for some mystery achievements).';

COMMENT ON COLUMN achievements.unlock_criteria IS
  'Declarative jsonb describing the unlock trigger, read by unlock_achievement. Shape varies by type: {"type":"word_count","metric":"learned","threshold":10}, {"type":"day_streak","threshold":7}, {"type":"perfect_session","threshold":1}, {"type":"coin_balance","threshold":1000}, {"type":"manual"}. Adding a new type is a code change in unlock_achievement + a seed change here — no migration.';

COMMENT ON COLUMN achievements.display_order IS
  'Sort order within a category for the trophies UI. Lower = earlier. Defaults to 0; seeds set explicit values per row.';

COMMENT ON COLUMN achievements.enabled IS
  'Disabled rows do not appear in the catalogue (RLS hides them from non-admin reads) and cannot be unlocked. Used to retire achievements without breaking historical user_achievements rows.';

COMMENT ON TABLE user_achievements IS
  'Per-user unlock log. UNIQUE (user_id, achievement_id) gates the once-per-user contract. Inserted exclusively by the unlock_achievement RPC (SECURITY DEFINER). coin_transaction_id ties the row to the coin reward that was paid, if any.';

COMMENT ON COLUMN user_achievements.coin_transaction_id IS
  'Optional pointer to the coin_transactions row that paid out coin_reward at unlock. NULL when the achievement had coin_reward=0 or when the coin row was later deleted (ON DELETE SET NULL preserves the unlock history).';
