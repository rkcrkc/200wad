-- ============================================================================
-- v1b Levels — rank ladder catalogue + cached users.current_level
-- ============================================================================
--
-- Cross-language seniority ranks driven by a DUAL GATE: a user holds the
-- highest level whose BOTH thresholds are cleared — lifetime_xp (cached on
-- users) AND lessons_mastered (count of user_lesson_progress rows in the
-- 'mastered' status, cross-language). Pure status, no coin payout.
--
-- Mirrors the shop_items / achievements catalogue pattern:
--   * admin-managed table, public read of enabled rows, writes via service role
--   * cached pointer on users (current_level) recomputed in update_daily_activity
--
-- v1b seeds a 6-tier English seniority ladder. All values (names, colours,
-- thresholds) are admin-editable in the CMS, and admins can add / delete tiers
-- — compute_user_level (next migration) reads the table dynamically.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. levels — catalogue
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Rank order. level_number 1 is the entry rank (thresholds 0/0) and is the
  -- floor every user holds. UNIQUE so ordering is unambiguous.
  level_number integer NOT NULL UNIQUE CHECK (level_number > 0),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  -- Hex colour for the rank badge, resolved client-side.
  color text NOT NULL DEFAULT '#9ca3af',
  -- Dual-gate thresholds. A user clears a level when lifetime_xp >= xp_threshold
  -- AND lessons_mastered >= lessons_mastered_threshold.
  xp_threshold integer NOT NULL DEFAULT 0 CHECK (xp_threshold >= 0),
  lessons_mastered_threshold integer NOT NULL DEFAULT 0
    CHECK (lessons_mastered_threshold >= 0),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS levels_number_idx
  ON public.levels (level_number)
  WHERE enabled = true;

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

-- Public read of enabled rows (mirrors "public read active shop items").
DROP POLICY IF EXISTS "public read enabled levels" ON public.levels;
CREATE POLICY "public read enabled levels"
  ON public.levels FOR SELECT
  USING (enabled = true);
-- Admin writes only via service role.

COMMENT ON TABLE public.levels IS
  'Admin-managed rank ladder. Cross-language seniority levels gated by lifetime_xp + lessons_mastered (dual gate). Public read of enabled rows; writes via service role. Pure status, no coin payout.';

-- ----------------------------------------------------------------------------
-- 2. users.current_level — cached rank pointer
-- ----------------------------------------------------------------------------
-- Defaults to 1 (the entry rank). Recomputed in update_daily_activity after
-- the lifetime_xp bump; backfilled for existing users in the next migration.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS current_level integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.users.current_level IS
  'Cached levels.level_number the user currently holds (dual-gate result). Recomputed by update_daily_activity / compute_user_level.';

-- ----------------------------------------------------------------------------
-- 3. Seed the 6-tier English seniority ladder
-- ----------------------------------------------------------------------------
-- Calibrated against live data (top user 27,261 XP / 63 lessons -> Master).
-- ON CONFLICT (slug) DO NOTHING — install-only, preserves admin edits on re-run.

INSERT INTO public.levels (
  level_number, slug, name, color, xp_threshold, lessons_mastered_threshold
)
VALUES
  (1, 'novice',      'Novice',      '#9ca3af',     0,  0),
  (2, 'apprentice',  'Apprentice',  '#00c950',   500,  3),
  (3, 'disciple',    'Disciple',    '#0b6cff',  2500, 10),
  (4, 'sensei',      'Sensei',      '#8b5cf6',  8000, 25),
  (5, 'master',      'Master',      '#f59e0b', 20000, 50),
  (6, 'grandmaster', 'Grandmaster', '#e2725b', 45000, 100)
ON CONFLICT (slug) DO NOTHING;
