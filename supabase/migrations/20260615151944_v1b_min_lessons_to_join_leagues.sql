-- ============================================================================
-- v1b Leagues — unlock gate config + distinct-lessons-tested count RPC
-- ============================================================================
--
-- Phase 3 gates the weekly Leagues tab behind a "tested >= N distinct real
-- lessons" requirement (default N = 3, global / cross-language). This migration
-- seeds the admin-editable threshold and a reusable count RPC consumed by:
--   * get_or_create_league_room   (enrolment gate — migration 6)
--   * recordProgressAchievements  (fire leagues_unlocked on test completion)
--   * getDistinctLessonsTested    (community page gate state)
--   * resolveProgress             (trophies progress bar)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Config threshold (admin-editable, install-only)
-- ----------------------------------------------------------------------------

INSERT INTO platform_config (key, value, description)
VALUES (
  'min_lessons_tested_to_join_leagues',
  '3'::jsonb,
  'Distinct real lessons a user must have tested before weekly leagues unlock.'
)
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Count RPC: distinct real lessons the user has tested
-- ----------------------------------------------------------------------------
-- `lesson_id IS NOT NULL` excludes auto-review virtual lessons (see
-- src/lib/queries/words.ts) so only real lesson tests count toward the gate.

CREATE OR REPLACE FUNCTION public.get_distinct_lessons_tested(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(DISTINCT ts.lesson_id)::int
  FROM test_sessions ts
  WHERE ts.user_id = p_user_id
    AND ts.lesson_id IS NOT NULL
    AND ts.taken_at IS NOT NULL
$$;

GRANT EXECUTE ON FUNCTION public.get_distinct_lessons_tested(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_distinct_lessons_tested(uuid) IS
  'Count of distinct real lessons (lesson_id NOT NULL, taken) the user has tested. Backs the weekly leagues unlock gate and the leagues_unlocked achievement. SECURITY DEFINER to read across the caller''s test_sessions.';
