-- ============================================================================
-- v1a Gamification — split progress and mastery categories by unit type
-- ============================================================================
--
-- Replaces the short-lived "everything under progress" arrangement (migration
-- 20260601000002) with a split based on the unit the achievement is about:
--
--   mastery (word-level):
--     first_word_learned        order 10
--     first_word_mastered       order 15
--     words_mastered_25         order 20
--     words_mastered_50         order 30
--     words_mastered_100        order 40
--     words_mastered_200        order 50
--     words_mastered_500        order 60
--     first_perfect_test        order 70
--
--   progress (lesson-level):
--     first_lesson_mastered     order  5
--     lessons_complete_5        order 70
--     lessons_complete_10       order 80
--     lessons_complete_25       order 90
--     lessons_complete_50       order 100
--
-- Seed (`20260530000008_v1a_seed_achievements.sql`) updated to match. This
-- migration covers the live row updates so the running DB reflects the new
-- split immediately.
--
-- Idempotent: fixed values, no inserts.
-- ============================================================================

-- Mastery category (word-related milestones)
UPDATE public.achievements
SET category = 'mastery', display_order = 10,  updated_at = now()
WHERE slug = 'first_word_learned';

UPDATE public.achievements
SET category = 'mastery', display_order = 15,  updated_at = now()
WHERE slug = 'first_word_mastered';

UPDATE public.achievements
SET category = 'mastery', display_order = 20,  updated_at = now()
WHERE slug = 'words_mastered_25';

UPDATE public.achievements
SET category = 'mastery', display_order = 30,  updated_at = now()
WHERE slug = 'words_mastered_50';

UPDATE public.achievements
SET category = 'mastery', display_order = 40,  updated_at = now()
WHERE slug = 'words_mastered_100';

UPDATE public.achievements
SET category = 'mastery', display_order = 50,  updated_at = now()
WHERE slug = 'words_mastered_200';

UPDATE public.achievements
SET category = 'mastery', display_order = 60,  updated_at = now()
WHERE slug = 'words_mastered_500';

UPDATE public.achievements
SET category = 'mastery', display_order = 70,  updated_at = now()
WHERE slug = 'first_perfect_test';

-- Progress category (lesson-related milestones)
UPDATE public.achievements
SET category = 'progress', display_order = 5,   updated_at = now()
WHERE slug = 'first_lesson_mastered';

-- lessons_complete_* rows are already 'progress' with the right display_order
-- but include them here for the audit trail / re-run idempotency.
UPDATE public.achievements
SET category = 'progress', display_order = 70,  updated_at = now()
WHERE slug = 'lessons_complete_5';

UPDATE public.achievements
SET category = 'progress', display_order = 80,  updated_at = now()
WHERE slug = 'lessons_complete_10';

UPDATE public.achievements
SET category = 'progress', display_order = 90,  updated_at = now()
WHERE slug = 'lessons_complete_25';

UPDATE public.achievements
SET category = 'progress', display_order = 100, updated_at = now()
WHERE slug = 'lessons_complete_50';
