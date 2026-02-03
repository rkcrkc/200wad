-- ============================================================================
-- SEED MAJOR LANGUAGES
-- Adds commonly taught languages to the database
-- ============================================================================

-- Insert languages (skip if already exists based on code)
INSERT INTO languages (code, name, native_name, sort_order)
VALUES 
  ('it', 'Italian', 'Italiano', 1),
  ('es', 'Spanish', 'Español', 2),
  ('fr', 'French', 'Français', 3),
  ('de', 'German', 'Deutsch', 4),
  ('ru', 'Russian', 'Русский', 5),
  ('zh', 'Chinese', '中文', 6),
  ('id', 'Indonesian', 'Bahasa Indonesia', 7),
  ('cy', 'Welsh', 'Cymraeg', 8)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  native_name = EXCLUDED.native_name,
  sort_order = EXCLUDED.sort_order;
