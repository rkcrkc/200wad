-- v1b: give each league tier its own admin-editable emoji icon.
--
-- The community header previously hardcoded a single 🪵 for every tier. Add an
-- `icon` column to the catalogue (mirrors the admin-editable `color`) and seed a
-- distinct emoji per tier so each rung of the ladder reads differently. Admins
-- can change these afterwards from /admin/leagues.

ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '🪵';

-- Distinct emoji per tier (idempotent — only overwrites the seeded default).
UPDATE public.leagues SET icon = '🪵' WHERE slug = 'wood';
UPDATE public.leagues SET icon = '🪨' WHERE slug = 'stone';
UPDATE public.leagues SET icon = '🔶' WHERE slug = 'copper';
UPDATE public.leagues SET icon = '🥉' WHERE slug = 'bronze';
UPDATE public.leagues SET icon = '🥈' WHERE slug = 'silver';
UPDATE public.leagues SET icon = '🥇' WHERE slug = 'gold';
