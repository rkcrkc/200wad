-- v1b league_rewards: per-tier coin payout bands for weekly placement.
--
-- Podium-only, mirroring Duolingo (coins to the top 3 of each room; promotion up
-- the ladder is its own reward for the rest of the top 8). Amounts scale up per
-- tier and are admin-tunable. Kept separate from the legacy cash
-- `leaderboard_rewards` table (reward_cents), which can be retired later.

CREATE TABLE IF NOT EXISTS public.league_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  -- Inclusive finishing-rank band within the room.
  rank_min integer NOT NULL CHECK (rank_min > 0),
  rank_max integer NOT NULL CHECK (rank_max >= rank_min),
  coin_reward integer NOT NULL DEFAULT 0 CHECK (coin_reward >= 0),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, rank_min, rank_max)
);

ALTER TABLE public.league_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read enabled league rewards" ON public.league_rewards;
CREATE POLICY "public read enabled league rewards"
  ON public.league_rewards FOR SELECT USING (enabled = true);

-- Seed podium bands (#1 / #2 / #3) per tier, scaling up roughly 1.4-1.5x per tier.
INSERT INTO public.league_rewards (league_id, rank_min, rank_max, coin_reward)
SELECT l.id, b.rank_min, b.rank_max, b.coin_reward
FROM public.leagues l
JOIN (
  VALUES
    ('wood',   1, 1, 30),  ('wood',   2, 2, 20),  ('wood',   3, 3, 10),
    ('stone',  1, 1, 45),  ('stone',  2, 2, 30),  ('stone',  3, 3, 15),
    ('copper', 1, 1, 65),  ('copper', 2, 2, 45),  ('copper', 3, 3, 20),
    ('bronze', 1, 1, 95),  ('bronze', 2, 2, 60),  ('bronze', 3, 3, 30),
    ('silver', 1, 1, 140), ('silver', 2, 2, 90),  ('silver', 3, 3, 45),
    ('gold',   1, 1, 200), ('gold',   2, 2, 130), ('gold',   3, 3, 65)
) AS b(slug, rank_min, rank_max, coin_reward) ON b.slug = l.slug
ON CONFLICT (league_id, rank_min, rank_max) DO NOTHING;
