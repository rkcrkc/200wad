-- Add admin_notes column for private notes not shown to students
ALTER TABLE words ADD COLUMN admin_notes text;