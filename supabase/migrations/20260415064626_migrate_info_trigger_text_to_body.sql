UPDATE public.words
SET information_body = memory_trigger_text,
    memory_trigger_text = NULL
WHERE category = 'information'
  AND memory_trigger_text IS NOT NULL
  AND (information_body IS NULL OR information_body = '');