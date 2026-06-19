-- ============================================================================
-- v1c Image Groups — resolve triggers (materialize memory_trigger_image_url)
-- ============================================================================
--
-- These triggers keep words.memory_trigger_image_url (the learner-facing,
-- materialized effective URL) in sync with the group/override model, so no read
-- path has to change.
--
--   effective = COALESCE(image_override_url, group.master_image_url)
--
-- 1. words_resolve_trigger_image  — BEFORE INSERT OR UPDATE OF the membership
--    columns on words: recompute that row's effective URL.
-- 2. word_image_groups_fanout     — AFTER UPDATE OF master_image_url on a group:
--    re-materialize every inheriting member in one bulk statement.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Per-row resolve on words
-- ----------------------------------------------------------------------------
-- Fires only when image_group_id / image_override_url change (UPDATE) or on any
-- INSERT. On an INSERT that carries NEITHER a group nor an override we leave
-- memory_trigger_image_url exactly as provided — this preserves legacy / direct
-- insert paths (e.g. the CSV import script) that still write the URL directly.
-- On every other case the trigger OWNS memory_trigger_image_url, including
-- resetting it to NULL when both group and override are cleared.

CREATE OR REPLACE FUNCTION public.words_resolve_trigger_image()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     AND NEW.image_group_id IS NULL
     AND NEW.image_override_url IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.memory_trigger_image_url := COALESCE(
    NEW.image_override_url,
    (SELECT master_image_url
       FROM public.word_image_groups
      WHERE id = NEW.image_group_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS words_resolve_trigger_image_trg ON public.words;
CREATE TRIGGER words_resolve_trigger_image_trg
  BEFORE INSERT OR UPDATE OF image_group_id, image_override_url
  ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION public.words_resolve_trigger_image();

-- ----------------------------------------------------------------------------
-- 2. Fan-out on group master change
-- ----------------------------------------------------------------------------
-- Re-materialize every inheriting member. Members with their own override keep
-- it (COALESCE). Writes memory_trigger_image_url directly, which does NOT fire
-- the per-row trigger above (that only watches the membership columns), so no
-- recursion.

CREATE OR REPLACE FUNCTION public.word_image_groups_fanout()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.master_image_url IS DISTINCT FROM OLD.master_image_url THEN
    UPDATE public.words
       SET memory_trigger_image_url = COALESCE(image_override_url, NEW.master_image_url),
           updated_at = now()
     WHERE image_group_id = NEW.id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS word_image_groups_fanout_trg ON public.word_image_groups;
CREATE TRIGGER word_image_groups_fanout_trg
  AFTER UPDATE OF master_image_url
  ON public.word_image_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.word_image_groups_fanout();
