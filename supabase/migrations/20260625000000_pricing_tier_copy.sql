-- ============================================================================
-- PRICING TIER COPY (admin-editable upgrade-modal card copy)
--
-- One row per pricing tier holds the marketing copy shown on the upgrade
-- modal's plan cards: a short audience subtitle plus up to 5 benefit bullets.
-- Card *titles* and *prices* stay dynamic (driven by pricing_plans + live
-- content counts); only the audience line and benefit bullets are editable.
--
-- Benefit strings support count tokens that are interpolated at render time:
--   {freeLessons}  free tier      — global default free lessons per course
--   {courses}      language/all   — course count
--   {lessons}      language/all   — lesson count
--   {words}        language/all   — word count (rendered approximately, e.g. ~200)
--   {languages}    all-languages  — total language count
-- ============================================================================

CREATE TABLE pricing_tier_copy (
  tier_key TEXT PRIMARY KEY CHECK (tier_key IN ('free', 'course', 'language', 'all-languages')),
  audience TEXT,
  benefit_1 TEXT,
  benefit_2 TEXT,
  benefit_3 TEXT,
  benefit_4 TEXT,
  benefit_5 TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_pricing_tier_copy_updated_at
  BEFORE UPDATE ON pricing_tier_copy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: public can read (copy is shown to every visitor), only admins can write.
ALTER TABLE pricing_tier_copy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON pricing_tier_copy FOR SELECT USING (true);
CREATE POLICY "Admin write" ON pricing_tier_copy FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Seed with the current hardcoded modal copy so nothing changes visually until
-- an admin edits it. benefit_4/benefit_5 are intentionally left null (the modal
-- skips blank slots).
INSERT INTO pricing_tier_copy (tier_key, audience, benefit_1, benefit_2, benefit_3) VALUES
  (
    'free',
    'For curious beginners',
    'First {freeLessons} lessons of every language',
    'Study & test sessions to try it out',
    'Basic progress tracking'
  ),
  (
    'language',
    'For focused learners',
    '{courses} courses · {lessons} lessons',
    'Learn {words} words',
    'Native audio, example sentences & unlimited sessions'
  ),
  (
    'all-languages',
    'For polyglots',
    '{languages} languages · {courses} courses',
    '{lessons} lessons · {words} words',
    'New languages & courses included as we add them'
  )
ON CONFLICT (tier_key) DO NOTHING;

-- ============================================================================
-- PRICING UPDATE: clean round-dollar monthly equivalents
--   language     annual  12900 -> 12000  ($10.00/mo)
--   all-languages annual 14900 -> 18000  ($15.00/mo)
--   language     lifetime 12000 -> 19900 (above annual so the ladder is sane)
-- ============================================================================

UPDATE pricing_plans SET amount_cents = 12000 WHERE tier = 'language' AND billing_model = 'annual';
UPDATE pricing_plans SET amount_cents = 18000 WHERE tier = 'all-languages' AND billing_model = 'annual';
UPDATE pricing_plans SET amount_cents = 19900 WHERE tier = 'language' AND billing_model = 'lifetime';
