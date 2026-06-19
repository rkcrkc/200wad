-- Prevent regressions: a row categorized as 'word' must have a part_of_speech.
-- Sentences, facts, phrases, information pages legitimately have NULL pos;
-- only the 'word' bucket requires it. NULL-category rows are unaffected
-- (category = 'word' evaluates to NULL, so the constraint holds).
ALTER TABLE words
  ADD CONSTRAINT words_word_category_requires_pos
  CHECK (NOT (category = 'word' AND part_of_speech IS NULL));