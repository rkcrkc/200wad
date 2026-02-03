-- ============================================================================
-- ADD GRAMMATICAL NUMBER TO WORDS TABLE
-- Tracks whether the headword is singular (sg) or plural (pl)
-- Replaces the deprecated is_plural_only field (which remains for backwards compat)
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD NEW COLUMN
-- ============================================================================

-- Grammatical number: sg (singular) or pl (plural)
ALTER TABLE words ADD COLUMN IF NOT EXISTS grammatical_number TEXT;

-- ============================================================================
-- STEP 2: ADD CHECK CONSTRAINT
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'words_grammatical_number_check'
  ) THEN
    ALTER TABLE words ADD CONSTRAINT words_grammatical_number_check 
      CHECK (grammatical_number IS NULL OR grammatical_number IN ('sg', 'pl'));
  END IF;
END $$;

-- ============================================================================
-- STEP 3: ADD INDEXES FOR FILTERING
-- ============================================================================

-- Index for filtering by grammatical number (e.g., "all plural nouns")
CREATE INDEX IF NOT EXISTS idx_words_language_grammatical_number 
  ON words(language_id, grammatical_number);

-- Composite index for common queries like "plural nouns"
CREATE INDEX IF NOT EXISTS idx_words_language_pos_grammatical_number 
  ON words(language_id, part_of_speech, grammatical_number);

-- ============================================================================
-- NOTE: is_plural_only is now DEPRECATED
-- The column remains in place to avoid breaking existing code.
-- New code should use grammatical_number instead.
-- Do NOT backfill from is_plural_only as the concepts are different:
--   - is_plural_only: "this noun only exists in plural form" (e.g., scissors)
--   - grammatical_number: "this headword is singular or plural"
-- ============================================================================
