-- Re-sort lessons to match the legacy DL ("Exceltra 200 Words a Day") curriculum order.
--
-- Problem: the legacy importer assigned `number`/`sort_order` in CSV row order, which is
-- NOT the DL curriculum order. DL displays lessons ordered by Lesson ID. Our
-- `legacy_lesson_id` stores that same ID, so ranking by `legacy_lesson_id` ascending
-- reproduces the DL order exactly.
--
-- Fix: for every imported lesson (legacy_lesson_id IS NOT NULL), set both `number` and
-- `sort_order` to a contiguous 1..N rank per course, ordered by `legacy_lesson_id`.
-- Lessons without a legacy_lesson_id (manually created) are left untouched.
--
-- UNIQUE(course_id, number) is non-deferrable, so a single permuting UPDATE could hit
-- transient collisions. We renumber in two phases: first push `number` out of range,
-- then assign the final sequential values.

-- Phase 1: move existing numbers far out of the way to avoid transient unique collisions.
update lessons
set number = number + 10000000
where legacy_lesson_id is not null;

-- Phase 2: assign sequential number & sort_order in legacy curriculum order.
with ranked as (
  select id,
         row_number() over (partition by course_id order by legacy_lesson_id) as rn
  from lessons
  where legacy_lesson_id is not null
)
update lessons l
set number = r.rn,
    sort_order = r.rn
from ranked r
where l.id = r.id;
