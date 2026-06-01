-- ============================================================================
-- v1a Gamification — notification templates + types seed
-- ============================================================================
--
-- Adds the templates the new gamification surface fires:
--
--   * achievement.day_streak_milestone -- shared by all `streak_N` unlocks
--   * achievement.unlocked             -- generic fallback for mystery slugs
--   * streak.about_to_break / streak.broken / streak.frozen_today
--   * goal.daily_complete / goal.daily_50_percent
--   * coins.earned                     -- toast-only, client-rendered
--   * personal_best.day / personal_best.week / personal_best.session
--   * wordprogress.re_mastered
--
-- Five new notification_types rows back the new key prefixes (streak, goal,
-- personal_best, coins, wordprogress) so users can mute a whole category in
-- preferences without disabling individual templates.
--
-- Wiring step at the bottom
-- -------------------------
-- Migration 8 left `notification_template_key = NULL` on the eight `streak_*`
-- achievements and the nine Batch B mystery achievements because the templates
-- they reference didn't yet exist. This migration:
--   1. Creates those templates.
--   2. Wires the streak_* rows to `achievement.day_streak_milestone` (single
--      template, {title} substitution provides the "3-day streak" etc.)
--   3. Wires the mystery rows to `achievement.unlocked` (generic fallback).
-- Both wiring UPDATEs are guarded by `WHERE notification_template_key IS NULL`
-- so an admin pointing a row at a more specific template later is preserved
-- across re-runs.
--
-- Placeholder vocabulary
-- ----------------------
-- The active callers and the placeholders they pass (today, post-migration-7):
--   * unlock_achievement:
--       achievement.* -> {title}
--   * fire_notification_template (update_daily_activity):
--       streak.frozen_today    -> {days_frozen}
--       goal.daily_complete    -> {xp}, {goal}
--       personal_best.day      -> {points}
--       personal_best.week     -> {points}
-- Future callers (cron / complete_test_session refactor / spend RPCs) will
-- supply additional vars. Templates below use {placeholders} for the values
-- the caller will pass; any unsubstituted placeholder stays as literal text
-- in the rendered notification (acceptable in dev, caught in UAT).
--
-- Idempotency
-- -----------
-- ON CONFLICT (key) DO NOTHING for templates and ON CONFLICT (type) DO NOTHING
-- for types — the seed is install-only. If we need to push copy changes for an
-- existing row we'll do it in a dedicated migration (or an admin tweaks it in
-- the UI). Avoids stomping admin edits on re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Widen the legacy `notifications.type` CHECK
-- ----------------------------------------------------------------------------
-- The legacy schema constrained notifications.type to an enum-like CHECK over
-- 7 hard-coded buckets (system, billing, learning, reminder, achievement,
-- content, admin). The new gamification templates introduce five more types
-- (streak, goal, personal_best, coins, wordprogress) that fire_notification_
-- template would otherwise be blocked by. Drop the old CHECK and rebuild it
-- with the full set, sorted alphabetically.
--
-- Long-term we'll likely replace this CHECK with a FK to notification_types
-- so the type list is data-driven. v1a takes the cheaper widening route to
-- avoid coupling this seed migration to that schema change.

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
    'personal_best'::text,
    'reminder'::text,
    'streak'::text,
    'system'::text,
    'wordprogress'::text
  ]));

-- ----------------------------------------------------------------------------
-- 1. Notification types (must exist before templates reference them via prefix)
-- ----------------------------------------------------------------------------

INSERT INTO public.notification_types (type, label, description, enabled, sort_order)
VALUES
  ('streak',        'Streaks',        'Streak milestones, freezes, and at-risk nudges.',                  true,  60),
  ('goal',          'Daily goal',     'Daily XP goal completion and mid-day nudges.',                     true,  70),
  ('personal_best', 'Personal bests', 'New single-day, single-week, and best-session scores.',            true,  80),
  ('coins',         'Coins',          'Coin earn confirmations (toast-only; the bell shows the source).', true,  90),
  ('wordprogress',  'Word progress',  'Per-word progress moments (re-mastery, near-mastery, slipping).',  true, 100)
