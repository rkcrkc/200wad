-- Clean up any remaining newlines/whitespace in headwords and alternate_answers
UPDATE words
SET 
  headword = trim(both E' \n\r\t' from headword)
WHERE headword ~ E'[\\n\\r]' OR headword != trim(headword);

-- Also clean alternates that have trailing newlines
UPDATE words
SET alternate_answers = (
  SELECT array_agg(trim(both E' \n\r\t' from elem))
  FROM unnest(alternate_answers) AS elem
)
WHERE alternate_answers IS NOT NULL 
  AND array_length(alternate_answers, 1) > 0;