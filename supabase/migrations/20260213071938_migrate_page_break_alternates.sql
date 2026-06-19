-- Migrate <page break> delimited alternates to alternate_answers array
UPDATE words
SET
  alternate_answers = (
    SELECT array_agg(trim(part))
    FROM unnest(string_to_array(headword, '<page break>')) WITH ORDINALITY AS t(part, idx)
    WHERE idx > 1 AND trim(part) != ''
  ),
  headword = trim(split_part(headword, '<page break>', 1))
WHERE headword LIKE '%<page break>%';