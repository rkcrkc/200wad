-- BACKFILLED from supabase_migrations.schema_migrations (version 20260622225416).
-- This migration was applied directly to the remote DB and never committed, so a
-- `supabase db reset` would have produced a schema without the 'mn' gender value.
-- Recovered verbatim from the ledger; already applied, so `db push` skips it.

ALTER TABLE words DROP CONSTRAINT IF EXISTS words_gender_check;
ALTER TABLE words ADD CONSTRAINT words_gender_check
  CHECK (gender IS NULL OR gender = ANY (ARRAY['m'::text, 'f'::text, 'n'::text, 'mf'::text, 'mn'::text]));
