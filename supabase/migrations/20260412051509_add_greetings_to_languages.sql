
-- Add greetings JSONB column to languages table
ALTER TABLE public.languages
ADD COLUMN greetings jsonb DEFAULT NULL;

COMMENT ON COLUMN public.languages.greetings IS 'Time-of-day greetings with translations. Structure: { morning: { text, translation }, afternoon: { text, translation }, evening: { text, translation } }';

-- Seed existing languages with their greetings
UPDATE public.languages SET greetings = '{
  "morning": { "text": "Buongiorno", "translation": "Good morning" },
  "afternoon": { "text": "Buon pomeriggio", "translation": "Good afternoon" },
  "evening": { "text": "Buonasera", "translation": "Good evening" }
}'::jsonb WHERE name = 'Italian';

UPDATE public.languages SET greetings = '{
  "morning": { "text": "Buenos días", "translation": "Good morning" },
  "afternoon": { "text": "Buenas tardes", "translation": "Good afternoon" },
  "evening": { "text": "Buenas noches", "translation": "Good evening" }
}'::jsonb WHERE name = 'Spanish';

UPDATE public.languages SET greetings = '{
  "morning": { "text": "Bonjour", "translation": "Good morning" },
  "afternoon": { "text": "Bon après-midi", "translation": "Good afternoon" },
  "evening": { "text": "Bonsoir", "translation": "Good evening" }
}'::jsonb WHERE name = 'French';

UPDATE public.languages SET greetings = '{
  "morning": { "text": "Guten Morgen", "translation": "Good morning" },
  "afternoon": { "text": "Guten Tag", "translation": "Good afternoon" },
  "evening": { "text": "Guten Abend", "translation": "Good evening" }
}'::jsonb WHERE name = 'German';

UPDATE public.languages SET greetings = '{
  "morning": { "text": "Bom dia", "translation": "Good morning" },
  "afternoon": { "text": "Boa tarde", "translation": "Good afternoon" },
  "evening": { "text": "Boa noite", "translation": "Good evening" }
}'::jsonb WHERE name = 'Portuguese';

UPDATE public.languages SET greetings = '{
  "morning": { "text": "おはよう", "translation": "Good morning" },
  "afternoon": { "text": "こんにちは", "translation": "Good afternoon" },
  "evening": { "text": "こんばんは", "translation": "Good evening" }
}'::jsonb WHERE name = 'Japanese';
