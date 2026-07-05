-- ============================================================================
-- Memory Trigger Videos — add the missing word-videos public-read (SELECT) policy
-- ============================================================================
--
-- The original word-videos migration created INSERT/UPDATE/DELETE policies but
-- omitted a SELECT policy. Supabase Storage's upload performs an
-- INSERT ... RETURNING, which under RLS also requires a SELECT policy to read
-- the newly-inserted row back. Without it, every admin upload failed with
-- "new row violates row-level security policy" even though the INSERT WITH CHECK
-- (bucket_id = 'word-videos' AND is_admin()) passed.
--
-- This mirrors the word-images public-read policy
-- (20260516070817_word_images_storage_select_policy.sql).
-- ============================================================================

DROP POLICY IF EXISTS "Public read access for word videos" ON storage.objects;

CREATE POLICY "Public read access for word videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'word-videos');
