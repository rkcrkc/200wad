-- ============================================================================
-- WORDS SCHEMA REFACTOR
-- Transform words table to support reusable vocabulary across lessons
-- with headword/lemma model and many-to-many lesson relationship
-- ============================================================================

-- ============================================================================
-- STEP 1: RENAME COLUMNS
-- ============================================================================

ALTER TABLE words RENAME COLUMN foreign_word TO headword;
ALTER TABLE words RENAME COLUMN english TO translation;

-- ============================================================================
-- STEP 2: ADD NEW COLUMNS
-- ============================================================================

-- Add lemma column for base form grouping/search
ALTER TABLE words ADD COLUMN IF NOT EXISTS lemma TEXT;

-- Add direct language reference (RESTRICT prevents accidental language deletion)
ALTER TABLE words ADD COLUMN IF NOT EXISTS language_id UUID REFERENCES languages(id) ON DELETE RESTRICT;

-- ============================================================================
-- STEP 3: BACKFILL DATA
-- ============================================================================

-- Set lemma = headword where null (initial backfill)
UPDATE words SET lemma = headword WHERE lemma IS NULL;

-- Backfill language_id from the existing lesson -> course -> language chain
UPDATE words w
SET language_id = c.language_id
FROM lessons l
JOIN courses c ON l.course_id = c.id
WHERE w.lesson_id = l.id
AND w.language_id IS NULL;

-- ============================================================================
-- STEP 4: CREATE JOIN TABLE AND MIGRATE DATA
-- ============================================================================

-- Create lesson_words join table for many-to-many relationship
CREATE TABLE IF NOT EXISTS lesson_words (
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (lesson_id, word_id)
);

-- Migrate existing lesson assignments from words table
INSERT INTO lesson_words (lesson_id, word_id, sort_order)
SELECT lesson_id, id, COALESCE(sort_order, 0)
FROM words
WHERE lesson_id IS NOT NULL
ON CONFLICT (lesson_id, word_id) DO NOTHING;

-- ============================================================================
-- STEP 5: ADD CONSTRAINTS AND INDEXES
-- ============================================================================

-- Enforce NOT NULL after backfill is complete
ALTER TABLE words ALTER COLUMN headword SET NOT NULL;
ALTER TABLE words ALTER COLUMN lemma SET NOT NULL;
ALTER TABLE words ALTER COLUMN language_id SET NOT NULL;

-- Indexes for words table
CREATE INDEX IF NOT EXISTS idx_words_language_id ON words(language_id);
CREATE INDEX IF NOT EXISTS idx_words_language_lemma ON words(language_id, lemma);
CREATE INDEX IF NOT EXISTS idx_words_language_headword ON words(language_id, headword);

-- Index for lesson_words join table
CREATE INDEX IF NOT EXISTS idx_lesson_words_sort ON lesson_words(lesson_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lesson_words_word ON lesson_words(word_id);

-- ============================================================================
-- STEP 6: CLEANUP (DROP OLD COLUMNS)
-- ============================================================================

-- Drop FK constraint first
ALTER TABLE words DROP CONSTRAINT IF EXISTS words_lesson_id_fkey;

-- Drop old columns that are now replaced
ALTER TABLE words DROP COLUMN IF EXISTS lesson_id;
ALTER TABLE words DROP COLUMN IF EXISTS sort_order;

-- ============================================================================
-- STEP 7: RLS POLICIES FOR LESSON_WORDS
-- ============================================================================

-- Enable RLS
ALTER TABLE lesson_words ENABLE ROW LEVEL SECURITY;

-- Public read access (everyone can view lesson words)
DROP POLICY IF EXISTS "Lesson words are viewable by everyone" ON lesson_words;
CREATE POLICY "Lesson words are viewable by everyone" ON lesson_words
  FOR SELECT USING (true);

-- Admin full access
DROP POLICY IF EXISTS "Admins can manage lesson words" ON lesson_words;
CREATE POLICY "Admins can manage lesson words" ON lesson_words
  FOR ALL USING (is_admin());

-- ============================================================================
-- STEP 8: UPDATE TRIGGERS FOR WORD COUNT
-- ============================================================================

-- Update the lesson word_count trigger to use lesson_words join table
CREATE OR REPLACE FUNCTION update_lesson_word_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lessons 
    SET word_count = (SELECT COUNT(*) FROM lesson_words WHERE lesson_id = NEW.lesson_id)
    WHERE id = NEW.lesson_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lessons 
    SET word_count = (SELECT COUNT(*) FROM lesson_words WHERE lesson_id = OLD.lesson_id)
    WHERE id = OLD.lesson_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger on words table
DROP TRIGGER IF EXISTS trigger_update_lesson_word_count ON words;

-- Create new trigger on lesson_words table
DROP TRIGGER IF EXISTS trigger_update_lesson_word_count ON lesson_words;
CREATE TRIGGER trigger_update_lesson_word_count
AFTER INSERT OR DELETE ON lesson_words
FOR EACH ROW EXECUTE FUNCTION update_lesson_word_count();
