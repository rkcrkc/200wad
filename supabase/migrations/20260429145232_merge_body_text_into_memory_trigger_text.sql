-- Merge body_text into memory_trigger_text.
-- Audit confirmed clean separation: zero rows have both columns populated.
UPDATE words
SET memory_trigger_text = body_text
WHERE body_text IS NOT NULL
  AND memory_trigger_text IS NULL;

ALTER TABLE words DROP COLUMN body_text;