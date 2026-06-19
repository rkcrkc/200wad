-- Add flashcard_image_url column to words table
-- Flashcard images are photographs depicting the English word (vs memory triggers which are mnemonics)
ALTER TABLE words
ADD COLUMN flashcard_image_url text;