-- Add is_visible column to languages table
-- Existing languages default to true (visible), new languages default to false
ALTER TABLE languages 
ADD COLUMN is_visible boolean NOT NULL DEFAULT false;

-- Set all existing languages to visible
UPDATE languages SET is_visible = true;