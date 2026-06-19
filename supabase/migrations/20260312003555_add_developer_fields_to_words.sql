-- Add developer debugging fields to words table
ALTER TABLE public.words
ADD COLUMN IF NOT EXISTS developer_notes text,
ADD COLUMN IF NOT EXISTS picture_wrong boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS picture_wrong_notes text,
ADD COLUMN IF NOT EXISTS picture_missing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS picture_bad_svg boolean DEFAULT false;