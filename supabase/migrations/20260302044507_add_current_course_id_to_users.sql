-- Add current_course_id column to users table
ALTER TABLE users ADD COLUMN current_course_id uuid REFERENCES courses(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_users_current_course_id ON users(current_course_id);