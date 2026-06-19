-- Add a SELECT policy for the word-images bucket on storage.objects.
--
-- The bucket has `public = true`, so anonymous downloads via the public URL
-- already work without RLS. However, Supabase Storage's upload endpoint
-- performs an INSERT ... RETURNING to hand back the new row, which Postgres
-- evaluates against RLS for both INSERT *and* SELECT. With no SELECT policy
-- for this bucket, the RETURNING fails with "new row violates row-level
-- security policy", which Storage surfaces as a 400.
--
-- This mirrors the "Public read access for audio" policy on the audio
-- bucket: authenticated and anon roles can read storage.objects rows for
-- word-images. The bucket is already public so this does not change what
-- is visible to clients.

CREATE POLICY "Public read access for word images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'word-images');
