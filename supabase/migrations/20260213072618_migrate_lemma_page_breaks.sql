-- Clean lemma: take only the first part before any page break, trimmed
UPDATE words
SET lemma = trim(both E' \n\r\t' from split_part(lemma, '<page break>', 1))
WHERE lemma LIKE '%<page break>%';