ON CONFLICT (type) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Notification templates
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
  -- --------------------------------------------------------------------------
  -- Achievement-driven (unlock_achievement substitutes {title} only)
  -- --------------------------------------------------------------------------

  (
    'achievement.day_streak_milestone',
    'Day streak milestone',
    'Shared template for every streak_N achievement unlock. {title} resolves to the achievement title (e.g. "3-day streak").',
    'streak',
    true,
    '{title}!',
    'Locked in a {title}. Coin reward added to your balance.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    '{title}!',
    'Streak milestone — coins added to your balance.'
  ),
  (
    'achievement.unlocked',
    'Achievement unlocked (generic)',
    'Generic fallback fired by unlock_achievement when an achievement has no per-slug template. Per-achievement keys (achievement.first_word_learned, etc.) take precedence.',
    'achievement',
    true,
    '{title}!',
    'Achievement unlocked: {title}.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    'Achievement unlocked',
    '{title}'
  ),

  -- --------------------------------------------------------------------------
  -- Streak (update_daily_activity + future cron)
  -- --------------------------------------------------------------------------

  (
    'streak.about_to_break',
    'Streak at risk',
    'Evening cron-driven nudge when the user hasn''t studied today and a streak >= 2 is at risk. {streak_days} = current streak length.',
    'streak',
    true,
    'Your streak is at risk',
    'You haven''t studied today. Even one word keeps your {streak_days}-day streak alive.',
    ARRAY['in_app']::text[],
    '{"cta":{"href":"/dashboard","label":"Study now"},"severity":"warning"}'::jsonb,
    NULL,
    NULL
  ),
  (
    'streak.broken',
    'Streak broken',
    'Fires on first activity after a streak break (gap exceeded available freezes). {previous_streak} = the length the streak hit before breaking.',
    'streak',
    true,
    'Streak broken',
    'Your {previous_streak}-day streak ended. Start a new one today.',
    ARRAY['in_app']::text[],
    '{"cta":{"href":"/dashboard","label":"Start fresh"},"severity":"info"}'::jsonb,
    NULL,
    NULL
  ),
  (
    'streak.frozen_today',
    'Streak frozen',
    'Fires from update_daily_activity when streak freeze(s) were auto-consumed to preserve the user''s streak across an inactive gap. {days_frozen} = number of freezes used.',
    'streak',
    true,
    'Streak protected',
    'We used {days_frozen} streak freeze(s) to keep your run alive.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    'Streak protected',
    'Used {days_frozen} freeze(s) to keep your run alive.'
  ),

  -- --------------------------------------------------------------------------
  -- Daily goal (update_daily_activity + future cron)
  -- --------------------------------------------------------------------------

  (
    'goal.daily_complete',
    'Daily goal complete',
    'Fires from update_daily_activity the first time the user crosses their daily XP goal today (cross-language total). {xp} = today''s total, {goal} = configured daily_xp_goal.',
    'goal',
    true,
    'Daily goal complete!',
    'You hit your daily XP goal ({xp}/{goal}). Coins added to your balance.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    'Daily goal complete!',
    '{xp}/{goal} XP — coins added.'
  ),
  (
    'goal.daily_50_percent',
    'Halfway to daily goal',
    'Optional mid-day cron nudge when the user crosses 50% of their daily XP goal. Disabled-friendly: admins can mute via enabled=false. {percent} = computed percentage.',
    'goal',
    true,
    'Halfway there',
    'You''re {percent}% of the way to today''s XP goal.',
    ARRAY['in_app']::text[],
    '{"severity":"info"}'::jsonb,
    NULL,
    NULL
  ),

  -- --------------------------------------------------------------------------
  -- Coins (client-side toast only; persistence is the coin_transactions row)
  -- --------------------------------------------------------------------------

  (
    'coins.earned',
    'Coins earned',
    'Client-rendered toast surfaced when award_coins emits a positive ledger row. Channels = [toast] only — no in_app row, persistence is the coin_transactions row itself. {amount} = coin delta, {description} = the award reason.',
    'coins',
    true,
    'Coins earned',
    '+{amount} coins.',
    ARRAY['toast']::text[],
    '{"severity":"info"}'::jsonb,
    '+{amount} coins',
    '{description}'
  ),

  -- --------------------------------------------------------------------------
  -- Personal bests (update_daily_activity + future complete_test_session)
  -- --------------------------------------------------------------------------

  (
    'personal_best.day',
    'Personal best — single day',
    'Fires from update_daily_activity when a new single-day XP total beats the previous pb_day_test_points (only when the previous PB was on a different day, to avoid same-day spam). {points} = today''s total XP.',
    'personal_best',
    true,
    'New personal best!',
    'Most XP in a single day: {points}. Beat yesterday-you.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    'New day PB!',
    '{points} XP today — new record.'
  ),
  (
    'personal_best.week',
    'Personal best — single week',
    'Fires from update_daily_activity when a new ISO-week XP total beats pb_week_test_points (gated to once-per-week via week-start comparison). {points} = this week''s total XP.',
    'personal_best',
    true,
    'New weekly best!',
    'Most XP in a single week: {points}.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    'New week PB!',
    '{points} XP this week — new record.'
  ),
  (
    'personal_best.session',
    'Personal best — session score',
    'Fires from complete_test_session (future wiring) when a session score percent beats pb_session_score_percent. {score_percent} = the new best.',
    'personal_best',
    true,
    'Best test ever',
    'You scored {score_percent}% — your highest yet.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    'New session PB',
    '{score_percent}% — best yet.'
  ),

  -- --------------------------------------------------------------------------
  -- Word progress (one-off — re-mastery moment, future wiring)
  -- --------------------------------------------------------------------------

  (
    'wordprogress.re_mastered',
    'Word re-mastered',
    'Fires when a previously-mastered word returns to mastered after slipping back to learned (correct_streak hits 3 again). Drives the Phoenix mystery achievement. {word_headword} = the re-mastered word.',
    'wordprogress',
    true,
    'Re-mastered!',
    'You re-mastered {word_headword}. Welcome back, old friend.',
    ARRAY['in_app']::text[],
    '{"severity":"info"}'::jsonb,
    NULL,
    NULL
  )

ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Wire migration-8 achievement rows to the templates that now exist
-- ----------------------------------------------------------------------------
-- Migration 8 left these NULL because the templates didn't yet exist. Guard
-- on `IS NULL` so an admin retarget (e.g. pointing comeback_kid at a future
-- achievement.comeback_kid template) survives re-runs of this migration.

UPDATE public.achievements
SET notification_template_key = 'achievement.day_streak_milestone',
    updated_at = now()
WHERE slug LIKE 'streak\_%' ESCAPE '\'
  AND notification_template_key IS NULL;

UPDATE public.achievements
SET notification_template_key = 'achievement.unlocked',
    updated_at = now()
WHERE category = 'special'
  AND notification_template_key IS NULL;
