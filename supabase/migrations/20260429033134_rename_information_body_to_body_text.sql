-- Add new shared column for fact + information body content
ALTER TABLE words ADD COLUMN body_text text;

-- Copy existing information bodies into the new column
UPDATE words
SET body_text = information_body
WHERE category = 'information' AND information_body IS NOT NULL;

-- Move fact memory triggers to body_text and null out memory_trigger_text
UPDATE words
SET body_text = memory_trigger_text,
    memory_trigger_text = NULL
WHERE category = 'fact' AND memory_trigger_text IS NOT NULL;

-- Drop the old information_body column
ALTER TABLE words DROP COLUMN information_body;