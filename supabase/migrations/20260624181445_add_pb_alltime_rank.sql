-- BACKFILLED from supabase_migrations.schema_migrations (version 20260624181445).
-- Applied directly to the remote DB and never committed, so a `supabase db reset`
-- would have produced a users table with no pb_alltime_rank column and no
-- track_alltime_rank_pb trigger. Recovered verbatim from the ledger; already
-- applied, so `db push` skips it.

-- Track each user's best-ever (lowest-number) position on the all-time,
-- all-language leaderboard (sorted by lifetime_xp). NULL = never ranked.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pb_alltime_rank integer;

COMMENT ON COLUMN public.users.pb_alltime_rank IS
  'Best-ever (lowest) rank held on the all-time, all-language XP leaderboard. NULL = never ranked. Maintained by track_alltime_rank_pb trigger.';

-- Recompute the user's current all-time rank whenever their lifetime_xp grows
-- and keep the minimum (best) seen. Captures each improvement at the moment the
-- user earns XP; others overtaking later only worsen the live rank, so the
-- best-ever is the min over the user's own activity points.
CREATE OR REPLACE FUNCTION public.track_alltime_rank_pb()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_rank bigint;
BEGIN
  SELECT COUNT(*) + 1 INTO v_rank
  FROM public.users u
  WHERE COALESCE(u.lifetime_xp, 0) > COALESCE(NEW.lifetime_xp, 0)
    AND u.id <> NEW.id;

  NEW.pb_alltime_rank := LEAST(COALESCE(NEW.pb_alltime_rank, v_rank), v_rank);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_alltime_rank_pb ON public.users;
CREATE TRIGGER trg_track_alltime_rank_pb
  BEFORE UPDATE OF lifetime_xp ON public.users
  FOR EACH ROW
  WHEN (COALESCE(NEW.lifetime_xp, 0) > COALESCE(OLD.lifetime_xp, 0))
  EXECUTE FUNCTION public.track_alltime_rank_pb();

-- Backfill existing ranked users (lifetime_xp > 0) with their current rank.
UPDATE public.users u
SET pb_alltime_rank = (
  SELECT COUNT(*) + 1
  FROM public.users u2
  WHERE COALESCE(u2.lifetime_xp, 0) > COALESCE(u.lifetime_xp, 0)
    AND u2.id <> u.id
)
WHERE COALESCE(u.lifetime_xp, 0) > 0;
