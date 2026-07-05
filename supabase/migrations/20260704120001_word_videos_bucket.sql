-- ============================================================================
-- Memory Trigger Videos — dedicated word-videos storage bucket + RLS
-- ============================================================================
--
-- MP4 memory-trigger clips live in their own bucket (separate from word-images)
-- so we can enforce a platform-level size cap and MIME allowlist:
--   * public reads (like word-images)
--   * file_size_limit = 5 MB  (real clips are ~1 MB; 5x headroom)
--   * allowed_mime_types = video/mp4 only
--
-- Writes are gated by public.is_admin(), mirroring the word-images policies in
-- 20260515055006_word_images_storage_policies.sql.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('word-videos', 'word-videos', true, 5242880, ARRAY['video/mp4'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Admins can upload word videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'word-videos' AND public.is_admin());

CREATE POLICY "Admins can update word videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'word-videos' AND public.is_admin())
WITH CHECK (bucket_id = 'word-videos' AND public.is_admin());

CREATE POLICY "Admins can delete word videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'word-videos' AND public.is_admin());
