-- Migration: Add legacy import columns and word_relationships table
-- This migration prepares the schema for importing data from the legacy DaneL (DL) database

-- ============================================================================
-- 1. Add legacy reference columns to existing tables
-- ============================================================================

-- courses: Add legacy_ref for DL Products.Ref
ALTER TABLE courses ADD COLUMN IF NOT EXISTS legacy_ref integer;
CREATE INDEX IF NOT EXISTS idx_courses_legacy_ref ON courses(legacy_ref);

-- lessons: Add legacy_lesson_id for DL Sections.Lesson
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS legacy_lesson_id integer;
CREATE INDEX IF NOT EXISTS idx_lessons_legacy_lesson_id ON lessons(legacy_lesson_id);

-- ============================================================================
-- 2. Add new columns to words table
-- ============================================================================

-- Legacy reference
ALTER TABLE words ADD COLUMN IF NOT EXISTS legacy_refn integer;
CREATE INDEX IF NOT EXISTS idx_words_legacy_refn ON words(legacy_refn);

-- Legacy gender code (for reference/debugging)
ALTER TABLE words ADD COLUMN IF NOT EXISTS legacy_gender_code text;

-- Category: word, phrase, sentence, fact, information, proverb
ALTER TABLE words ADD COLUMN IF NOT EXISTS category text DEFAULT 'word';

-- Phrase type: expression, idiom, or null
ALTER TABLE words ADD COLUMN IF NOT EXISTS phrase_type text;

-- Tags array for flexible categorization
ALTER TABLE words ADD COLUMN IF NOT EXISTS tags text[];

-- False friend flag
ALTER TABLE words ADD COLUMN IF NOT EXISTS is_false_friend boolean DEFAULT false;

-- Legacy image suffix (to know original format: SWF, JPG, GIF, PDF)
ALTER TABLE words ADD COLUMN IF NOT EXISTS legacy_image_suffix text;

-- ============================================================================
-- 3. Create word_relationships table for compound words, sentence links, etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS word_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  related_word_id uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('compound', 'sentence', 'grammar', 'related')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(word_id, related_word_id, relationship_type)
);

-- Indexes for word_relationships
CREATE INDEX IF NOT EXISTS idx_word_relationships_word_id ON word_relationships(word_id);
CREATE INDEX IF NOT EXISTS idx_word_relationships_related_word_id ON word_relationships(related_word_id);
CREATE INDEX IF NOT EXISTS idx_word_relationships_type ON word_relationships(relationship_type);

-- ============================================================================
-- 4. Add performance indexes for words table
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_words_language_id ON words(language_id);
CREATE INDEX IF NOT EXISTS idx_words_part_of_speech ON words(part_of_speech);
CREATE INDEX IF NOT EXISTS idx_words_category ON words(category);
CREATE INDEX IF NOT EXISTS idx_words_tags ON words USING GIN(tags);

-- ============================================================================
-- 5. Add RLS policies for word_relationships
-- ============================================================================

ALTER TABLE word_relationships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (makes migration idempotent)
DROP POLICY IF EXISTS "Anyone can read word relationships" ON word_relationships;
DROP POLICY IF EXISTS "Admins can insert word relationships" ON word_relationships;
DROP POLICY IF EXISTS "Admins can update word relationships" ON word_relationships;
DROP POLICY IF EXISTS "Admins can delete word relationships" ON word_relationships;

-- Everyone can read word relationships
CREATE POLICY "Anyone can read word relationships"
  ON word_relationships FOR SELECT
  USING (true);

-- Only admins can modify word relationships
CREATE POLICY "Admins can insert word relationships"
  ON word_relationships FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update word relationships"
  ON word_relationships FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete word relationships"
  ON word_relationships FOR DELETE
  USING (is_admin());

-- ============================================================================
-- 6. Create temporary table for storing legacy relationship references
-- This will be used during import to resolve RefN -> UUID mappings
-- ============================================================================

CREATE TABLE IF NOT EXISTS _legacy_word_relationships_staging (
  word_legacy_refn integer NOT NULL,
  related_legacy_refn integer NOT NULL,
  relationship_type text NOT NULL,
  PRIMARY KEY (word_legacy_refn, related_legacy_refn, relationship_type)
);

-- ============================================================================
-- Done!
-- ============================================================================
