-- ============================================================================
-- v1a Gamification — achievements catalogue seed
-- ============================================================================
--
-- Seeds the `achievements` catalogue with two batches:
--
--   Batch A — port of the existing trophy set. Slugs match the keys the legacy
--     notification firing path already uses, so once `unlock_achievement` is
--     wired into the equivalent code paths the notification log + new
--     `user_achievements` rows stay in sync. `notification_template_key` is
--     pointed at the per-slug templates that already exist in the
--     `notification_templates` table.
--
--   Batch B — new v1a achievements. Eight `streak_<N>` rows are the ones
--     `update_daily_activity` (migration 7) is already calling
--     `unlock_achievement` for at every streak step. Nine mystery achievements
--     in the `special` category land disabled-equivalent (template key NULL)
--     because their notification templates ship in migration 9.
--
-- Slug pattern: `streak_<N>` (NOT `day_streak_<N>` as the early draft of the
-- plan doc suggested). The applied `update_daily_activity` looks up that exact
-- pattern; the catalogue has to match.
--
-- Idempotency
-- -----------
-- ON CONFLICT (slug) DO UPDATE refreshes STRUCTURAL fields:
--   title, description, category, tier, is_mystery, unlock_criteria, display_order
--   icon, updated_at
-- Preserves ADMIN-EDITABLE fields:
--   coin_reward, xp_reward, notification_template_key, enabled
-- so re-running the migration after an admin tweak doesn't blow their changes
-- away. If we ever need to forcibly reset rewards we'll do it via a dedicated
-- one-shot migration, not by re-running this seed.
--
-- Display order
-- -------------
-- Per-category, lower = earlier in the trophies UI. Round numbers in steps of
-- 10 so we can slot future achievements between existing rows without a
-- renumber.
--
-- unlock_criteria shapes
-- ----------------------
-- These are READ by code, not enforced by SQL. Shapes correspond to the
-- branches `unlock_achievement`'s callers know about. New shapes are added by
-- code change + this seed change — no migration to widen a CHECK constraint.
-- ============================================================================

