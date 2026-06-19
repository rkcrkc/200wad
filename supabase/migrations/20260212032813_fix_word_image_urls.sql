-- Fix all words with partial identifiers instead of full URLs
-- Converts values like "ciao ,exc" to full Supabase storage URLs
UPDATE words
SET memory_trigger_image_url =
  'https://xfauulfdbxageerwqnvo.supabase.co/storage/v1/object/public/word-images/'
  || REPLACE(REPLACE(memory_trigger_image_url, ' ', '%20'), ',', '%2C')
  || '.png'
WHERE memory_trigger_image_url IS NOT NULL
  AND memory_trigger_image_url NOT LIKE 'https://%';