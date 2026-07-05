-- ============================================================================
-- Memory Trigger Videos — relax the word-videos MIME allowlist
-- ============================================================================
--
-- The original ['video/mp4'] allowlist rejected real .mp4 uploads with HTTP 400.
-- Supabase Storage re-sniffs the uploaded bytes server-side, and many valid mp4
-- files resolve to an mp4-family mime that isn't the exact string 'video/mp4'
-- (e.g. application/mp4, video/x-m4v), so the strict allowlist blocked them.
--
-- Mirror the proven-working word-images bucket (allowed_mime_types = NULL). The
-- real constraints are still enforced elsewhere:
--   * client-side validateTriggerVideo() guard (mp4 + 5 MB)
--   * the bucket's 5 MB file_size_limit
--   * admin-only write RLS (public.is_admin())
-- ============================================================================

UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'word-videos';
