-- ============================================================================
-- v1b Leagues (Phase 3) — leagues_unlocked achievement + notification template
-- ============================================================================
--
-- Fired by recordProgressAchievements once a user has tested >= N distinct real
-- lessons (default 3, same threshold as the weekly-leagues enrolment gate), i.e.
-- the moment weekly leagues become available to them.
--
-- Idempotency mirrors the existing seeds:
--   * achievements: ON CONFLICT (slug) DO UPDATE refreshes STRUCTURAL fields
--     only (title/description/category/tier/is_mystery/unlock_criteria/
--     display_order/updated_at). coin_reward/xp_reward/notification_template_key/
--     enabled are admin-editable and deliberately preserved on re-run.
--   * notification_templates: install-only ON CONFLICT (key) DO NOTHING.
--
-- The `achievement` notification type already exists (seeded in
-- 20260530000009), so no CHECK widening / notification_types insert is needed.
--
-- Tech-debt note: the gate threshold (platform_config
-- min_lessons_tested_to_join_leagues) and this achievement's
-- unlock_criteria.threshold both default to 3 but are independent. If an admin
-- changes the config, the trophies progress-bar denominator won't auto-track.
-- Documented in docs/V1B_LEADERBOARD_PLAN.md.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Achievement
-- ----------------------------------------------------------------------------

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
  (
    'leagues_unlocked',
    'Leagues unlocked',
    'Tested enough lessons to enter the weekly leagues.',
    'social',
    false,
    'bronze',
    25,
    0,
    'achievement.leagues_unlocked',
    '{"type":"lessons_tested","threshold":3}'::jsonb,
    10,
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
-- DELIBERATELY NOT in the SET list — those are admin-editable.

-- ----------------------------------------------------------------------------
-- 2. Notification template (per-slug; {count} = distinct lessons tested)
-- ----------------------------------------------------------------------------

INSERT INTO public.notification_templates (
  key,
  label,
  description,
  type,
  enabled,
  title,
  message,
  channels,
  default_data,
  toast_title,
  toast_message
)
VALUES
  (
    'achievement.leagues_unlocked',
    'Leagues unlocked',
    'Fires from recordProgressAchievements the first time a user has tested {count} distinct real lessons, opening weekly leagues. {coins} = coin reward.',
    'achievement',
    true,
    'Leagues unlocked!',
    'You''ve tested {count} lessons — weekly leagues are now open. Compete for coins!',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    'Leagues unlocked!',
    'Weekly leagues are now open. Compete for coins!'
  )
ON CONFLICT (key) DO NOTHING;
