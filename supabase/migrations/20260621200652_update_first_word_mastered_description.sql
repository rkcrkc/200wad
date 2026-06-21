-- Shorten the first_word_mastered trophy description.
UPDATE public.achievements
SET description = 'Three perfect tests in a row.'
WHERE slug = 'first_word_mastered';
