-- Add thumbnail_url to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;