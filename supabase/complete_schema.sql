-- ============================================
-- 200WAD COMPLETE DATABASE SCHEMA
-- ============================================
-- 
-- Copy and paste this entire file into Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
--
-- This includes:
-- 1. All tables (13 total)
-- 2. RLS policies
-- 3. Performance indexes
-- 4. Triggers
-- 5. Auth trigger for auto-creating user profiles
-- 6. Seed data (Italian language with sample lesson)
--
-- ============================================


-- ============================================
-- PART 1: CORE CONTENT TABLES
-- ============================================

-- Languages
CREATE TABLE languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Courses
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_id UUID REFERENCES languages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  cefr_range TEXT,
  word_count INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,
  free_lessons INTEGER DEFAULT 10,
  price_cents INTEGER DEFAULT 5000,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lessons
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT,
  word_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, number) -- Ensure unique lesson numbers within a course
);

-- Words (reusable vocabulary entries linked to languages)
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_id UUID NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
  headword TEXT NOT NULL,        -- The display form learners see (e.g., "l'avventura")
  lemma TEXT NOT NULL,           -- Base form for grouping/search (e.g., "avventura")
  english TEXT NOT NULL,         -- English translation
  part_of_speech TEXT,
  notes TEXT,
  memory_trigger_text TEXT,
  memory_trigger_image_url TEXT,
  audio_url_english TEXT,
  audio_url_foreign TEXT,
  audio_url_trigger TEXT,
  related_word_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Lesson-Word join table (many-to-many relationship)
CREATE TABLE lesson_words (
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (lesson_id, word_id)
);

-- Indexes for words table
CREATE INDEX idx_words_language_id ON words(language_id);
CREATE INDEX idx_words_language_lemma ON words(language_id, lemma);
CREATE INDEX idx_words_language_headword ON words(language_id, headword);

-- Indexes for lesson_words table
CREATE INDEX idx_lesson_words_sort ON lesson_words(lesson_id, sort_order);
CREATE INDEX idx_lesson_words_word ON lesson_words(word_id);

-- Example Sentences
CREATE TABLE example_sentences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id UUID REFERENCES words(id) ON DELETE CASCADE,
  foreign_sentence TEXT NOT NULL,
  english_sentence TEXT NOT NULL,
  thumbnail_image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================
-- PART 2: USER TABLES
-- ============================================

-- Users (extends Supabase auth.users)
-- Note: current_language_id is a quick-access cache; source of truth is user_languages.is_current
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  hometown TEXT,
  location TEXT,
  nationalities TEXT[] DEFAULT '{}',
  current_language_id UUID REFERENCES languages(id),
  total_vocabulary_count INTEGER DEFAULT 0 CHECK (total_vocabulary_count >= 0),
  words_per_day INTEGER DEFAULT 10 CHECK (words_per_day BETWEEN 1 AND 100),
  two_factor_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Languages (languages a user is learning)
CREATE TABLE user_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  language_id UUID REFERENCES languages(id) ON DELETE CASCADE,
  is_current BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, language_id)
);

-- Ensure only one current language per user
CREATE UNIQUE INDEX uniq_user_current_language ON user_languages(user_id) WHERE is_current = true;


-- ============================================
-- PART 3: PROGRESS TRACKING TABLES
-- ============================================

-- User Word Progress (per-word tracking for spaced repetition)
CREATE TABLE user_word_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  word_id UUID REFERENCES words(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not-started' CHECK (status IN ('not-started', 'studying', 'mastered')),
  
  -- Study tracking
  correct_streak INTEGER DEFAULT 0 CHECK (correct_streak >= 0),
  last_studied_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  
  -- Test Mode tracking
  times_tested INTEGER DEFAULT 0 CHECK (times_tested >= 0),
  total_points_earned INTEGER DEFAULT 0 CHECK (total_points_earned >= 0),
  best_clue_level INTEGER DEFAULT 2 CHECK (best_clue_level BETWEEN 0 AND 2),
  last_mistake_count INTEGER CHECK (last_mistake_count >= 0),
  
  -- User notes feature
  user_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, word_id)
);

-- User Lesson Progress
CREATE TABLE user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not-started' CHECK (status IN ('not-started', 'studying', 'mastered')),
  completion_percent INTEGER DEFAULT 0 CHECK (completion_percent BETWEEN 0 AND 100),
  words_mastered INTEGER DEFAULT 0 CHECK (words_mastered >= 0),
  total_study_time_seconds INTEGER DEFAULT 0 CHECK (total_study_time_seconds >= 0),
  last_studied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Study Sessions
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('study', 'test')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  words_studied INTEGER DEFAULT 0 CHECK (words_studied >= 0),
  words_mastered INTEGER DEFAULT 0 CHECK (words_mastered >= 0),
  duration_seconds INTEGER CHECK (duration_seconds >= 0),
  CHECK (ended_at IS NULL OR ended_at >= started_at) -- End time must be after start
);

