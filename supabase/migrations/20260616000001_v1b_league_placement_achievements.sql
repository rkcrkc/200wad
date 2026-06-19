-- ============================================================================
-- v1b Leaderboard — League placement achievements (10 social trophies)
-- ============================================================================
--
-- Wires up the drafted "placement" trophies (docs/V1B_LEADERBOARD_PLAN.md):
--
--   A. Climb the ladder  — 5 tier-reached trophies, fired by close_league_week
--      from the member's NEW tier after settlement.
--   B. Podium & wins      — 3 trophies, fired by close_league_week from the
--      cumulative league_memberships history.
--   C. Hall of Fame       — 2 all-time-XP-rank trophies, fired in TypeScript on
--      test completion (recordProgressAchievements).
--
-- Idempotency mirrors the existing seeds (20260615000007):
--   * achievements: ON CONFLICT (slug) DO UPDATE refreshes STRUCTURAL fields
--     only (title/description/category/is_mystery/tier/unlock_criteria/
--     display_order/updated_at). coin_reward/xp_reward/notification_template_key/
--     enabled are admin-editable and deliberately preserved on re-run.
--   * notification_templates: install-only ON CONFLICT (key) DO NOTHING.
--
-- The `achievement` notification type already exists (20260530000009), so no
-- CHECK widening / notification_types insert is needed.
--
-- Notes:
--   * unlock_criteria JSON drives ONLY the progress bars (resolveProgress); the
--     firing caller is hardcoded per the draft.
--   * league_tier_reached uses `threshold` (= target tier_order) rather than the
--     draft's `tier_order` key, so it passes the existing resolveProgress
--     threshold guard.
--   * A/B fire via the SQL unlock_achievement path (dedupes on user_achievements
--     UNIQUE (achievement_id), substitutes each row's {title}) -> shared
--     templates are safe. C fires via TS fireFirstTimeNotification (dedupes on
--     template_key), so the two C trophies need distinct keys.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Achievements
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
  -- A. Climb the ladder ------------------------------------------------------
  (
    'league_stone_reached',
    'Climbing',
    'Reached the Stone League.',
    'social',
    false,
    'bronze',
    25,
    0,
    'achievement.league_tier_reached',
    '{"type":"league_tier_reached","threshold":2}'::jsonb,
    20,
    true
  ),
  (
    'league_copper_reached',
    'Copper tier',
    'Reached the Copper League.',
    'social',
    false,
    'bronze',
    50,
    0,
    'achievement.league_tier_reached',
    '{"type":"league_tier_reached","threshold":3}'::jsonb,
    30,
    true
  ),
  (
    'league_bronze_reached',
    'Bronze tier',
    'Reached the Bronze League.',
    'social',
    false,
    'silver',
    75,
    0,
    'achievement.league_tier_reached',
    '{"type":"league_tier_reached","threshold":4}'::jsonb,
    40,
    true
  ),
  (
    'league_silver_reached',
    'Silver tier',
    'Reached the Silver League.',
    'social',
    false,
    'gold',
    150,
    0,
    'achievement.league_tier_reached',
    '{"type":"league_tier_reached","threshold":5}'::jsonb,
    50,
    true
  ),
  (
    'league_gold_reached',
    'Top of the world',
    'Reached the Gold League — the top tier.',
    'social',
    false,
    'platinum',
    400,
    0,
    'achievement.league_tier_reached',
    '{"type":"league_tier_reached","threshold":6}'::jsonb,
    60,
    true
  ),
  -- B. Podium & wins ---------------------------------------------------------
  (
    'league_first_podium',
    'On the podium',
    'Finished top 3 in your league.',
    'social',
    false,
    'bronze',
    50,
    0,
    'achievement.league_podium',
    '{"type":"league_podium_finishes","threshold":1}'::jsonb,
    70,
    true
  ),
  (
    'league_first_win',
    'League champion',
    'Finished #1 in your league.',
    'social',
    false,
    'silver',
    100,
    0,
    'achievement.league_win',
    '{"type":"league_wins","threshold":1}'::jsonb,
    80,
    true
  ),
  (
    'league_wins_5',
    'Dynasty',
    'Won your league five times.',
    'social',
    false,
    'gold',
    300,
    0,
    'achievement.league_win',
    '{"type":"league_wins","threshold":5}'::jsonb,
    90,
    true
  ),
  -- C. Hall of Fame ----------------------------------------------------------
  (
    'hall_of_fame_top20',
    'Hall of Fame',
    'Broke into the all-time top 20.',
    'social',
    false,
    'gold',
    200,
    0,
    'achievement.hall_of_fame_top20',
    '{"type":"alltime_rank_reached","threshold":20}'::jsonb,
    100,
    true
  ),
  (
    'alltime_champion',
    'World #1',
    'Reached #1 on the all-time leaderboard.',
    'social',
    false,
    'platinum',
    500,
    0,
    'achievement.alltime_champion',
    '{"type":"alltime_rank_reached","threshold":1}'::jsonb,
    110,
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
-- 2. Notification templates
-- ----------------------------------------------------------------------------
-- A/B trophies share templates per group; the unlock_achievement path
-- substitutes each row's {title} and {coins}. C trophies get distinct keys
-- (TS fireFirstTimeNotification dedupes on template_key).

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
    'achievement.league_tier_reached',
    'League tier reached',
    'Shared by the five league_*_reached achievements. Fired by close_league_week via unlock_achievement when a member settles into a new tier. {title} = achievement title, {coins} = coin reward.',
    'achievement',
    true,
    '{title}!',
    'You climbed the league ladder — {coins} coins added to your balance.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    '{title}!',
    'You climbed the league ladder — {coins} coins added.'
  ),
  (
    'achievement.league_podium',
    'League podium finish',
    'Fired by close_league_week via unlock_achievement for league_first_podium. {title} = achievement title, {coins} = coin reward.',
    'achievement',
    true,
    '{title}!',
    'Top-three finish — {coins} coins added.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    '{title}!',
    'Top-three finish — {coins} coins added.'
  ),
  (
    'achievement.league_win',
    'League win',
    'Shared by league_first_win and league_wins_5. Fired by close_league_week via unlock_achievement. {title} = achievement title, {coins} = coin reward.',
    'achievement',
    true,
    '{title}!',
    'You topped your league — {coins} coins added.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    '{title}!',
    'You topped your league — {coins} coins added.'
  ),
  (
    'achievement.hall_of_fame_top20',
    'Hall of Fame (top 20)',
    'Fired in TypeScript (recordProgressAchievements) when a user breaks into the all-time top 20 by XP. {title} = achievement title, {coins} = coin reward.',
    'achievement',
    true,
    '{title}!',
    'You broke into the all-time top 20 — {coins} coins added to your balance.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    '{title}!',
    'You broke into the all-time top 20 — {coins} coins added.'
  ),
  (
    'achievement.alltime_champion',
    'All-time champion (#1)',
    'Fired in TypeScript (recordProgressAchievements) when a user reaches #1 on the all-time XP leaderboard. {title} = achievement title, {coins} = coin reward.',
    'achievement',
    true,
    '{title}!',
    'You hit #1 on the all-time leaderboard — {coins} coins added to your balance.',
    ARRAY['in_app','toast']::text[],
    '{"severity":"info"}'::jsonb,
    '{title}!',
    'You hit #1 on the all-time leaderboard — {coins} coins added.'
  )
ON CONFLICT (key) DO NOTHING;
