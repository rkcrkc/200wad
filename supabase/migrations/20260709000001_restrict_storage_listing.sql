-- S2 · Tighten public storage bucket listing (see docs/SECURITY_AUDIT.md).
--
-- Problem: avatars, audio, word-images and word-videos are public buckets
-- (objects are fetchable via /storage/v1/object/public/<bucket>/<path> with NO
-- RLS check — that is by design so <img>/<audio> tags load without auth). But
-- each also carried a broad SELECT policy for the `public` role
-- (`bucket_id = '<bucket>'`), which ADDITIONALLY let any client — including
-- anon — ENUMERATE every object via the storage list API. `avatars` is the
-- worst case: filenames are `<auth.uid()>/avatar.ext`, so listing leaked every
-- user's id.
--
-- Note: `word-audio` already has no SELECT policy yet is public and serves
-- fine — proof that fetch-by-URL does not depend on a SELECT policy. That is the
-- target end state for the rest.
--
-- Fix: drop the broad SELECT policies and replace them with least-privilege ones
-- that grant only the listing each app flow actually needs. Public fetch-by-URL
-- is unaffected (it bypasses RLS on public buckets).
--
--   * avatars      — owner may list only their own folder. Needed by
--                    src/lib/mutations/avatar.ts (`.list(user.id)` on upload/remove).
--   * word-images  — admins only. Needed by deleteEntityFiles() in
--   * word-videos    src/lib/supabase/storage.ts, called from the admin-gated
--   * audio          deleteWord() (src/lib/mutations/admin/words.ts, requireAdmin()).
--                    Music deletion uses the service-role client (bypasses RLS).
--
-- Buckets stay `public = true`: objects remain fetchable by URL (required for
-- rendering/playback), but are no longer listable/enumerable by clients.

-- avatars ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

CREATE POLICY "Avatars: owners can list their own folder"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- word-images -----------------------------------------------------------------
DROP POLICY IF EXISTS "Public read access for word images" ON storage.objects;

CREATE POLICY "Word images: admins can list"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'word-images'
    AND is_admin()
  );

-- word-videos -----------------------------------------------------------------
DROP POLICY IF EXISTS "Public read access for word videos" ON storage.objects;

CREATE POLICY "Word videos: admins can list"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'word-videos'
    AND is_admin()
  );

-- audio -----------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read access for audio" ON storage.objects;

CREATE POLICY "Audio: admins can list"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio'
    AND is_admin()
  );
