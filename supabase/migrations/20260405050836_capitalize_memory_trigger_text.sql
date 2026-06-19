UPDATE words
SET memory_trigger_text = UPPER(LEFT(memory_trigger_text, 1)) || SUBSTRING(memory_trigger_text FROM 2)
WHERE memory_trigger_text IS NOT NULL
  AND memory_trigger_text != ''
  AND LEFT(memory_trigger_text, 1) = LOWER(LEFT(memory_trigger_text, 1))
  AND LEFT(memory_trigger_text, 1) ~ '[a-z]';