INSERT INTO public.achievements (
  slug,
  title,
  description,
  category,
  is_mystery,
  tier,
  coin_reward,
  xp_reward,
  notification_template_key,
  unlock_criteria,
  display_order,
  enabled
)
VALUES
  -- ==========================================================================
  -- Batch A — existing trophy port
  -- ==========================================================================

  -- Progress: word + lesson count milestones
  (
    'first_word_learned',
    'First word learned',
    'You learned your first word!',
    'progress',
    false,
    'bronze',
    10,
    0,
    'achievement.first_word_learned',
    '{"type":"word_count","metric":"learned","threshold":1}'::jsonb,
    10,
    true
  ),
  (
    'words_mastered_25',
    '25 words mastered',
    'You''ve mastered 25 words. Keep going.',
    'progress',
    false,
    'bronze',
    25,
    0,
    'achievement.words_mastered_milestone',
    '{"type":"word_count","metric":"mastered","threshold":25}'::jsonb,
    20,
    true
  ),
  (
    'words_mastered_50',
    '50 words mastered',
    'Halfway to the first hundred.',
    'progress',
    false,
    'bronze',
    50,
    0,
    'achievement.words_mastered_milestone',
    '{"type":"word_count","metric":"mastered","threshold":50}'::jsonb,
    30,
    true
  ),
  (
    'words_mastered_100',
    '100 words mastered',
    'A solid foundation.',
    'progress',
    false,
    'silver',
    100,
    0,
    'achievement.words_mastered_milestone',
    '{"type":"word_count","metric":"mastered","threshold":100}'::jsonb,
    40,
    true
  ),
  (
    'words_mastered_200',
    '200 words mastered',
    'You''re on the way to fluency.',
    'progress',
    false,
    'gold',
    250,
    0,
    'achievement.words_mastered_milestone',
    '{"type":"word_count","metric":"mastered","threshold":200}'::jsonb,
    50,
    true
  ),
  (
    'words_mastered_500',
    '500 words mastered',
    'You can hold a conversation.',
    'progress',
    false,
    'platinum',
    500,
    0,
    'achievement.words_mastered_milestone',
    '{"type":"word_count","metric":"mastered","threshold":500}'::jsonb,
    60,
    true
  ),
  (
    'lessons_complete_5',
    '5 lessons complete',
    'Five lessons down.',
    'progress',
    false,
    'bronze',
    25,
    0,
    'achievement.lessons_complete_milestone',
    '{"type":"lesson_count","metric":"mastered","threshold":5}'::jsonb,
    70,
    true
  ),
  (
    'lessons_complete_10',
    '10 lessons complete',
    'Double digits.',
    'progress',
    false,
    'bronze',
    50,
    0,
    'achievement.lessons_complete_milestone',
    '{"type":"lesson_count","metric":"mastered","threshold":10}'::jsonb,
    80,
    true
  ),
  (
    'lessons_complete_25',
    '25 lessons complete',
    'A quarter century of lessons.',
    'progress',
    false,
    'silver',
    150,
    0,
    'achievement.lessons_complete_milestone',
    '{"type":"lesson_count","metric":"mastered","threshold":25}'::jsonb,
    90,
    true
  ),
  (
    'lessons_complete_50',
    '50 lessons complete',
    'A serious commitment.',
    'progress',
    false,
    'gold',
    300,
    0,
    'achievement.lessons_complete_milestone',
    '{"type":"lesson_count","metric":"mastered","threshold":50}'::jsonb,
    100,
    true
  ),

  -- Mastery: first-time-only quality milestones
  (
    'first_word_mastered',
    'First word mastered',
    'Three perfect tests in a row. That word is yours.',
    'mastery',
    false,
    'bronze',
    25,
    0,
    'achievement.first_word_mastered',
    '{"type":"word_count","metric":"mastered","threshold":1}'::jsonb,
    10,
    true
  ),
  (
    'first_perfect_test',
    'Perfect score',
    'Full marks on every question.',
    'mastery',
    false,
    'bronze',
    25,
    0,
    'achievement.first_perfect_test',
    '{"type":"perfect_session","threshold":1}'::jsonb,
    20,
    true
  ),
  (
    'first_lesson_mastered',
    'First lesson mastered',
    'Every word in a lesson, mastered.',
    'mastery',
    false,
    'silver',
    50,
    0,
    'achievement.first_lesson_complete',
    '{"type":"lesson_mastered","threshold":1}'::jsonb,
    30,
    true
  ),

  -- ==========================================================================
  -- Batch B — new v1a achievements
  -- ==========================================================================

  -- Streak milestones (slug pattern matches update_daily_activity's lookup)
  (
    'streak_3',
    '3-day streak',
    'Three days in a row.',
    'streak',
    false,
    'bronze',
    5,
    0,
    NULL,
    '{"type":"day_streak","threshold":3}'::jsonb,
    10,
    true
  ),
  (
    'streak_5',
    '5-day streak',
    'Working week complete.',
    'streak',
    false,
    'bronze',
    10,
    0,
    NULL,
    '{"type":"day_streak","threshold":5}'::jsonb,
    20,
    true
  ),
  (
    'streak_10',
    '10-day streak',
    'Ten days locked in.',
    'streak',
    false,
    'bronze',
    25,
    0,
    NULL,
    '{"type":"day_streak","threshold":10}'::jsonb,
    30,
    true
  ),
  (
    'streak_15',
    '15-day streak',
    'Half a month, no misses.',
    'streak',
    false,
    'silver',
    50,
    0,
    NULL,
    '{"type":"day_streak","threshold":15}'::jsonb,
    40,
    true
  ),
  (
    'streak_30',
    '30-day streak',
    'A full month of practice.',
    'streak',
    false,
    'silver',
    100,
    0,
    NULL,
    '{"type":"day_streak","threshold":30}'::jsonb,
    50,
    true
  ),
  (
    'streak_45',
    '45-day streak',
    'A month and a half.',
    'streak',
    false,
    'gold',
    200,
    0,
    NULL,
    '{"type":"day_streak","threshold":45}'::jsonb,
    60,
    true
  ),
  (
    'streak_60',
    '60-day streak',
    'Two months without a break.',
    'streak',
    false,
    'gold',
    300,
    0,
    NULL,
    '{"type":"day_streak","threshold":60}'::jsonb,
    70,
    true
  ),
  (
    'streak_90',
    '90-day streak',
    'A full quarter. Habit territory.',
    'streak',
    false,
    'platinum',
    500,
    0,
    NULL,
    '{"type":"day_streak","threshold":90}'::jsonb,
    80,
    true
  ),

  -- Mystery / special achievements (hidden until unlocked)
  (
    'night_owl',
    'Night owl',
    'Practiced between 11pm and 3am.',
    'special',
    true,
    NULL,
    25,
    0,
    NULL,
    '{"type":"test_completed_in_window","start_hour":23,"end_hour":3}'::jsonb,
    10,
    true
  ),
  (
    'early_bird',
    'Early bird',
    'Practiced between midnight and 6am.',
    'special',
    true,
    NULL,
    25,
    0,
    NULL,
    '{"type":"test_completed_in_window","start_hour":0,"end_hour":6}'::jsonb,
    20,
    true
  ),
  (
    'comeback_kid',
    'Comeback kid',
    'Returned after a week away.',
    'special',
    true,
    NULL,
    50,
    0,
    NULL,
    '{"type":"returned_after_inactive_days","threshold":7}'::jsonb,
    30,
    true
  ),
  (
    'perfectionist',
    'Perfectionist',
    'Ten perfect lessons in a row.',
    'special',
    true,
    NULL,
    100,
    0,
    NULL,
    '{"type":"consecutive_perfect_lessons","threshold":10}'::jsonb,
    40,
    true
  ),
  (
    'polyglot_starter',
    'Polyglot starter',
    'Completed lessons in two different languages.',
    'special',
    true,
    NULL,
    50,
    0,
    NULL,
    '{"type":"languages_with_lessons_completed","threshold":2}'::jsonb,
    50,
    true
  ),
  (
    'dedicated',
    'Dedicated',
    'Thirty lessons in a single language.',
    'special',
    true,
    NULL,
    100,
    0,
    NULL,
    '{"type":"lessons_completed_in_language","threshold":30}'::jsonb,
    60,
    true
  ),
  (
    'clean_sheet',
    'Clean sheet',
    'A perfect session — no clues, no mistakes.',
    'special',
    true,
    NULL,
    25,
    0,
    NULL,
    '{"type":"perfect_session_no_clues_no_mistakes"}'::jsonb,
    70,
    true
  ),
  (
    'phoenix',
    'Phoenix',
    'Re-mastered a word you''d slipped on.',
    'special',
    true,
    NULL,
    50,
    0,
    NULL,
    '{"type":"first_word_re_mastered"}'::jsonb,
    80,
    true
  ),
  (
    'goal_keeper_7',
    'Goal keeper',
    'Hit your daily XP goal seven days running.',
    'special',
    true,
    NULL,
    50,
    0,
    NULL,
    '{"type":"daily_goal_met_streak","threshold":7}'::jsonb,
    90,
    true
  )

ON CONFLICT (slug) DO UPDATE SET
  title           = EXCLUDED.title,
  description     = EXCLUDED.description,
  category        = EXCLUDED.category,
  is_mystery      = EXCLUDED.is_mystery,
  tier            = EXCLUDED.tier,
  unlock_criteria = EXCLUDED.unlock_criteria,
  display_order   = EXCLUDED.display_order,
  updated_at      = now();
-- NOTE: coin_reward, xp_reward, notification_template_key, enabled are
-- DELIBERATELY NOT in the SET list — those are admin-editable in
-- /admin/achievements and the seed must not stomp on them on re-run.
