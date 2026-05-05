-- ============================================================================
-- Toast channel for notification templates
-- ============================================================================
--
-- Adds an optional "toast" delivery channel to notification_templates so admins
-- can edit the title/body that flashes as a transient toast independently from
-- the persistent in-app bell entry.
--
-- Design:
--   * The existing `channels TEXT[]` column carries the new value 'toast'
--     alongside 'in_app' / 'email'. The dispatcher (insertNotification) skips
--     DB inserts for 'toast' rows — toasts are client-only and never persist.
--   * Two new columns hold the toast-specific copy. They're nullable so admins
--     can leave a template's toast empty when the bell entry alone is enough.
--   * The bell entry continues to use `title` / `message` exactly as before.
--
-- Idempotency: re-running this migration is safe.
-- ============================================================================

ALTER TABLE notification_templates
  ADD COLUMN IF NOT EXISTS toast_title TEXT,
  ADD COLUMN IF NOT EXISTS toast_message TEXT;

-- ----------------------------------------------------------------------------
-- Allow 'toast' in notification_templates.channels
-- ----------------------------------------------------------------------------
-- A pre-existing trigger (validate_template_channels) restricts the channels
-- array to ('in_app', 'email'). Replace it so 'toast' is accepted too. The
-- corresponding trigger on notification_broadcasts stays narrow because
-- broadcasts are mass-send editorial content where transient toasts make no
-- sense — only templates carry the toast channel.
CREATE OR REPLACE FUNCTION validate_template_channels()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.channels IS NULL OR array_length(NEW.channels, 1) IS NULL THEN
    RAISE EXCEPTION 'channels must contain at least one entry';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(NEW.channels) c
    WHERE c NOT IN ('in_app', 'email', 'toast')
  ) THEN
    RAISE EXCEPTION 'channels may only contain in_app, email, or toast';
  END IF;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Seed: achievement.first_word_learned
-- ----------------------------------------------------------------------------
-- Fired the very first time a user answers a word with full marks (3/3 — no
-- clues, no mistakes). Toast fires per-answer client-side; bell entry fires at
-- test completion via recordProgressAchievements.
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
  'achievement.first_word_learned',
  'First word learned',
  'First-time achievement when a user answers a word with full marks (3/3) — no clues, no mistakes.',
  'achievement',
  TRUE,
  'First word learned!',
  'You answered a word with full marks (3/3) — no clues, no mistakes. Keep going to start mastering words.',
  'First word learned!',
  'Full marks (3/3) — no clues, no mistakes.',
  ARRAY['in_app', 'toast']::TEXT[],
  NULL,
  TRUE
)
ON CONFLICT (key) DO UPDATE
SET
  -- Keep admin edits to label/description/title/message intact; only fill in
  -- toast fields and append 'toast' to channels if they're missing.
  toast_title = COALESCE(notification_templates.toast_title, EXCLUDED.toast_title),
  toast_message = COALESCE(notification_templates.toast_message, EXCLUDED.toast_message),
  channels = (
    SELECT ARRAY(
      SELECT DISTINCT unnest(notification_templates.channels || EXCLUDED.channels)
    )
  );

-- ----------------------------------------------------------------------------
-- Update: achievement.first_word_mastered
-- ----------------------------------------------------------------------------
-- Existing template — add toast copy and 'toast' channel without clobbering
-- any admin edits to the bell entry.
UPDATE notification_templates
SET
  toast_title = COALESCE(toast_title, 'First word mastered!'),
  toast_message = COALESCE(toast_message, 'Three full-mark answers in a row.'),
  channels = (
    SELECT ARRAY(
      SELECT DISTINCT unnest(channels || ARRAY['toast']::TEXT[])
    )
  )
WHERE key = 'achievement.first_word_mastered';
