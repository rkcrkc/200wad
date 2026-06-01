-- ============================================================================
-- v1a Gamification — `unlock_achievement` RPC
-- ============================================================================
--
-- Idempotent unlock helper. On first call for a (user, achievement) pair:
--
--   1. Insert `user_achievements` row.
--   2. If `achievement.coin_reward > 0`, call `award_coins` (which both
--      writes the ledger row and bumps `users.coin_balance`) and link the
--      returned `coin_transactions.id` back onto the unlock row.
--   3. If `achievement.xp_reward > 0`, add it directly to
--      `users.lifetime_xp`. There is no XP ledger in v1a — XP is otherwise
--      recomputable from `test_questions.points_earned`, but achievement XP
--      isn't, so this is the one place where lifetime_xp is bumped outside
--      of `update_daily_activity`.
--   4. If `achievement.notification_template_key` is set, fire that template
--      by inserting one `notifications` row per persisted channel. Mirrors
--      the gates and placeholder substitution of the TypeScript
--      `insertFromTemplate` helper so admin can disable a template / type
--      without code changes and disable an unlock notification without
--      blocking the unlock itself.
--
-- All four steps run inside the caller's transaction — partial application
-- is impossible.
--
-- Returns
-- -------
-- The new `user_achievements.id` on first unlock. NULL on re-unlock (the
-- UNIQUE(user_id, achievement_id) constraint silently absorbs the duplicate
-- via `ON CONFLICT DO NOTHING`).
--
-- Idempotency
-- -----------
-- A second call for the same (user, slug) is a guaranteed no-op:
--   * `INSERT … ON CONFLICT (user_id, achievement_id) DO NOTHING` returns no
--     row, the rest of the function short-circuits, and the caller sees
--     NULL.
--   * Coin / XP rewards are NOT re-applied.
--   * Notification is NOT re-fired.
-- This is the contract callers rely on — e.g. `complete_test_session` will
-- blind-fire unlock checks every session without needing its own
-- "already unlocked?" gate.
--
-- Disabled achievements
-- ---------------------
-- An achievement with `enabled = false` cannot be unlocked. The RPC raises
-- a check-violation error rather than silently no-op'ing so callers using
-- a known-good slug surface the misconfiguration loudly.
--
-- Unknown slug
-- ------------
-- Also raises (no-such-object). Callers should hard-code slugs from the
-- catalogue; a typo should fail fast in dev.
--
-- Notification firing
-- -------------------
-- The SQL path mirrors the gate order of `insertFromTemplate` exactly:
--   a. Template exists?      else skip (no-op)
--   b. Template enabled?     else skip
--   c. notification_types.enabled for template.type? else skip
--   d. For each channel in template.channels where channel != 'toast',
--      INSERT one notifications row.
--      (Toast is transient client-side; it never persists.)
-- Placeholder substitution uses the same `{varName}` syntax as the TS
-- helper. v1a substitutes nothing here (the slug-key templates don't carry
-- per-user variables) but the regex_replace pattern is in place so future
-- templates can use `{title}`, `{coin_reward}`, etc.
--
-- The `data` jsonb on each notifications row gets:
--   * The template's `default_data` (if any)
--   * `template_key` = the template's key   (matches TS helper behaviour)
--   * `achievement_slug` = the unlocked slug
--   * `achievement_id`   = the catalogue id
--   * `user_achievement_id` = the unlock row id
-- These are the fields downstream UI/idempotency checks may rely on.
--
-- Security
-- --------
-- SECURITY DEFINER + `SET search_path = public, pg_temp`. EXECUTE granted
-- only to service_role; revoked from PUBLIC + anon + authenticated. Other
-- SECURITY DEFINER functions that call this (e.g. complete_test_session,
-- update_daily_activity) run under their own definer role (postgres) and
-- bypass the grant gate.
--
-- This RPC also implicitly relies on the GRANT on `award_coins`. Both run
-- as postgres when called from another SECURITY DEFINER function, so the
-- internal cross-call works without server-role membership on the caller.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.unlock_achievement(
  p_user_id uuid,
  p_achievement_slug text
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
  -- No FOR UPDATE — the achievements row itself isn't being mutated; the
  -- INSERT below handles concurrent unlocks via the UNIQUE constraint.

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
  -- ON CONFLICT swallows the duplicate. If no row was produced, the user
  -- already has this achievement — short-circuit with NULL, leave coins /
  -- XP / notifications untouched.

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
  -- Direct write — no XP ledger in v1a. The CHECK(lifetime_xp >= 0) on
  -- users prevents drift; xp_reward is CHECK(>= 0) so the add is always
  -- non-decreasing.

  IF v_ach.xp_reward > 0 THEN
    UPDATE public.users
      SET lifetime_xp = lifetime_xp + v_ach.xp_reward
      WHERE id = p_user_id;
  END IF;

  -- ----- Notification firing ---------------------------------------------
  -- Mirrors insertFromTemplate gates: template exists, template enabled,
  -- type enabled. Each gate failure is a silent skip — admins can mute
  -- per-template or per-type without breaking the unlock itself.

  IF v_ach.notification_template_key IS NOT NULL THEN
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

      -- Missing type row = treat as enabled (matches existing TS gate
      -- behaviour: only an explicit `enabled = false` blocks delivery).
      IF v_type_enabled IS NULL THEN
        v_type_enabled := true;
      END IF;

      IF v_type_enabled THEN
        -- Build the data payload. Merge template default_data with stamps
        -- the rest of the system reads (template_key) and identifiers a
        -- consuming client may want (achievement_slug / id, unlock row id).
        v_data := COALESCE(v_template.default_data, '{}'::jsonb)
                  || jsonb_build_object(
                       'template_key',          v_template.key,
                       'achievement_slug',      v_ach.slug,
                       'achievement_id',        v_ach.id,
                       'user_achievement_id',   v_unlock_id
                     );

        -- Placeholder substitution (matches TS regex: /\{(\w+)\}/g).
        -- v1a templates don't substitute anything from these locals, but
        -- the {title} key is honoured for "Achievement unlocked: {title}"
        -- style messages.
        v_title := regexp_replace(v_template.title, '\{title\}', v_ach.title, 'g');
        v_message := regexp_replace(v_template.message, '\{title\}', v_ach.title, 'g');

        -- One row per persisted channel. Toast is transient and never
        -- inserted; the toast surfaces client-side from the in_app row.
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
-- Execution privileges
-- ----------------------------------------------------------------------------
-- Supabase grants EXECUTE to PUBLIC + anon + authenticated by default on
-- functions created in `public`. Strip all three and grant only to
-- service_role. Other SECURITY DEFINER functions that call this run as
-- postgres and bypass the gate.

REVOKE EXECUTE ON FUNCTION
  public.unlock_achievement(uuid, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.unlock_achievement(uuid, text)
  TO service_role;

-- ----------------------------------------------------------------------------
-- Documentation
-- ----------------------------------------------------------------------------

COMMENT ON FUNCTION
  public.unlock_achievement(uuid, text)
IS
  'Idempotent achievement unlock. On first call: inserts user_achievements row, optionally calls award_coins (coin_reward > 0) and links the resulting coin_transactions.id, optionally bumps users.lifetime_xp (xp_reward > 0), and optionally fires the linked notification template (mirroring insertFromTemplate gates and placeholder substitution). On re-call for the same (user, slug): returns NULL and does nothing. Raises for unknown / disabled slugs. SECURITY DEFINER; EXECUTE restricted to service_role.';
