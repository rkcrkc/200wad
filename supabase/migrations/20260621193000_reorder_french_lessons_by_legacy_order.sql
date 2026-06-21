-- Fix French lesson ordering to honour the original (legacy) curriculum order.
--
-- Background: the legacy importer assigned lessons.number / sort_order in
-- CSV-row order rather than by legacy_lesson_id, which is the true curriculum
-- order. That pushed "Common Words (1)" (legacy_lesson_id = 1) down to #19 in
-- Vocab #1, with "School" (legacy 34) sitting at #1. The earlier migration
-- 20260621031232 set sort_order = number, but `number` itself was the wrong
-- (CSV-row) order, so it locked the wrong order in. This migration supersedes
-- it by recomputing both number and sort_order from legacy_lesson_id.
--
-- It also removes the legacy auto-generated "system" lessons (Tutorial,
-- Students Notes, Accented Words, My Best/Worst Words, Random Words, My Notes,
-- My Best/Worst Sentences, etc.) which are now produced programmatically in NL.
-- These have no progress, study or test sessions attached.

-- Step 1: Remove legacy "system" lessons from French courses.
--   Vocab #1:         legacy_lesson_id 800-810
--   French Sentences: legacy_lesson_id 210000 (Tutorial) and 218000-218080
-- (Curriculum sentence lessons are 210011-210383, so 210000 and the 218xxx
--  range cannot catch real content.)
DELETE FROM lessons le
USING courses c, languages l
WHERE le.course_id = c.id
  AND c.language_id = l.id
  AND l.code = 'fr'
  AND (
    le.legacy_lesson_id BETWEEN 800 AND 899
    OR le.legacy_lesson_id = 210000
    OR le.legacy_lesson_id BETWEEN 218000 AND 218999
  );

-- Step 2: Renumber remaining French lessons by legacy_lesson_id (true order).
-- Offset numbers first so the dense renumber below can't transiently violate
-- the UNIQUE(course_id, number) constraint.
UPDATE lessons le
SET number = le.number + 100000
FROM courses c
JOIN languages l ON l.id = c.language_id
WHERE le.course_id = c.id
  AND l.code = 'fr';

WITH ranked AS (
  SELECT le.id,
         ROW_NUMBER() OVER (
           PARTITION BY le.course_id
           ORDER BY le.legacy_lesson_id
         ) AS rn
  FROM lessons le
  JOIN courses c ON c.id = le.course_id
  JOIN languages l ON l.id = c.language_id
  WHERE l.code = 'fr'
)
UPDATE lessons le
SET number = ranked.rn,
    sort_order = ranked.rn
FROM ranked
WHERE le.id = ranked.id;

-- Step 3: Keep courses.total_lessons consistent after the deletions.
UPDATE courses c
SET total_lessons = sub.cnt
FROM (
  SELECT course_id, COUNT(*) AS cnt
  FROM lessons
  GROUP BY course_id
) sub,
languages l
WHERE sub.course_id = c.id
  AND l.id = c.language_id
  AND l.code = 'fr';
