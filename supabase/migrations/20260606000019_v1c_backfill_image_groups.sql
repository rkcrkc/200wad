-- ============================================================================
-- v1c Image Groups — idempotent backfill (Turbo Boosters + Grammar courses)
-- ============================================================================
--
-- Scope: words reachable from the two courses via lesson_words -> lessons. The
-- two courses have zero word overlap, so each scoped word maps to exactly one
-- course. Groups are course-scoped.
--
--   Turbo Boosters                     b1eaa124-808b-441c-8612-92b34c440db5
--   Grammar Slammer & Sentence Builder be6cf5e6-d19e-4337-bd85-7833b6c4b554
--
-- Steps:
--   A. Insert one group per (course, exact URL) shared by >=2 words in that
--      course. key = lower(decoded filename stem); master = that URL.
--   B. Assign words whose URL equals a group's master (override -> NULL so they
--      inherit). Fires the BEFORE trigger; effective URL stays identical.
--   C. Remaining scoped words become per-word one-offs (override = current URL).
--
-- Re-runnable: group insert uses ON CONFLICT DO NOTHING; the UPDATEs are guarded
-- so already-migrated rows are skipped. Words outside the two courses are never
-- touched.
--
-- Filenames use only %20 (space) and %2C (comma) percent-encoding (plus '+' for
-- space), verified against live data. Decode handles exactly those.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Best-effort label / suffix helpers (dropped at the end of this migration)
-- ----------------------------------------------------------------------------
-- Turbo rule filenames encode suffix pairs, e.g. 'turbo-tion-zione' ->
-- '-tion -> -zione' and 'turbo-ic-ico_ical-ico' -> '-ic -> -ico / -ical -> -ico'.
-- Arrow parsing is applied ONLY to the Turbo family (the Turbo Boosters course,
-- plus any 'turbo*'-prefixed key in the Grammar course). Everything else —
-- Grammar word/phrase images ('io ,prn', 'arrogant-woman') — keeps the decoded
-- filename stem verbatim with NULL suffixes, since those are not suffix rules.
--
-- _v1c_image_group_arrow returns the arrow label or NULL when the key is not a
-- clean set of 'en-it' pairs (spaces, commas, single words or multi-dash chunks
-- all yield NULL -> caller falls back to the verbatim master stem).

CREATE OR REPLACE FUNCTION public._v1c_image_group_arrow(key text)
RETURNS text LANGUAGE plpgsql AS $fn$
DECLARE
  body text := lower(key);
  chunk text;
  parts text[];
  out_parts text[] := '{}';
BEGIN
  body := regexp_replace(body, '^turbox-?', '');
  body := regexp_replace(body, '^turbo-?', '');
  IF body = '' THEN
    RETURN NULL;
  END IF;
  FOREACH chunk IN ARRAY string_to_array(body, '_') LOOP
    parts := regexp_match(chunk, '^([a-z]+)-([a-z]+)$');
    IF parts IS NULL THEN
      RETURN NULL;  -- not a clean pair -> signal "use verbatim"
    END IF;
    out_parts := out_parts || ('-' || parts[1] || ' → -' || parts[2]);
  END LOOP;
  RETURN array_to_string(out_parts, ' / ');
END;
$fn$;

CREATE OR REPLACE FUNCTION public._v1c_image_group_first_pair(key text)
RETURNS text[] LANGUAGE plpgsql AS $fn$
DECLARE
  body text := lower(key);
BEGIN
  body := regexp_replace(body, '^turbox-?', '');
  body := regexp_replace(body, '^turbo-?', '');
  IF body = '' THEN
    RETURN NULL;
  END IF;
  RETURN regexp_match(split_part(body, '_', 1), '^([a-z]+)-([a-z]+)$');
END;
$fn$;

