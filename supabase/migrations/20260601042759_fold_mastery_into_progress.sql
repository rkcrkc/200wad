-- ============================================================================
-- v1a Gamification — fold mastery achievements into the progress category
-- ============================================================================
--
-- The original seed split achievements between 'progress' (count milestones)
-- and 'mastery' (first-time quality milestones). The trophies UI now renders
-- a single milestone arc, so the three mastery rows move into 'progress'
-- with display_order values that interleave them with the related counters:
--
--   first_word_mastered    → display_order 15 (between first_word_learned
--                            and words_mastered_25)
--   first_lesson_mastered  → display_order 65 (just before lessons_complete_5)
--   first_perfect_test     → display_order 110 (after all lesson milestones)
--
-- The seed file (`20260530000008_v1a_seed_achievements.sql`) has been updated
-- to match so a fresh install lands in the new shape; this migration covers
-- the live row updates. The `mastery` category value is left in the schema
-- CHECK constraint untouched — no schema change needed, just data.
--
-- Idempotent: trivially safe to re-run (fixed values, no inserts).
-- ============================================================================

UPDATE public.achievements
SET category      = 'progress',
    display_order = 15,
    updated_at    = now()
WHERE slug = 'first_word_mastered';

UPDATE public.achievements
SET category      = 'progress',
    display_order = 65,
    updated_at    = now()
WHERE slug = 'first_lesson_mastered';

UPDATE public.achievements
SET category      = 'progress',
    display_order = 110,
    updated_at    = now()
WHERE slug = 'first_perfect_test';
