-- Replace curly single quotes (U+2018 left, U+2019 right) with straight apostrophe (U+0027)
-- in headword and memory_trigger_text columns

UPDATE words
SET headword = replace(replace(headword, E'\u2018', ''''), E'\u2019', '''')
WHERE headword ~ E'[\u2018\u2019]';

UPDATE words
SET memory_trigger_text = replace(replace(memory_trigger_text, E'\u2018', ''''), E'\u2019', '''')
WHERE memory_trigger_text ~ E'[\u2018\u2019]';