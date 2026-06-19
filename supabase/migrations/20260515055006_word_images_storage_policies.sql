-- Storage RLS policies for the word-images bucket.
--
-- The bucket was created out-of-band in the Supabase dashboard and marked
-- public for reads, but no INSERT/UPDATE/DELETE policies existed on
-- storage.objects, so every admin upload attempt was silently rejected by
-- RLS. Reads continued to work because the bucket has `public = true`.
--
-- Writes are gated by public.is_admin(), which mirrors the middleware
-- admin check (user_metadata.role = 'admin').

CREATE POLICY "Admins can upload word images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'word-images' AND public.is_admin());

CREATE POLICY "Admins can update word images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'word-images' AND public.is_admin())
WITH CHECK (bucket_id = 'word-images' AND public.is_admin());

CREATE POLICY "Admins can delete word images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'word-images' AND public.is_admin());
