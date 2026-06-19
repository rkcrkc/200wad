-- Replace backticks (used as apostrophes/quotes) with straight apostrophes
UPDATE words SET english = REPLACE(english, '`', '''') WHERE english LIKE '%`%';
UPDATE words SET headword = REPLACE(headword, '`', '''') WHERE headword LIKE '%`%';
UPDATE words SET memory_trigger_text = REPLACE(memory_trigger_text, '`', '''') WHERE memory_trigger_text LIKE '%`%';
UPDATE words SET body_text = REPLACE(body_text, '`', '''') WHERE body_text LIKE '%`%';
UPDATE words SET notes = REPLACE(notes, '`', '''') WHERE notes LIKE '%`%';
UPDATE lessons SET title = REPLACE(title, '`', '''') WHERE title LIKE '%`%';

-- Replace diaeresis (¨ U+00A8, used as double quote) with straight double quote
UPDATE words SET english = REPLACE(english, chr(168), '"') WHERE english LIKE '%' || chr(168) || '%';
UPDATE words SET headword = REPLACE(headword, chr(168), '"') WHERE headword LIKE '%' || chr(168) || '%';
UPDATE words SET memory_trigger_text = REPLACE(memory_trigger_text, chr(168), '"') WHERE memory_trigger_text LIKE '%' || chr(168) || '%';
UPDATE words SET body_text = REPLACE(body_text, chr(168), '"') WHERE body_text LIKE '%' || chr(168) || '%';
UPDATE words SET notes = REPLACE(notes, chr(168), '"') WHERE notes LIKE '%' || chr(168) || '%';
UPDATE lessons SET title = REPLACE(title, chr(168), '"') WHERE title LIKE '%' || chr(168) || '%';