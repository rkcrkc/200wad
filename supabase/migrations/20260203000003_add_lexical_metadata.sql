-- ============================================================================
-- ADD LEXICAL METADATA TO WORDS TABLE
-- Adds gender, transitivity, and boolean flags for lesson filtering
-- All new fields are nullable to maintain backwards compatibility
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD NEW COLUMNS
-- ============================================================================

-- Gender (for nouns primarily: masculine, feminine, neuter, or both m/f)
ALTER TABLE words ADD COLUMN IF NOT EXISTS gender TEXT;

-- Transitivity (for verbs: transitive, intransitive, or both)
ALTER TABLE words ADD COLUMN IF NOT EXISTS transitivity TEXT;

-- Boolean flags for filtering
ALTER TABLE words ADD COLUMN IF NOT EXISTS is_irregular BOOLEAN DEFAULT false;
ALTER TABLE words ADD COLUMN IF NOT EXISTS is_plural_only BOOLEAN DEFAULT false;

-- ============================================================================
-- STEP 2: ADD CHECK CONSTRAINTS
-- ============================================================================

-- Gender constraint: m (masculine), f (feminine), n (neuter), mf (both)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'words_gender_check'
  ) THEN
    ALTER TABLE words ADD CONSTRAINT words_gender_check 
      CHECK (gender IS NULL OR gender IN ('m', 'f', 'n', 'mf'));
  END IF;
END $$;

-- Transitivity constraint: vt (transitive), vi (intransitive), vt_vi (both)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'words_transitivity_check'
  ) THEN
    ALTER TABLE words ADD CONSTRAINT words_transitivity_check 
      CHECK (transitivity IS NULL OR transitivity IN ('vt', 'vi', 'vt_vi'));
  END IF;
END $$;

-- Part of speech constraint (optional - can be added later after data cleanup)
-- Uncomment when ready to enforce:
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_constraint WHERE conname = 'words_part_of_speech_check'
--   ) THEN
--     ALTER TABLE words ADD CONSTRAINT words_part_of_speech_check 
--       CHECK (part_of_speech IS NULL OR part_of_speech IN (
--         'noun', 'verb', 'adjective', 'adverb', 'article', 
--         'pronoun', 'preposition', 'conjunction', 'number', 
--         'phrase', 'idiom', 'sentence', 'expression'
--       ));
--   END IF;
-- END $$;

-- ============================================================================
-- STEP 3: ADD INDEXES FOR LESSON BUILDING / FILTERING
-- ============================================================================

-- Index for filtering by part of speech (e.g., "all nouns")
CREATE INDEX IF NOT EXISTS idx_words_language_pos ON words(language_id, part_of_speech);

-- Index for filtering by gender (e.g., "all feminine nouns")
CREATE INDEX IF NOT EXISTS idx_words_language_gender ON words(language_id, gender);

-- Index for filtering by transitivity (e.g., "all transitive verbs")
CREATE INDEX IF NOT EXISTS idx_words_language_transitivity ON words(language_id, transitivity);

-- Index for filtering irregular words
CREATE INDEX IF NOT EXISTS idx_words_language_irregular ON words(language_id, is_irregular) 
  WHERE is_irregular = true;

-- Composite index for common queries like "feminine nouns" or "transitive verbs"
CREATE INDEX IF NOT EXISTS idx_words_language_pos_gender ON words(language_id, part_of_speech, gender);
CREATE INDEX IF NOT EXISTS idx_words_language_pos_transitivity ON words(language_id, part_of_speech, transitivity);
