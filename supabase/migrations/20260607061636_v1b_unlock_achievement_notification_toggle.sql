-- ============================================================================
-- v1b — `unlock_achievement`: optional notification suppression
-- ============================================================================
--
-- Why
-- ---
-- v1a's runtime trophy path (`recordProgressAchievements`) fired achievement
-- NOTIFICATIONS but never called `unlock_achievement`, so word / lesson /
-- perfect-test trophies created no `user_achievements` row and credited no
-- coins. The fix routes those unlocks through this RPC.
--
-- But the RPC's built-in notification firing can't fully replace the existing
-- TypeScript notification path: the shared milestone templates use a `{count}`
-- placeholder that the RPC does not substitute (it only handles `{title}`),
-- and milestone idempotency relies on a `data->>milestone` stamp the RPC does
-- not attach. So we keep notifications firing from TS (correct `{count}` text)
-- and use this RPC purely to record the unlock + credit coins/XP.
--
-- To avoid double-notifying, this migration adds a `p_fire_notification`
-- parameter (DEFAULT true). Callers that already fire their own notification
-- pass `false`; everything else (e.g. `update_daily_activity`'s streak +
-- comeback unlocks) keeps the prior behaviour through the default.
--
-- Signature change
-- ----------------
-- The 2-arg form is DROPped and replaced by a 3-arg form whose third argument
-- defaults to true. Internal SQL callers using `unlock_achievement(uuid, text)`
-- resolve to the new function via the default at execution time (plpgsql
-- bodies bind callees at run time, not creation time), so no caller edits are
-- needed. The body is otherwise identical to migration 6 except for the
-- `AND p_fire_notification` guard on the notification block.
--
-- Security / grants unchanged: SECURITY DEFINER, search_path pinned, EXECUTE
-- service_role-only. The TS caller uses the service-role admin client.
-- ============================================================================

DROP FUNCTION IF EXISTS public.unlock_achievement(uuid, text);

CREATE OR REPLACE FUNCTION public.unlock_achievement(
  p_user_id uuid,
  p_achievement_slug text,
  p_fire_notification boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ach            RECORD;
  v_unlock_id      uuid;
  v_coin_tx_id     uuid;
  v_template       RECORD;
  v_type_enabled   boolean;
  v_data           jsonb;
  v_channel        text;
  v_title          text;
  v_message        text;
BEGIN
  -- ----- Input validation -------------------------------------------------

  IF p_achievement_slug IS NULL OR length(btrim(p_achievement_slug)) = 0 THEN
    RAISE EXCEPTION 'unlock_achievement: slug is required'
      USING ERRCODE = 'check_violation';
  END IF;

  -- ----- Look up the catalogue row ---------------------------------------

  SELECT
    id,
    slug,
    title,
    description,
    coin_reward,
    xp_reward,
    notification_template_key,
    enabled
  INTO v_ach
  FROM public.achievements
  WHERE slug = p_achievement_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unlock_achievement: no achievement with slug %', p_achievement_slug
      USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT v_ach.enabled THEN
    RAISE EXCEPTION 'unlock_achievement: achievement % is disabled', p_achievement_slug
      USING ERRCODE = 'check_violation';
  END IF;

  -- ----- Idempotent insert -----------------------------------------------

  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (p_user_id, v_ach.id)
  ON CONFLICT (user_id, achievement_id) DO NOTHING
  RETURNING id INTO v_unlock_id;

  IF v_unlock_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- ----- Coin reward ------------------------------------------------------

  IF v_ach.coin_reward > 0 THEN
    v_coin_tx_id := public.award_coins(
      p_user_id,
      v_ach.coin_reward,
      'achievement',
      'achievement',
      v_ach.id,
      format('Achievement unlocked: %s', v_ach.title)
    );

    UPDATE public.user_achievements
      SET coin_transaction_id = v_coin_tx_id
      WHERE id = v_unlock_id;
  END IF;

  -- ----- XP reward --------------------------------------------------------

  IF v_ach.xp_reward > 0 THEN
    UPDATE public.users
      SET lifetime_xp = lifetime_xp + v_ach.xp_reward
      WHERE id = p_user_id;
  END IF;

  -- ----- Notification firing ---------------------------------------------
  -- Skipped entirely when the caller opts out (p_fire_notification = false),
  -- e.g. recordProgressAchievements which fires its own richer notification.

  IF p_fire_notification AND v_ach.notification_template_key IS NOT NULL THEN
    SELECT
      key,
      type,
      enabled,
      title,
      message,
      channels,
      default_data
    INTO v_template
    FROM public.notification_templates
    WHERE key = v_ach.notification_template_key;

    IF FOUND AND v_template.enabled THEN
      SELECT COALESCE(enabled, true)
      INTO v_type_enabled
      FROM public.notification_types
      WHERE type = v_template.type;

      IF v_type_enabled IS NULL THEN
        v_type_enabled := true;
      END IF;

      IF v_type_enabled THEN
        v_data := COALESCE(v_template.default_data, '{}'::jsonb)
                  || jsonb_build_object(
                       'template_key',          v_template.key,
                       'achievement_slug',      v_ach.slug,
                       'achievement_id',        v_ach.id,
                       'user_achievement_id',   v_unlock_id
                     );

        v_title := regexp_replace(v_template.title, '\{title\}', v_ach.title, 'g');
        v_message := regexp_replace(v_template.message, '\{title\}', v_ach.title, 'g');

        FOREACH v_channel IN ARRAY v_template.channels
        LOOP
          IF v_channel <> 'toast' THEN
            INSERT INTO public.notifications (
              user_id,
              channel,
              type,
              title,
              message,
              data,
              is_read
            )
            VALUES (
              p_user_id,
              v_channel,
              v_template.type,
              v_title,
              v_message,
              v_data,
              false
            );
          END IF;
        END LOOP;
      END IF;
    END IF;
  END IF;

  RETURN v_unlock_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- Execution privileges (mirrors migration 6: service_role only)
-- ----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION
  public.unlock_achievement(uuid, text, boolean)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.unlock_achievement(uuid, text, boolean)
  TO service_role;

-- ----------------------------------------------------------------------------
-- Documentation
-- ----------------------------------------------------------------------------

COMMENT ON FUNCTION
  public.unlock_achievement(uuid, text, boolean)
IS
  'Idempotent achievement unlock. On first call: inserts user_achievements row, optionally calls award_coins (coin_reward > 0) and links the coin_transactions.id, optionally bumps users.lifetime_xp (xp_reward > 0), and — when p_fire_notification is true (default) — fires the linked notification template. Pass p_fire_notification = false to credit the unlock without notifying (caller fires its own notification). Re-call for the same (user, slug) returns NULL and does nothing. SECURITY DEFINER; EXECUTE restricted to service_role.';
