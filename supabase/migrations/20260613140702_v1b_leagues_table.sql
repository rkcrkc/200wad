-- v1b leagues: the tier catalogue for the XP league competition.
--
-- Mirrors the `levels` catalogue pattern: admin-managed rows, public-readable
-- when enabled, driven by an admin-set hex `color`. `tier_order` ascends with
-- prestige (1 = bottom / entry tier). The bottom two tiers use humble materials
-- (Wood, Stone) that read as "starting out / slipped"; the ladder then climbs the
-- precious-metal run Copper -> Bronze -> Silver -> Gold.
--
-- Room size + symmetric promote/relegate counts live per-tier so admins can tune
-- individual tiers (defaults 30 / 8 / 8). See docs/V1B_LEADERBOARD_PLAN.md.

CREATE TABLE IF NOT EXISTS public.leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_order integer NOT NULL UNIQUE CHECK (tier_order > 0),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#9ca3af',
  division_size integer NOT NULL DEFAULT 30 CHECK (division_size > 0),
  promote_count integer NOT NULL DEFAULT 8 CHECK (promote_count >= 0),
  relegate_count integer NOT NULL DEFAULT 8 CHECK (relegate_count >= 0),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. guests) can read the enabled ladder for badge/labels. Writes are
-- service-role only (no write policy => RLS denies anon/auth writes).
DROP POLICY IF EXISTS "public read enabled leagues" ON public.leagues;
CREATE POLICY "public read enabled leagues"
  ON public.leagues FOR SELECT USING (enabled = true);

-- Locked 6-tier ladder (bottom -> top).
INSERT INTO public.leagues (tier_order, slug, name, color) VALUES
  (1, 'wood',   'Wood',   '#8b5e3c'),
  (2, 'stone',  'Stone',  '#78716c'),
  (3, 'copper', 'Copper', '#b87333'),
  (4, 'bronze', 'Bronze', '#cd7f32'),
  (5, 'silver', 'Silver', '#9ca3af'),
  (6, 'gold',   'Gold',   '#f59e0b')
ON CONFLICT (slug) DO NOTHING;
