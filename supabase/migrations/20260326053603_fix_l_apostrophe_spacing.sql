-- Fix l' (curly apostrophe + space) to l' (straight apostrophe, no space) in headwords
-- Affects Italian nouns starting with a vowel where the article is elided
UPDATE words
SET headword = 'l''' || substring(headword from 4)
WHERE headword LIKE E'l\u2018 %';

UPDATE words
SET headword = 'L''' || substring(headword from 4)
WHERE headword LIKE E'L\u2018 %';