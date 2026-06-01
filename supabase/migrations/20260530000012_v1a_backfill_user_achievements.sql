-- ============================================================================
-- v1a Gamification — backfill `user_achievements` from notification history
-- ============================================================================
--
-- Recreates the per-user unlock log from the existing `notifications` table,
-- which has been the de-facto trophy-state record up to v1a. Without this
-- backfill, every existing user would appear to have unlocked nothing in the
-- new `/achievements` page even though their bell still shows the historical
-- "First word learned!" / "25 words mastered!" / etc. messages.
--
-- Mapping rules
-- -------------
-- For each notification whose `data->>template_key` is a known achievement
-- template, derive the target catalogue row and INSERT a `user_achievements`
-- row for (user_id, achievement_id). Three flavours of mapping:
--
--   1. Per-slug template (template_key uniquely identifies the achievement):
--        * achievement.first_word_learned     -> first_word_learned
--        * achievement.first_word_mastered    -> first_word_mastered
--        * achievement.first_perfect_test     -> first_perfect_test
--        * achievement.first_lesson_complete  -> first_lesson_mastered
--      Matched by `achievements.notification_template_key = data->>template_key`
--      with the shared-template keys excluded so the join stays 1:1.
--
--   2. Shared `words_mastered_milestone` template (5 achievements share it).
--      Disambiguated by `data->>milestone` ("25", "50", "100", "200", "500"),
--      composing the target slug as `words_mastered_<milestone>`.
--
--   3. Shared `lessons_complete_milestone` template (4 achievements share it).
--      Same disambiguation pattern: slug = `lessons_complete_<milestone>`.
--
-- Two other shared templates exist (`achievement.day_streak_milestone`,
-- `achievement.unlocked`) but they only landed in migration 9, so no
-- historical notifications carry those keys. They naturally produce zero
-- rows here.
--
-- Templates that exist in `notification_templates` but are NOT linked to
-- any catalogue achievement (lesson_mastered, course_mastered, language_
-- mastered, word_mastered, word_almost_mastered — all per-instance events,
-- not catalogue trophies) won't match any achievement row in the JOIN and
-- silently drop out.
--
-- Why earliest notification, not latest
-- -------------------------------------
-- A user can have multiple notifications for the same achievement if there
-- was a redelivery or duplicate test run. Using `MIN(created_at)` makes
-- `user_achievements.unlocked_at` represent the actual moment they earned
-- it, not the most recent reminder.
--
-- No side effects
-- ---------------
-- Per the plan's backfill table, coins are forward-only — this migration
-- does NOT call `award_coins` and does NOT increment `lifetime_xp` from
-- achievement `xp_reward`. It writes ONLY `user_achievements` rows.
-- `coin_transaction_id` stays NULL on every backfilled row — the
-- ON DELETE SET NULL semantics in migration 4 cover that case explicitly.
-- Re-deriving real-money rewards from a past unlock would also need
-- per-user XP/lifetime adjustments that migration 10 has already done for
-- test-points; achievement-derived XP at this point in v1a is zero across
-- the catalogue, so the math holds.
--
-- Idempotency
-- -----------
-- INSERT ... ON CONFLICT (user_id, achievement_id) DO NOTHING.
-- Re-running this migration after a user has subsequently earned the same
-- achievement through the new RPC path is a clean no-op.
-- ============================================================================

WITH
historical_unlocks AS (
  -- 1. Per-slug templates: notification_template_key matches directly,
  --    excluding the shared-template keys that need disambiguation.
  SELECT
    n.user_id,
    a.id          AS achievement_id,
    n.created_at  AS unlocked_at
  FROM public.notifications n
  JOIN public.achievements a
    ON a.notification_template_key = n.data->>'template_key'
  WHERE n.data ? 'template_key'
    AND a.notification_template_key NOT IN (
      'achievement.words_mastered_milestone',
      'achievement.lessons_complete_milestone',
      'achievement.day_streak_milestone',
      'achievement.unlocked'
    )

  UNION ALL

  -- 2. Shared words-mastered milestone -> slug suffix from data->>milestone.
  SELECT
    n.user_id,
    a.id          AS achievement_id,
    n.created_at  AS unlocked_at
  FROM public.notifications n
  JOIN public.achievements a
    ON a.slug = 'words_mastered_' || (n.data->>'milestone')
  WHERE n.data->>'template_key' = 'achievement.words_mastered_milestone'
    AND n.data ? 'milestone'

  UNION ALL

  -- 3. Shared lessons-complete milestone -> slug suffix from data->>milestone.
  SELECT
    n.user_id,
    a.id          AS achievement_id,
    n.created_at  AS unlocked_at
  FROM public.notifications n
  JOIN public.achievements a
    ON a.slug = 'lessons_complete_' || (n.data->>'milestone')
  WHERE n.data->>'template_key' = 'achievement.lessons_complete_milestone'
    AND n.data ? 'milestone'
),
earliest AS (
  -- Collapse duplicates: pick the oldest notification per (user, achievement)
  -- so unlocked_at reflects the actual unlock moment, not a redelivery.
  SELECT user_id, achievement_id, MIN(unlocked_at) AS unlocked_at
  FROM historical_unlocks
  GROUP BY user_id, achievement_id
)
INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
SELECT user_id, achievement_id, unlocked_at
FROM earliest
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Sanity check: no spurious rows (catalogue or user FK violations would have
-- raised already, so we just confirm the row count came in plausible).
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  v_user_achievements_count integer;
  v_distinct_users integer;
BEGIN
  SELECT count(*),
         count(DISTINCT user_id)
  INTO v_user_achievements_count, v_distinct_users
  FROM public.user_achievements;

  RAISE NOTICE
    'v1a backfill_user_achievements: % unlocks across % distinct users post-backfill',
    v_user_achievements_count, v_distinct_users;
END$$;
