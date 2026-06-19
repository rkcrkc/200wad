-- ============================================================================
-- v1b Leaderboard — get_league_achievement_stats (progress-bar backing RPC)
-- ============================================================================
--
-- Backs the /trophies progress bars for the league placement achievements in
-- a single round-trip:
--
--   * highest_tier_order — MAX tier_order the user has ever been a member of
--     (drives the league_*_reached "Reached the X League" bars).
--   * podium_finishes     — count of closed weeks finished rank 1-3
--     (drives league_first_podium).
--   * wins                — count of closed weeks finished rank 1
--     (drives league_first_win / league_wins_5).
--
-- final_rank is set only on closed weeks, so podium/win counts auto-exclude the
-- in-progress week. highest_tier_order counts any membership row (including the
-- current open week), so the tier bar reflects the user's newly-settled tier.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_league_achievement_stats(p_user_id uuid)
RETURNS TABLE(highest_tier_order int, podium_finishes int, wins int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT
    COALESCE((SELECT MAX(l.tier_order) FROM league_memberships m
              JOIN leagues l ON l.id = m.league_id WHERE m.user_id = p_user_id), 0),
    (SELECT COUNT(*) FROM league_memberships m
     WHERE m.user_id = p_user_id AND m.final_rank BETWEEN 1 AND 3)::int,
    (SELECT COUNT(*) FROM league_memberships m
     WHERE m.user_id = p_user_id AND m.final_rank = 1)::int
$$;

GRANT EXECUTE ON FUNCTION public.get_league_achievement_stats(uuid) TO authenticated, service_role;
