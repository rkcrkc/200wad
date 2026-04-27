-- Notifications system v1
--
-- Builds on the foundation `notifications` table by:
--   1. Broadening the `type` CHECK enum (fixes a silent insert failure in
--      the Stripe webhook which writes type='payment_failed').
--   2. Adding per-row delivery metadata: broadcast_id, channel,
--      dismissed_at, expires_at.
--   3. Adding the editorial layer table `notification_broadcasts` so admins
--      can author broadcasts independently of per-user delivery rows.
--   4. Adding `user_notification_preferences` schema (UI deferred) so we
--      don't have to migrate again when per-type opt-outs land.
--
-- The two-table model lets the admin CMS edit / cancel / resend
-- broadcasts without touching each user's inbox row.

-- ============================================
-- 1. EVOLVE notifications TABLE
-- ============================================

-- Replace the 2-value CHECK with a broader enum.
-- (No existing rows in production, so no data migration needed.)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'system',
    'billing',
    'learning',
    'reminder',
    'achievement',
    'content',
    'admin'
  ));

-- Add the new delivery-metadata columns.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS broadcast_id UUID,
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'in_app',
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_channel_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_channel_check
  CHECK (channel IN ('in_app', 'email'));

-- ============================================
-- 2. notification_broadcasts (admin editorial layer)
-- ============================================

CREATE TABLE IF NOT EXISTS notification_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'system',
    'billing',
    'learning',
    'reminder',
    'achievement',
    'content',
    'admin'
  )),
  -- Optional payload: { cta: { label, href }, severity, subtype, ... }
  data JSONB,
  -- Cohort filter resolved at dispatch time. Examples:
  --   { "all": true }
  --   { "plan": ["paid"], "language": ["it"], "active_within_days": 14 }
  audience JSONB NOT NULL DEFAULT '{"all": true}'::jsonb,
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[],
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'scheduled',
    'sending',
    'sent',
    'failed'
  )),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Each channel value must be one of the supported transports.
-- (Postgres has no array CHECK helper, so we enforce it via a trigger.)
CREATE OR REPLACE FUNCTION validate_broadcast_channels()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.channels IS NULL OR array_length(NEW.channels, 1) IS NULL THEN
    RAISE EXCEPTION 'channels must contain at least one entry';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(NEW.channels) c
    WHERE c NOT IN ('in_app', 'email')
  ) THEN
    RAISE EXCEPTION 'channels may only contain in_app or email';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_broadcast_channels ON notification_broadcasts;
CREATE TRIGGER trigger_validate_broadcast_channels
BEFORE INSERT OR UPDATE OF channels ON notification_broadcasts
FOR EACH ROW EXECUTE FUNCTION validate_broadcast_channels();

-- updated_at trigger
DROP TRIGGER IF EXISTS update_notification_broadcasts_updated_at ON notification_broadcasts;
CREATE TRIGGER update_notification_broadcasts_updated_at
BEFORE UPDATE ON notification_broadcasts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Now that the table exists, wire up the FK on notifications.broadcast_id.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_broadcast_id_fkey;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_broadcast_id_fkey
  FOREIGN KEY (broadcast_id)
  REFERENCES notification_broadcasts(id)
  ON DELETE SET NULL;

-- ============================================
-- 3. user_notification_preferences (schema only; UI deferred)
-- ============================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'system',
    'billing',
    'learning',
    'reminder',
    'achievement',
    'content',
    'admin'
  )),
  in_app BOOLEAN NOT NULL DEFAULT true,
  email BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, type)
);

DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
BEFORE UPDATE ON user_notification_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. INDEXES
-- ============================================

-- Bell dropdown query: fetch a user's recent in-app, non-dismissed,
-- non-expired notifications, newest first.
CREATE INDEX IF NOT EXISTS notifications_inbox_idx
  ON notifications (user_id, channel, dismissed_at, created_at DESC);

-- Read-rate analytics: count by broadcast.
CREATE INDEX IF NOT EXISTS notifications_broadcast_id_idx
  ON notifications (broadcast_id)
  WHERE broadcast_id IS NOT NULL;

-- Cron dispatcher: scan for due scheduled broadcasts.
CREATE INDEX IF NOT EXISTS notification_broadcasts_due_idx
  ON notification_broadcasts (scheduled_for)
  WHERE status = 'scheduled';

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- notification_broadcasts: not user-facing. Admin server actions use the
-- service role (which bypasses RLS), so we enable RLS with no policies —
-- all authenticated/anon access is denied by default.
ALTER TABLE notification_broadcasts ENABLE ROW LEVEL SECURITY;

-- user_notification_preferences: users own their rows.
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own prefs"
  ON user_notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own prefs"
  ON user_notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own prefs"
  ON user_notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own prefs"
  ON user_notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);
