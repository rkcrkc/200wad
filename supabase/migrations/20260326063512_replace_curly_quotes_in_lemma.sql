-- Replace curly single quotes with straight apostrophe in lemma column
UPDATE words
SET lemma = replace(replace(lemma, E'\u2018', ''''), E'\u2019', '''')
WHERE lemma ~ E'[\u2018\u2019]';