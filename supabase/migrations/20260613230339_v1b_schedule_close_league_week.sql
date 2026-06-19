-- v1b schedule: run close_league_week() automatically each week via pg_cron.
--
-- close_league_week() defaults p_week_start to the PREVIOUS ISO week, so running
-- it just after the Monday boundary closes the week that just ended. We schedule
-- Mondays 00:05 UTC. The job is idempotent (close_league_week no-ops if the week
-- is already closed), so an occasional double-fire never double-pays.
--
-- If your environment cannot CREATE EXTENSION pg_cron from a migration (some
-- managed setups gate this behind the dashboard), enable the "pg_cron" extension
-- in the Supabase dashboard (Database > Extensions) and then re-run just the
-- cron.schedule block below. As a manual fallback you can also invoke
-- `SELECT public.close_league_week();` by hand each Monday.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Re-schedule idempotently: drop any existing job of the same name first.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'close_league_week_weekly') THEN
    PERFORM cron.unschedule('close_league_week_weekly');
  END IF;

  PERFORM cron.schedule(
    'close_league_week_weekly',
    '5 0 * * 1',                 -- 00:05 UTC every Monday
    $cron$SELECT public.close_league_week();$cron$
  );
END;
$$;
