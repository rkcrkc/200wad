-- One-off: cache-bust every existing word/concept pic URL in the DB.
--
-- Why: images are stored at a FIXED storage path (words/{id}/trigger.webp,
-- image-groups/{id}/master.webp) and uploaded with upsert:true. Replacing an
-- image overwrites the bytes but keeps the identical public URL, so the CDN /
-- browser / Next image optimizer keep serving the OLD cached copy. The app now
-- appends `?v=<Date.now()>` on new uploads (see StudyModeClient / TestModeClient
-- / AdminWordEditModal / ImageGroupEditModal); this script does the same for
-- URLs saved BEFORE that fix so already-stale pics refresh once.
--
-- Safety / idempotency:
--   * Only touches real storage URLs: LIKE '%/storage/v1/object/public/word-images/%'.
--     (Skips 757 legacy junk stems like 'art'/'triste' that aren't URLs.)
--   * Guards NOT LIKE '%?v=%' so re-running never double-appends.
--   * Runs in one transaction. The words BEFORE-UPDATE resolve trigger and the
--     word_image_groups AFTER-UPDATE fan-out trigger re-materialize
--     memory_trigger_image_url from the versioned source columns automatically.
--
-- Column model: memory_trigger_image_url = COALESCE(image_override_url, group.master_image_url).
-- So we only ever write the SOURCE columns and let triggers materialise the effective URL.
-- True orphans (image_group_id IS NULL, no override, pic sits only on the
-- materialized column) are PROMOTED into image_override_url — this versions them
-- AND makes them robust against the resolve trigger nulling them on future edits.

BEGIN;

-- A. Group master (concept) pics — fan-out trigger versions inheriting members. (~525)
UPDATE public.word_image_groups
   SET master_image_url = master_image_url || '?v=' || (extract(epoch FROM now()) * 1000)::bigint
 WHERE master_image_url LIKE '%/storage/v1/object/public/word-images/%'
   AND master_image_url NOT LIKE '%?v=%';

-- B. Per-word overrides — resolve trigger re-materializes memory_trigger_image_url. (~1848)
UPDATE public.words
   SET image_override_url = image_override_url || '?v=' || (extract(epoch FROM now()) * 1000)::bigint
 WHERE image_override_url LIKE '%/storage/v1/object/public/word-images/%'
   AND image_override_url NOT LIKE '%?v=%';

-- C. True orphans (no group, no override) — promote the materialized URL into the
--    override column so it is versioned and no longer fragile. (~12,240)
UPDATE public.words
   SET image_override_url = memory_trigger_image_url || '?v=' || (extract(epoch FROM now()) * 1000)::bigint
 WHERE image_group_id IS NULL
   AND image_override_url IS NULL
   AND memory_trigger_image_url LIKE '%/storage/v1/object/public/word-images/%'
   AND memory_trigger_image_url NOT LIKE '%?v=%';

COMMIT;

-- Verify (expect 0): no un-versioned storage URLs left on the effective column.
-- SELECT count(*) FROM public.words
--  WHERE memory_trigger_image_url LIKE '%/storage/v1/object/public/word-images/%'
--    AND memory_trigger_image_url NOT LIKE '%?v=%';
