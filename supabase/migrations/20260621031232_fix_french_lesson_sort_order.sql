-- French lessons were imported with sort_order = legacy_lesson_id (scattered),
-- which made the scheduler greet lessons out of curriculum order.
-- The clean curriculum order lives in lessons.number (School=1, Town=2, ...),
-- matching the All Lessons page. Align sort_order with number for all French
-- courses so the scheduler follows the intended order.
UPDATE lessons le
SET sort_order = le.number
FROM courses c
JOIN languages l ON l.id = c.language_id
WHERE le.course_id = c.id
  AND l.code = 'fr'
  AND le.sort_order IS DISTINCT FROM le.number;
