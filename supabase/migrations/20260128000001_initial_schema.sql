-- 200WAD Initial Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- ============================================
-- CORE CONTENT TABLES
-- ============================================

-- Languages
CREATE TABLE languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  flag TEXT NOT NULL,
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

-- Words
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  english TEXT NOT NULL,
  foreign_word TEXT NOT NULL,
  part_of_speech TEXT,
  notes TEXT,
  memory_trigger_text TEXT,
  memory_trigger_image_url TEXT,
  audio_url_english TEXT,
  audio_url_foreign TEXT,
  audio_url_trigger TEXT,
  related_word_ids UUID[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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
-- USER TABLES
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
-- PROGRESS TRACKING TABLES
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
-- NOTIFICATIONS TABLE
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
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================

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