-- User Test Scores
CREATE TABLE user_test_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  milestone TEXT CHECK (milestone IN ('initial', 'day', 'week', 'month', 'quarter', 'year', 'other')),
  total_questions INTEGER NOT NULL CHECK (total_questions >= 0),
  correct_answers INTEGER NOT NULL CHECK (correct_answers >= 0),
  points_earned INTEGER NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
  max_points INTEGER NOT NULL DEFAULT 0 CHECK (max_points >= 0),
  score_percent INTEGER NOT NULL DEFAULT 0 CHECK (score_percent BETWEEN 0 AND 100),
  duration_seconds INTEGER CHECK (duration_seconds >= 0),
  new_words_count INTEGER DEFAULT 0 CHECK (new_words_count >= 0),
  mastered_words_count INTEGER DEFAULT 0 CHECK (mastered_words_count >= 0),
  taken_at TIMESTAMPTZ DEFAULT now(),
  CHECK (correct_answers <= total_questions) -- Can't have more correct than total
);

-- Test Questions (individual answers)
CREATE TABLE test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_score_id UUID REFERENCES user_test_scores(id) ON DELETE CASCADE,
  word_id UUID REFERENCES words(id) ON DELETE CASCADE,
  user_answer TEXT,
  correct_answer TEXT NOT NULL,
  clue_level INTEGER DEFAULT 0 CHECK (clue_level BETWEEN 0 AND 2),
  mistake_count INTEGER DEFAULT 0 CHECK (mistake_count >= 0),
  points_earned INTEGER DEFAULT 0 CHECK (points_earned BETWEEN 0 AND 3),
  max_points INTEGER DEFAULT 3 CHECK (max_points BETWEEN 1 AND 3),
  time_to_answer_ms INTEGER,
  answered_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================
-- PART 4: NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('lesson_reminder', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================
-- PART 5: TRIGGERS
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_languages_updated_at BEFORE UPDATE ON languages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_words_updated_at BEFORE UPDATE ON words FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_word_progress_updated_at BEFORE UPDATE ON user_word_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_lesson_progress_updated_at BEFORE UPDATE ON user_lesson_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Sync email when user updates it in auth.users
CREATE OR REPLACE FUNCTION handle_user_email_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.users SET email = NEW.email WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_email_update();


-- ============================================
-- PART 6: RLS POLICIES
-- ============================================

-- Admin helper function
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Content tables (public read, admin write)
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON languages FOR SELECT USING (true);
CREATE POLICY "Admin write" ON languages FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON courses FOR SELECT USING (true);
CREATE POLICY "Admin write" ON courses FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON lessons FOR SELECT USING (true);
CREATE POLICY "Admin write" ON lessons FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON words FOR SELECT USING (true);
CREATE POLICY "Admin write" ON words FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE example_sentences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON example_sentences FOR SELECT USING (true);
CREATE POLICY "Admin write" ON example_sentences FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- User Languages
ALTER TABLE user_languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON user_languages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own" ON user_languages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own" ON user_languages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own" ON user_languages FOR DELETE USING (auth.uid() = user_id);

-- User Word Progress
ALTER TABLE user_word_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON user_word_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own" ON user_word_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own" ON user_word_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own" ON user_word_progress FOR DELETE USING (auth.uid() = user_id);

-- User Lesson Progress
ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON user_lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own" ON user_lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own" ON user_lesson_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own" ON user_lesson_progress FOR DELETE USING (auth.uid() = user_id);

-- Study Sessions
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own" ON study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own" ON study_sessions FOR UPDATE USING (auth.uid() = user_id);

-- User Test Scores
ALTER TABLE user_test_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON user_test_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own" ON user_test_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Test Questions
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON test_questions FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM user_test_scores 
    WHERE user_test_scores.id = test_questions.test_score_id 
    AND user_test_scores.user_id = auth.uid()
  ));
CREATE POLICY "Users insert own" ON test_questions FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_test_scores 
    WHERE user_test_scores.id = test_questions.test_score_id 
    AND user_test_scores.user_id = auth.uid()
  ));

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own" ON notifications FOR UPDATE USING (auth.uid() = user_id);


-- ============================================
-- PART 7: INDEXES
-- ============================================

-- Content lookups
CREATE INDEX idx_courses_language ON courses(language_id);
CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_words_lesson ON words(lesson_id);
CREATE INDEX idx_example_sentences_word ON example_sentences(word_id);

-- User lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_languages_user ON user_languages(user_id);

-- Progress queries
CREATE INDEX idx_user_word_progress_user ON user_word_progress(user_id);
CREATE INDEX idx_user_word_progress_word ON user_word_progress(word_id);
CREATE INDEX idx_user_word_progress_next_review ON user_word_progress(user_id, next_review_at);
CREATE INDEX idx_user_lesson_progress_user ON user_lesson_progress(user_id);

