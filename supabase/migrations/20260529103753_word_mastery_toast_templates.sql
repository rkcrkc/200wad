-- ============================================================================
-- Word-mastery in-session toast templates
-- ============================================================================
--
-- Adds two new admin-managed notification templates that fire in-session on
-- the post-answer reveal screen during a test:
--
--   * achievement.word_almost_mastered — when correct_streak hits 2/3 on a
--     full-mark answer (one perfect answer away from mastery).
--   * achievement.word_mastered — when correct_streak hits 3 on a full-mark
--     answer (the moment a word transitions to `mastered`). Pairs with a
--     fullscreen ConfettiBurst on the client.
--
-- Both fire ONCE per word per test session, gated client-side. The
-- `{{word}}` placeholder in the mastered message is substituted with the
-- current word's headword at render time by `fireTemplateToast`.
--
-- Channels: ['in_app', 'toast'] — persistent bell entry plus a transient
-- in-session toast. The 'toast' channel is what gates the in-session firing;
-- admin can drop it to disable the toast without losing the bell entry.
--
-- Idempotency: ON CONFLICT (key) DO UPDATE preserves any admin edits made
-- between deploys; channels are union-merged so re-running never narrows
-- delivery.
-- ============================================================================

INSERT INTO notification_templates (
  key,
  label,
  description,
  type,
  enabled,
  title,
  message,
  toast_title,
  toast_message,
  channels,
  default_data,
  is_system
) VALUES (
  'achievement.word_almost_mastered',
  'Word almost mastered',
  'Fires in-session on the post-answer reveal when a word''s correct_streak reaches 2/3 (one perfect answer away from mastery). Gated per word per session to avoid double-firing across Test Twice attempts.',
  'achievement',
  TRUE,
  'Almost there!',
  'One more perfect answer to master this word.',
  'Almost there!',
  'One more perfect answer to master this word.',
  ARRAY['in_app', 'toast']::TEXT[],
  NULL,
  TRUE
)
ON CONFLICT (key) DO UPDATE
SET
  -- Preserve admin edits; only fill in fields if they're missing.
  toast_title = COALESCE(notification_templates.toast_title, EXCLUDED.toast_title),
  toast_message = COALESCE(notification_templates.toast_message, EXCLUDED.toast_message),
  channels = (
    SELECT ARRAY(
      SELECT DISTINCT unnest(notification_templates.channels || EXCLUDED.channels)
    )
  );

INSERT INTO notification_templates (
  key,
  label,
  description,
  type,
  enabled,
  title,
  message,
  toast_title,
  toast_message,
  channels,
  default_data,
  is_system
) VALUES (
  'achievement.word_mastered',
  'Word mastered (per word)',
  'Fires in-session on the post-answer reveal when a word''s correct_streak reaches 3 (the mastery transition). Pairs with a fullscreen confetti burst on the client. Distinct from `achievement.first_word_mastered`, which only fires on the user''s very first mastered word ever. Use `{{word}}` in title/message to interpolate the word''s headword at render time.',
  'achievement',
  TRUE,
  'Mastered!',
  '{{word}} is now fully mastered.',
  'Mastered!',
  '{{word}} is now fully mastered.',
  ARRAY['in_app', 'toast']::TEXT[],
  NULL,
  TRUE
)
ON CONFLICT (key) DO UPDATE
SET
  toast_title = COALESCE(notification_templates.toast_title, EXCLUDED.toast_title),
  toast_message = COALESCE(notification_templates.toast_message, EXCLUDED.toast_message),
  channels = (
    SELECT ARRAY(
      SELECT DISTINCT unnest(notification_templates.channels || EXCLUDED.channels)
    )
  );
