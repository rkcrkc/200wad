-- ============================================================================
-- v1c Image Groups — words membership + per-word override columns
-- ============================================================================
--
-- image_group_id     : the group a word belongs to (NULL = no group).
--                      ON DELETE SET NULL so deleting a group leaves orphaned
--                      members (which then show no inherited image unless they
--                      carry an override — the CMS warns on delete).
-- image_override_url : per-word override; NULL = inherit the group's master.
--
-- memory_trigger_image_url is retained and becomes the MATERIALIZED effective
-- value, recomputed by the resolve triggers (next migration) as
-- COALESCE(image_override_url, group.master_image_url).
-- ============================================================================

ALTER TABLE public.words
  ADD COLUMN IF NOT EXISTS image_group_id uuid
    REFERENCES public.word_image_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_override_url text;

CREATE INDEX IF NOT EXISTS words_image_group_idx
  ON public.words (image_group_id);

COMMENT ON COLUMN public.words.image_group_id IS
  'Image group this word belongs to (word_image_groups.id). NULL = ungrouped. ON DELETE SET NULL.';
COMMENT ON COLUMN public.words.image_override_url IS
  'Per-word image override. NULL = inherit the group master. The resolve trigger materializes COALESCE(image_override_url, group.master_image_url) into memory_trigger_image_url.';