-- Test queries
CREATE INDEX idx_user_test_scores_user ON user_test_scores(user_id);
CREATE INDEX idx_user_test_scores_lesson ON user_test_scores(lesson_id);
CREATE INDEX idx_test_questions_test ON test_questions(test_score_id);
CREATE INDEX idx_test_questions_word ON test_questions(word_id);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;


-- ============================================
-- PART 8: SEED DATA
-- ============================================

-- Italian Language
INSERT INTO languages (id, name, flag, native_name, sort_order)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Italian',
  '🇮🇹',
  'Italiano',
  1
);

-- Beginner Course
INSERT INTO courses (id, language_id, name, description, level, cefr_range, word_count, total_lessons, free_lessons, price_cents, sort_order)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Italian for Beginners',
  'Start your Italian journey with essential words and phrases.',
  'beginner',
  'A1-A2',
  200,
  10,
  3,
  4900,
  1
);

-- Lesson 1: Greetings
INSERT INTO lessons (id, course_id, number, title, emoji, word_count, sort_order)
VALUES (
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  1,
  'Greetings',
  '👋',
  10,
  1
);

-- Words for Lesson 1
INSERT INTO words (id, lesson_id, english, foreign_word, part_of_speech, notes, memory_trigger_text, sort_order)
VALUES
  ('d4e5f6a7-b8c9-0123-def0-234567890123', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'hello', 'ciao', 'interjection', 'Used for both hello and goodbye in informal situations.', 'Think of "chow" - like eating, a friendly greeting!', 1),
  ('e5f6a7b8-c9d0-1234-ef01-345678901234', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'good morning', 'buongiorno', 'interjection', 'Formal greeting used until early afternoon.', 'BUON (good) + GIORNO (day) = Good day!', 2),
  ('f6a7b8c9-d0e1-2345-f012-456789012345', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'good evening', 'buonasera', 'interjection', 'Used from late afternoon onwards.', 'BUONA (good) + SERA (evening)', 3),
  ('a7b8c9d0-e1f2-3456-0123-567890123456', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'good night', 'buonanotte', 'interjection', 'Said when going to bed or leaving late at night.', 'BUONA (good) + NOTTE (night)', 4),
  ('b8c9d0e1-f2a3-4567-1234-678901234567', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'goodbye', 'arrivederci', 'interjection', 'Formal goodbye. Use "ciao" for informal.', 'Arrive + derci = Until we arrive again!', 5),
  ('c9d0e1f2-a3b4-5678-2345-789012345678', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'please', 'per favore', 'adverb', 'Polite way to make requests.', 'PER FAVOR(e) - do me a favor!', 6),
  ('d0e1f2a3-b4c5-6789-3456-890123456789', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'thank you', 'grazie', 'interjection', 'Express gratitude. Add "mille" for emphasis.', 'GRAZI-e sounds like "grassy" - grateful for the grass!', 7),
  ('e1f2a3b4-c5d6-7890-4567-901234567890', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'you are welcome', 'prego', 'interjection', 'Also means "I pray" or "go ahead".', 'PREGO = "I pray you accept my thanks"', 8),
  ('f2a3b4c5-d6e7-8901-5678-012345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'excuse me', 'scusa', 'interjection', 'Informal. Use "scusi" for formal.', 'Like "excuse" - SCUSA!', 9),
  ('a3b4c5d6-e7f8-9012-6789-123456789012', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'yes', 'sì', 'adverb', 'Simple affirmative.', 'SEE? Yes, I see!', 10);

-- Example Sentences
INSERT INTO example_sentences (word_id, foreign_sentence, english_sentence, sort_order)
VALUES
  ('d4e5f6a7-b8c9-0123-def0-234567890123', 'Ciao, come stai?', 'Hello, how are you?', 1),
  ('d4e5f6a7-b8c9-0123-def0-234567890123', 'Ciao, a domani!', 'Bye, see you tomorrow!', 2),
  ('e5f6a7b8-c9d0-1234-ef01-345678901234', 'Buongiorno, signora!', 'Good morning, madam!', 1),
  ('f6a7b8c9-d0e1-2345-f012-456789012345', 'Buonasera a tutti!', 'Good evening everyone!', 1),
  ('d0e1f2a3-b4c5-6789-3456-890123456789', 'Grazie mille!', 'Thank you very much!', 1);


-- ============================================
-- DONE!
-- ============================================
-- Your database is now set up with:
-- - 13 tables
-- - RLS policies (public content, user-owned data)
-- - Performance indexes
-- - Auto-updating timestamps
-- - Auto-creating user profiles on signup
-- - Sample Italian content for testing
-- ============================================
