
-- ============================================================================
-- PHASE 1: BILLING SCHEMA
-- New tables: platform_config, pricing_plans, subscriptions,
--             credit_transactions, referrals
-- Modified: courses (rename price_cents), users (add billing fields)
-- ============================================================================

-- ============================================================================
-- 1. PLATFORM CONFIG (key-value app configuration)
-- ============================================================================

CREATE TABLE platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER update_platform_config_updated_at
  BEFORE UPDATE ON platform_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. PRICING PLANS (admin-managed, synced to Stripe)
-- ============================================================================

CREATE TABLE pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL CHECK (tier IN ('course', 'language', 'all-languages')),
  billing_model TEXT NOT NULL CHECK (billing_model IN ('monthly', 'annual', 'lifetime')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  is_active BOOLEAN NOT NULL DEFAULT false,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_pricing_plans_tier_model ON pricing_plans(tier, billing_model);

CREATE TRIGGER update_pricing_plans_updated_at
  BEFORE UPDATE ON pricing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. SUBSCRIPTIONS (user subscription records)
-- ============================================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('course', 'language', 'all-languages')),
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'annual', 'lifetime')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  target_id UUID, -- polymorphic: courses.id or languages.id; null for all-languages
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ, -- null for lifetime (never expires)
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_subscriptions_target ON subscriptions(target_id)
  WHERE target_id IS NOT NULL;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. CREDIT TRANSACTIONS (ledger pattern - immutable entries)
-- ============================================================================

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL, -- positive = earned, negative = spent
  type TEXT NOT NULL CHECK (type IN ('referral', 'reward', 'redemption', 'adjustment')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired')),
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_user_status ON credit_transactions(user_id, status);

-- ============================================================================
-- 5. REFERRALS (referral tracking)
-- ============================================================================

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  credit_amount_cents INTEGER NOT NULL DEFAULT 400,
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_user_id);
CREATE UNIQUE INDEX idx_referrals_referred_unique ON referrals(referred_user_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);

-- ============================================================================
-- 6. MODIFY COURSES TABLE
-- ============================================================================

ALTER TABLE courses RENAME COLUMN price_cents TO price_override_cents;
ALTER TABLE courses ALTER COLUMN price_override_cents DROP DEFAULT;

-- ============================================================================
-- 7. MODIFY USERS TABLE
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cohort TEXT;

CREATE UNIQUE INDEX idx_users_referral_code ON users(referral_code)
  WHERE referral_code IS NOT NULL;
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ============================================================================
-- 8. REFERRAL CODE GENERATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(encode(gen_random_bytes(6), 'base64') from 1 for 8));
    code := replace(replace(replace(code, '+', 'X'), '/', 'Y'), '=', 'Z');
    SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. UPDATE AUTH TRIGGER TO GENERATE REFERRAL CODES
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    generate_referral_code()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. BACKFILL REFERRAL CODES FOR EXISTING USERS
-- ============================================================================

DO $$
DECLARE
  usr RECORD;
BEGIN
  FOR usr IN SELECT id FROM users WHERE referral_code IS NULL LOOP
    UPDATE users SET referral_code = generate_referral_code() WHERE id = usr.id;
  END LOOP;
END;
$$;

-- ============================================================================
-- 11. RLS POLICIES
-- ============================================================================

-- PLATFORM CONFIG: Public read, admin write
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON platform_config FOR SELECT USING (true);
CREATE POLICY "Admin write" ON platform_config FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- PRICING PLANS: Public read, admin write
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON pricing_plans FOR SELECT USING (true);
CREATE POLICY "Admin write" ON pricing_plans FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- SUBSCRIPTIONS: Users read/insert/update own
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- CREDIT TRANSACTIONS: Users read own only
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- REFERRALS: Users read own (as referrer or referred)
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own referrals" ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

-- ============================================================================
-- 12. SEED DATA
-- ============================================================================

-- Platform config
INSERT INTO platform_config (key, value, description) VALUES
  ('enabled_tiers', '["language", "all-languages"]', 'Which subscription tiers are shown in the frontend'),
  ('default_free_lessons', '10', 'Global default for free lessons per course (used when course.free_lessons is null)'),
  ('referral_credit_cents', '400', 'Amount credited per successful referral in cents ($4.00)')
ON CONFLICT (key) DO NOTHING;

-- Pricing plans: 3 tiers x 3 billing models = 9 rows
INSERT INTO pricing_plans (tier, billing_model, amount_cents, currency, is_active) VALUES
  ('course', 'monthly', 999, 'usd', false),
  ('course', 'annual', 9900, 'usd', false),
  ('course', 'lifetime', 5000, 'usd', false),
  ('language', 'monthly', 1499, 'usd', true),
  ('language', 'annual', 12900, 'usd', true),
  ('language', 'lifetime', 12000, 'usd', true),
  ('all-languages', 'monthly', 1999, 'usd', true),
  ('all-languages', 'annual', 14900, 'usd', true),
  ('all-languages', 'lifetime', 29900, 'usd', true)
ON CONFLICT (tier, billing_model) DO NOTHING;
