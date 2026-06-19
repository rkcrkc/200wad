-- ============================================================================
-- v1b Levels — notification type + level.promoted template
-- ============================================================================
--
-- Backs the rank-promotion notification fired from update_daily_activity when
-- a user's cached current_level increases. Mirrors the gamification seed
-- conventions (notification_types row for the prefix, install-only template
-- insert guarded by ON CONFLICT). {level_name} = the new rank's display name.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Widen the legacy notifications.type CHECK to admit the 'level' bucket
-- ----------------------------------------------------------------------------

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'achievement'::text,
    'admin'::text,
    'billing'::text,
    'coins'::text,
    'content'::text,
    'goal'::text,
    'learning'::text,
    'level'::text,
    'personal_best'::text,
    'reminder'::text,
    'streak'::text,
    'system'::text,
    'wordprogress'::text
  ]));

-- ----------------------------------------------------------------------------
-- 1. Notification type (prefix bucket so users can mute the category)
-- ----------------------------------------------------------------------------

INSERT INTO public.notification_types (type, label, description, enabled, sort_order)
VALUES
  ('level', 'Levels', 'Rank promotions as you climb the seniority ladder.', true, 110)
ON CONFLICT (type) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. level.promoted template
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
    'level.promoted',
    'Level up',
    'Fires from update_daily_activity when a user''s cached current_level increases (dual gate: lifetime_xp + lessons_mastered both cross a higher rank''s thresholds). {level_name} = the new rank''s display name.',
    'level',
    true,
    'Level up — {level_name}!',
    'You reached {level_name}. Keep climbing the ranks.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    'Level up!',
    'You reached {level_name}.'
  )
ON CONFLICT (key) DO NOTHING;
