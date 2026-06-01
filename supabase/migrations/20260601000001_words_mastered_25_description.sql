-- ============================================================================
-- v1a Gamification — update words_mastered_25 description
-- ============================================================================
--
-- The original seed (`20260530000008_v1a_seed_achievements.sql`) phrased this
-- as "You've mastered 25 words. Keep going.". The seed has been updated to
-- match the new copy, but the ON CONFLICT clause in the seed already covers
-- description on re-run, so this one-shot migration ensures the live row is
-- aligned without requiring a re-run of the parent seed.
--
-- Idempotent: trivially safe to re-run (sets to a fixed string).
-- ============================================================================

UPDATE public.achievements
SET description = '25 words mastered. Keep going.',
    updated_at  = now()
WHERE slug = 'words_mastered_25';
