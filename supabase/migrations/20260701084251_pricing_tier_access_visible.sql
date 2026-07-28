-- BACKFILLED from supabase_migrations.schema_migrations (version 20260701084251).
-- Applied directly to the remote DB and never committed, so a `supabase db reset`
-- would have produced a pricing_tier_copy table missing the access_visible column.
-- Recovered verbatim from the ledger; already applied, so `db push` skips it.

ALTER TABLE pricing_tier_copy
  ADD COLUMN IF NOT EXISTS access_visible boolean NOT NULL DEFAULT true;

UPDATE pricing_tier_copy SET access_visible = false;
