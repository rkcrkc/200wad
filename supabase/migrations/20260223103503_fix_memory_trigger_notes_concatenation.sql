-- Fix words where notes were concatenated into memory_trigger_text after underscore separator
-- Pattern: "Trigger text\n\n________________________________________________\n\nNotes text"

UPDATE words
SET 
  -- Extract just the trigger (before underscore line), trimmed
  memory_trigger_text = TRIM(BOTH E'\n' FROM TRIM(REGEXP_REPLACE(memory_trigger_text, '\n*_{10,}.*$', '', 'ns'))),
  -- Extract notes (after underscore line), clean up and append to existing notes
  notes = CASE 
    WHEN notes IS NULL OR TRIM(notes) = '' THEN 
      TRIM(BOTH E'\n' FROM TRIM(REGEXP_REPLACE(REGEXP_REPLACE(memory_trigger_text, '^.*?_{10,}', '', 'ns'), '^[_\n\s]+', '', 'n')))
    ELSE 
      notes || E'\n\n' || TRIM(BOTH E'\n' FROM TRIM(REGEXP_REPLACE(REGEXP_REPLACE(memory_trigger_text, '^.*?_{10,}', '', 'ns'), '^[_\n\s]+', '', 'n')))
  END
WHERE memory_trigger_text ~ '_{10,}'
  AND LENGTH(TRIM(REGEXP_REPLACE(memory_trigger_text, '^.*?_{10,}', '', 'ns'))) > 5;