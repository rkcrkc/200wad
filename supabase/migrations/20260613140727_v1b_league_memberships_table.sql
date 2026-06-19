-- v1b league_memberships: per-user, per-week room assignment.
--
-- The board a user sees is everyone sharing the same (week_start, league_id,
-- division). `xp_earned` is recomputed live during the week from
-- user_daily_activity; it's frozen at weekly close (Phase 2) alongside
-- `final_rank` / `result` / `coin_reward`. See docs/V1B_LEADERBOARD_PLAN.md.

CREATE TABLE IF NOT EXISTS public.league_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- ISO Monday of the competition week this row belongs to.
  week_start date NOT NULL,
  league_id uuid NOT NULL REFERENCES public.leagues(id),
  -- Room number within the tier (1..N).
  division integer NOT NULL CHECK (division > 0),
  -- Snapshot of weekly XP at close; live value is recomputed during the week.
  xp_earned integer NOT NULL DEFAULT 0,
  -- Set at weekly close (Phase 2).
  final_rank integer,
  result text CHECK (result IN ('promoted', 'relegated', 'held')),
  coin_reward integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS league_memberships_room_idx
  ON public.league_memberships (week_start, league_id, division);

ALTER TABLE public.league_memberships ENABLE ROW LEVEL SECURITY;

-- Read own row only; the room board is served via SECURITY DEFINER RPC so other
-- users' rows aren't directly exposed (same pattern as get_leaderboard).
DROP POLICY IF EXISTS "users read own membership" ON public.league_memberships;
CREATE POLICY "users read own membership"
  ON public.league_memberships FOR SELECT USING (auth.uid() = user_id);
