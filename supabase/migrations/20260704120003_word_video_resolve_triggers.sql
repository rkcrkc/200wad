-- ============================================================================
-- Memory Trigger Videos — extend resolve triggers to materialize the video URL
-- ============================================================================
--
-- Widens the existing image resolve/fan-out triggers so they materialize
-- memory_trigger_video_url alongside memory_trigger_image_url, using the same
-- COALESCE(override, group master) rule. Image behaviour is unchanged.
--
--   effective_video = COALESCE(video_override_url, group.master_video_url)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Per-row resolve on words (image + video, independent guards)
-- ----------------------------------------------------------------------------
-- Each medium keeps its own "leave alone on a bare INSERT" guard so legacy /
-- direct-insert paths that write memory_trigger_image_url straight in are still
-- preserved (the image branch condition is identical to the original trigger).

CREATE OR REPLACE FUNCTION public.words_resolve_trigger_image()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Image: unchanged from the original trigger.
  IF NOT (TG_OP = 'INSERT'
          AND NEW.image_group_id IS NULL
          AND NEW.image_override_url IS NULL) THEN
    NEW.memory_trigger_image_url := COALESCE(
      NEW.image_override_url,
      (SELECT master_image_url
         FROM public.word_image_groups
        WHERE id = NEW.image_group_id)
    );
  END IF;

  -- Video: mirrors the image rule.
  IF NOT (TG_OP = 'INSERT'
          AND NEW.image_group_id IS NULL
          AND NEW.video_override_url IS NULL) THEN
    NEW.memory_trigger_video_url := COALESCE(
      NEW.video_override_url,
      (SELECT master_video_url
         FROM public.word_image_groups
        WHERE id = NEW.image_group_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS words_resolve_trigger_image_trg ON public.words;
CREATE TRIGGER words_resolve_trigger_image_trg
  BEFORE INSERT OR UPDATE OF image_group_id, image_override_url, video_override_url
  ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION public.words_resolve_trigger_image();

-- ----------------------------------------------------------------------------
-- 2. Fan-out on group master change (image + video, independent)
-- ----------------------------------------------------------------------------

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

  IF NEW.master_video_url IS DISTINCT FROM OLD.master_video_url THEN
    UPDATE public.words
       SET memory_trigger_video_url = COALESCE(video_override_url, NEW.master_video_url),
           updated_at = now()
     WHERE image_group_id = NEW.id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS word_image_groups_fanout_trg ON public.word_image_groups;
CREATE TRIGGER word_image_groups_fanout_trg
  AFTER UPDATE OF master_image_url, master_video_url
  ON public.word_image_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.word_image_groups_fanout();
