-- ============================================================================
-- v1a Gamification — backfill `users.streak_freezes_available` launch grant
-- ============================================================================
--
-- One-token launch grant. Migration 1 added the column with `DEFAULT 1`, so
-- in normal circumstances every existing row at migration-1 time, and every
-- row inserted after, already holds the launch grant. This migration exists
-- as the explicit "intent" line of the v1a backfill plan — and as a recovery
-- path if some operations migration ever bulk-zeroes the column.
--
-- Idempotency contract
-- --------------------
-- `WHERE streak_freezes_available = 0` is the *only* guard. That means:
--
--   * Re-running this migration on a fresh DB (where everyone is already at
--     1 from migration 1's DEFAULT) is a clean no-op.
--
--   * Re-running it on a DB where users have legitimately consumed their
--     freezes (gameplay -> 0) WOULD regrant. We accept this exposure
--     because:
--       1. Supabase's migration tracker prevents accidental re-runs of an
--          already-applied migration in any given environment.
--       2. Adding a "has-ever-received-launch-grant" marker would create
--          a new column purely to defend against a scenario that
--          migration ordering already prevents.
--       3. If the grant ever needs to be re-administered intentionally
--          (e.g. a "give every active user a free freeze for an apology
--          incident"), it should be a separate, named migration, not a
--          re-run of this one.
--
-- Forward-looking note
-- --------------------
-- The "launch grant" semantically belongs to users that existed *before*
-- v1a Gamification shipped. Anyone created after migration 1 picks up the
-- same 1-token grant via the column's DEFAULT, so this backfill never
-- touches them. No date-bounded WHERE clause is needed — the DEFAULT does
-- that work upstream.
-- ============================================================================

UPDATE public.users
SET
  streak_freezes_available = 1,
  updated_at               = now()
WHERE streak_freezes_available = 0;

-- ----------------------------------------------------------------------------
-- Post-condition: no user should be at zero immediately after this runs.
-- (A user who legitimately spends their freeze later is fine — that's a
-- runtime concern, not a backfill invariant.)
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  v_zero_count integer;
BEGIN
  SELECT count(*) INTO v_zero_count
  FROM public.users
  WHERE streak_freezes_available = 0;

  IF v_zero_count > 0 THEN
    RAISE EXCEPTION
      'v1a backfill_streak_freeze_grant: % user(s) still at 0 after grant',
      v_zero_count;
  END IF;
END$$;
