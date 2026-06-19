-- Legacy import defaulted category to 'word' for any row without a gender-code
-- mapping, which dumped ~883 sentences/phrases into the 'word' bucket. Move
-- them into the correct categories based on english-side heuristics. These
-- rows all have part_of_speech IS NULL, which is diagnostic of the bug.

-- Pass 1: rows ending in terminal punctuation are sentences (816 rows)
UPDATE words
SET category = 'sentence'
WHERE category = 'word'
  AND part_of_speech IS NULL
  AND english ~ '[.?!…]$';

-- Pass 2: uppercase-starting rows (incl. "(I)...", "(You)...") that end with a
-- parenthetical qualifier like "(m)" / "(formal)" are sentences too (65 rows)
UPDATE words
SET category = 'sentence'
WHERE category = 'word'
  AND part_of_speech IS NULL
  AND (english ~ '^[A-Z]' OR english ~ '^\([A-Z]');

-- Pass 3: remaining lowercase-starting multi-word entries are phrases (2 rows)
UPDATE words
SET category = 'phrase'
WHERE category = 'word'
  AND part_of_speech IS NULL;