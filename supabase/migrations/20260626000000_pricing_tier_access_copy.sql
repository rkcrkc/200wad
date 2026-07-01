-- ============================================================================
-- PRICING TIER ACCESS COPY
--
-- Adds an admin-editable "access" line per pricing tier, shown in the header of
-- the subscription management page (the "Access" summary for the user's current
-- plan). Seeded with the previously hardcoded strings so nothing changes
-- visually until an admin edits it.
--
-- Access strings support the same {token} interpolation as benefits, plus a few
-- header-specific tokens resolved at render time:
--   {freeLessons}     free/language  — default free lessons per language
--   {language}        language       — the user's unlocked language name
--   {otherLanguages}  language       — the remaining (still-free) language names
--   {languages}       all-languages  — total language count
-- ============================================================================

ALTER TABLE pricing_tier_copy ADD COLUMN IF NOT EXISTS access TEXT;

UPDATE pricing_tier_copy SET access = '{freeLessons} lessons free per language'
  WHERE tier_key = 'free' AND access IS NULL;

UPDATE pricing_tier_copy SET access = '{language} unlocked · {freeLessons} lessons free for {otherLanguages}'
  WHERE tier_key = 'language' AND access IS NULL;

UPDATE pricing_tier_copy SET access = 'All languages unlocked'
  WHERE tier_key = 'all-languages' AND access IS NULL;
