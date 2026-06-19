-- ============================================================================
-- v1b Leagues — notification type + promotion/relegation/reward templates
-- ============================================================================
--
-- Backs the three notifications fired by close_league_week each Monday:
--   league.promoted  — moved up a tier
--   league.relegated — dropped a tier
--   league.reward    — earned podium coins
-- Mirrors the level notification seed (20260606000008): widen the legacy
-- notifications.type CHECK, add a notification_types bucket so users can mute the
-- category, then install-only template inserts guarded by ON CONFLICT.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Widen the legacy notifications.type CHECK to admit the 'league' bucket
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
    'league'::text,
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
  ('league', 'Leagues', 'Weekly league promotions, relegations, and coin rewards.', true, 120)
ON CONFLICT (type) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Templates
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
    'league.promoted',
    'League promotion',
    'Fires from close_league_week when a member finishes high enough to move up a tier. {league_name} = the destination tier, {rank} = their finishing rank.',
    'league',
    true,
    'Promoted to {league_name}!',
    'You finished #{rank} and moved up to {league_name} League.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    'Promoted to {league_name}!',
    'You finished #{rank} and moved up.'
  ),
  (
    'league.relegated',
    'League relegation',
    'Fires from close_league_week when a member finishes low enough to drop a tier. {league_name} = the destination tier, {rank} = their finishing rank.',
    'league',
    true,
    'Moved to {league_name}',
    'You finished #{rank} and dropped to {league_name} League — climb back next week.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    'Moved to {league_name}',
    'You finished #{rank} — climb back next week.'
  ),
  (
    'league.reward',
    'League coin reward',
    'Fires from close_league_week when a member finishes on the podium and earns coins. {coins} = coins earned, {rank} = finishing rank, {league_name} = the tier they finished in.',
    'league',
    true,
    'You earned {coins} coins!',
    'You finished #{rank} in {league_name} League and earned {coins} coins.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    'You earned {coins} coins!',
    'You finished #{rank} in {league_name} League.'
  )
ON CONFLICT (key) DO NOTHING;