-- ----------------------------------------------------------------------------
-- A. Insert groups: one per (course, exact URL) shared by >=2 words in course
-- ----------------------------------------------------------------------------
WITH scoped AS (
  SELECT DISTINCT w.id AS word_id, l.course_id, w.memory_trigger_image_url AS url
  FROM public.lesson_words lw
  JOIN public.lessons l ON l.id = lw.lesson_id
  JOIN public.words w ON w.id = lw.word_id
  WHERE l.course_id IN (
    'b1eaa124-808b-441c-8612-92b34c440db5',
    'be6cf5e6-d19e-4337-bd85-7833b6c4b554'
  )
  AND w.memory_trigger_image_url IS NOT NULL
  AND w.memory_trigger_image_url <> ''
),
stems AS (
  SELECT
    course_id,
    url,
    regexp_replace(url, '^.*/', '') AS filename,
    regexp_replace(
      replace(replace(replace(replace(
        regexp_replace(url, '^.*/', ''),
      '%20', ' '), '%2C', ','), '%2c', ','), '+', ' '),
      '\.[^.]+$', ''
    ) AS stem
  FROM scoped
),
grouped AS (
  SELECT
    course_id,
    url,
    lower(stem) AS key,
    -- master stem with original case preserved, used for verbatim labels
    regexp_replace(stem, '\.[^.]+$', '') AS master_stem,
    bool_or(filename ~* 'turbox' OR filename ~ 'X\.png$') AS is_exception,
    count(*) AS n
  FROM stems
  GROUP BY course_id, url, lower(stem), regexp_replace(stem, '\.[^.]+$', '')
  HAVING count(*) >= 2
),
labelled AS (
  SELECT
    course_id,
    url,
    key,
    master_stem,
    is_exception,
    -- Turbo family = the Turbo Boosters course OR a 'turbo*'-prefixed key.
    (course_id = 'b1eaa124-808b-441c-8612-92b34c440db5' OR key ~ '^turbox?') AS is_turbo,
    public._v1c_image_group_arrow(key) AS arrow,
    public._v1c_image_group_first_pair(key) AS first_pair
  FROM grouped
)
INSERT INTO public.word_image_groups (
  course_id, key, label, master_image_url, is_exception, english_suffix, italian_suffix
)
SELECT
  course_id,
  key,
  CASE WHEN is_turbo AND arrow IS NOT NULL THEN arrow ELSE master_stem END,
  url,
  is_exception,
  CASE WHEN is_turbo AND arrow IS NOT NULL THEN first_pair[1] ELSE NULL END,
  CASE WHEN is_turbo AND arrow IS NOT NULL THEN first_pair[2] ELSE NULL END
FROM labelled
ON CONFLICT (course_id, key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- B. Assign words to their group (inherit: override = NULL)
-- ----------------------------------------------------------------------------
WITH scoped AS (
  SELECT DISTINCT w.id AS word_id, l.course_id, w.memory_trigger_image_url AS url
  FROM public.lesson_words lw
  JOIN public.lessons l ON l.id = lw.lesson_id
  JOIN public.words w ON w.id = lw.word_id
  WHERE l.course_id IN (
    'b1eaa124-808b-441c-8612-92b34c440db5',
    'be6cf5e6-d19e-4337-bd85-7833b6c4b554'
  )
  AND w.memory_trigger_image_url IS NOT NULL
  AND w.memory_trigger_image_url <> ''
)
UPDATE public.words w
SET image_group_id = g.id,
    image_override_url = NULL
FROM scoped s
JOIN public.word_image_groups g
  ON g.course_id = s.course_id
 AND g.master_image_url = s.url
WHERE w.id = s.word_id
  AND (w.image_group_id IS DISTINCT FROM g.id OR w.image_override_url IS NOT NULL);

-- ----------------------------------------------------------------------------
-- C. One-offs: ungrouped scoped words keep their image as a per-word override
-- ----------------------------------------------------------------------------
WITH scoped AS (
  SELECT DISTINCT w.id AS word_id
  FROM public.lesson_words lw
  JOIN public.lessons l ON l.id = lw.lesson_id
  JOIN public.words w ON w.id = lw.word_id
  WHERE l.course_id IN (
    'b1eaa124-808b-441c-8612-92b34c440db5',
    'be6cf5e6-d19e-4337-bd85-7833b6c4b554'
  )
  AND w.memory_trigger_image_url IS NOT NULL
  AND w.memory_trigger_image_url <> ''
)
UPDATE public.words w
SET image_override_url = w.memory_trigger_image_url
FROM scoped s
WHERE w.id = s.word_id
  AND w.image_group_id IS NULL
  AND w.image_override_url IS NULL;

-- ----------------------------------------------------------------------------
-- Clean up helpers
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public._v1c_image_group_arrow(text);
DROP FUNCTION IF EXISTS public._v1c_image_group_first_pair(text);
