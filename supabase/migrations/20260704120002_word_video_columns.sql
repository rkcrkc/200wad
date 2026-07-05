-- ============================================================================
-- Memory Trigger Videos — words + word_image_groups video columns
-- ============================================================================
--
-- Mirrors the existing image columns exactly, one tier down:
--   words.video_override_url        : per-word override; NULL = inherit group master.
--   words.memory_trigger_video_url  : MATERIALIZED effective video URL (trigger-owned).
--   word_image_groups.master_video_url : shared master video for the group.
--
-- The existing memory_trigger_image_url doubles as the poster/fallback still, so
-- these are separate columns (not a reuse of image_override_url).
-- ============================================================================

ALTER TABLE public.words
  ADD COLUMN IF NOT EXISTS video_override_url text,
  ADD COLUMN IF NOT EXISTS memory_trigger_video_url text;

ALTER TABLE public.word_image_groups
  ADD COLUMN IF NOT EXISTS master_video_url text;

COMMENT ON COLUMN public.words.video_override_url IS
  'Per-word memory-trigger video override (MP4). NULL = inherit the group master video. The resolve trigger materializes COALESCE(video_override_url, group.master_video_url) into memory_trigger_video_url.';
COMMENT ON COLUMN public.words.memory_trigger_video_url IS
  'Materialized effective memory-trigger video URL (trigger-owned; do not write directly). NULL = image-only word.';
COMMENT ON COLUMN public.word_image_groups.master_video_url IS
  'Shared master memory-trigger video (MP4) for the group; fanned out to inheriting members via word_image_groups_fanout().';
