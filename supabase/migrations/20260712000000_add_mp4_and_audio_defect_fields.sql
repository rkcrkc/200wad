-- Add MP4 picture defect and audio re-record developer flags to words table
ALTER TABLE public.words
ADD COLUMN IF NOT EXISTS picture_mp4_defect boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS audio_rerecord boolean DEFAULT false;
