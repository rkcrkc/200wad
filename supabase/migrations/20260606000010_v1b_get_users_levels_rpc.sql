-- ============================================================================
-- v1b Levels — get_users_levels: batch rank lookup for leaderboard rows
-- ============================================================================
--
-- The leaderboard surfaces other users' ranks (belts) alongside their stats.
-- Direct reads of public.users are RLS-restricted to the caller's own row, so
-- — exactly like get_leaderboard — this resolver runs SECURITY DEFINER to read
-- the cached current_level for an arbitrary set of users and join the levels
-- catalogue for the badge name + colour.
--
-- Only public, non-sensitive rank data is returned (level number / name /
-- colour), so a public grant is safe and mirrors the public-read levels policy.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_users_levels(p_user_ids uuid[])
RETURNS TABLE (
  user_id      uuid,
  level_number integer,
  level_name   text,
  level_color  text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    u.id,
    u.current_level,
    l.name,
    l.color
  FROM public.users u
  LEFT JOIN public.levels l
    ON l.level_number = u.current_level
   AND l.enabled = true
  WHERE u.id = ANY(p_user_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_users_levels(uuid[])
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_users_levels(uuid[]) IS
  'Batch rank resolver for leaderboard rows. Returns each user''s cached current_level joined to the levels catalogue (name + colour) for the rank badge. SECURITY DEFINER to read across users (public, non-sensitive rank data), mirroring get_leaderboard.';
