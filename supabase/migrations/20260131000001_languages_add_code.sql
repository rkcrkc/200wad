-- ============================================================================
-- LANGUAGES TABLE: Replace flag with ISO code
-- ============================================================================

-- 1. Add code column
ALTER TABLE languages ADD COLUMN IF NOT EXISTS code TEXT;

-- 2. Migrate existing flag emojis to ISO codes
-- Map common flag emojis to their ISO 639-1 language codes
UPDATE languages SET code = 'it' WHERE flag = '🇮🇹';
UPDATE languages SET code = 'es' WHERE flag = '🇪🇸';
UPDATE languages SET code = 'fr' WHERE flag = '🇫🇷';
UPDATE languages SET code = 'de' WHERE flag = '🇩🇪';
UPDATE languages SET code = 'cy' WHERE flag = '🏴󠁧󠁢󠁷󠁬󠁳󠁿'; -- Welsh
UPDATE languages SET code = 'id' WHERE flag = '🇮🇩'; -- Indonesian
UPDATE languages SET code = 'zh' WHERE flag = '🇨🇳'; -- Chinese
UPDATE languages SET code = 'en' WHERE flag = '🇬🇧' OR flag = '🇺🇸'; -- English
UPDATE languages SET code = 'pt' WHERE flag = '🇵🇹' OR flag = '🇧🇷'; -- Portuguese
UPDATE languages SET code = 'ja' WHERE flag = '🇯🇵'; -- Japanese
UPDATE languages SET code = 'ko' WHERE flag = '🇰🇷'; -- Korean
UPDATE languages SET code = 'ru' WHERE flag = '🇷🇺'; -- Russian
UPDATE languages SET code = 'ar' WHERE flag = '🇸🇦' OR flag = '🇦🇪'; -- Arabic
UPDATE languages SET code = 'nl' WHERE flag = '🇳🇱'; -- Dutch
UPDATE languages SET code = 'pl' WHERE flag = '🇵🇱'; -- Polish
UPDATE languages SET code = 'sv' WHERE flag = '🇸🇪'; -- Swedish
UPDATE languages SET code = 'da' WHERE flag = '🇩🇰'; -- Danish
UPDATE languages SET code = 'no' WHERE flag = '🇳🇴'; -- Norwegian
UPDATE languages SET code = 'fi' WHERE flag = '🇫🇮'; -- Finnish
UPDATE languages SET code = 'el' WHERE flag = '🇬🇷'; -- Greek
UPDATE languages SET code = 'tr' WHERE flag = '🇹🇷'; -- Turkish
UPDATE languages SET code = 'hi' WHERE flag = '🇮🇳'; -- Hindi
UPDATE languages SET code = 'th' WHERE flag = '🇹🇭'; -- Thai
UPDATE languages SET code = 'vi' WHERE flag = '🇻🇳'; -- Vietnamese

-- For any remaining records without a code, set a placeholder
-- (These should be manually reviewed and updated)
UPDATE languages SET code = LOWER(SUBSTRING(name, 1, 2)) WHERE code IS NULL;

-- 3. Make code required and unique
ALTER TABLE languages ALTER COLUMN code SET NOT NULL;
ALTER TABLE languages ADD CONSTRAINT languages_code_unique UNIQUE (code);

-- 4. Drop the flag column (no longer needed - derived from code in UI)
ALTER TABLE languages DROP COLUMN IF EXISTS flag;

-- 5. Remove audit columns per simplified schema
ALTER TABLE languages DROP COLUMN IF EXISTS created_by;
ALTER TABLE languages DROP COLUMN IF EXISTS updated_by;

-- 6. Create index on code for fast lookups
CREATE INDEX IF NOT EXISTS idx_languages_code ON languages(code);
