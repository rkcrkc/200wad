-- Study Music Tracks table for admin-managed background music
CREATE TABLE study_music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  author TEXT,
  description TEXT,
  category TEXT,
  bpm INTEGER,
  duration_seconds INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for active tracks sorted by order
CREATE INDEX idx_study_music_tracks_active ON study_music_tracks(is_active, sort_order)
WHERE is_active = true;

-- RLS policies
ALTER TABLE study_music_tracks ENABLE ROW LEVEL SECURITY;

-- Anyone can read active tracks
CREATE POLICY "Anyone can view active tracks"
  ON study_music_tracks
  FOR SELECT
  USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage tracks"
  ON study_music_tracks
  FOR ALL
  TO authenticated
  USING (
    (SELECT (raw_user_meta_data->>'is_admin')::boolean FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT (raw_user_meta_data->>'is_admin')::boolean FROM auth.users WHERE id = auth.uid())
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_study_music_tracks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER study_music_tracks_updated_at
  BEFORE UPDATE ON study_music_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_study_music_tracks_updated_at();

-- Create storage bucket for audio files (if not exists)
-- Note: This needs to be done via Supabase dashboard or CLI as SQL can't create buckets
-- Bucket: audio
-- Folder: study-music
-- Public access: true
