-- 200WAD Row Level Security Policies
-- Run this AFTER 001_initial_schema.sql

-- ============================================
-- ADMIN HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- CONTENT TABLES (Public Read, Admin Write)
-- ============================================

-- Languages
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON languages FOR SELECT USING (true);
CREATE POLICY "Admin write" ON languages FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON courses FOR SELECT USING (true);
CREATE POLICY "Admin write" ON courses FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Lessons
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON lessons FOR SELECT USING (true);
CREATE POLICY "Admin write" ON lessons FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Words
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON words FOR SELECT USING (true);
CREATE POLICY "Admin write" ON words FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Example Sentences
ALTER TABLE example_sentences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON example_sentences FOR SELECT USING (true);
CREATE POLICY "Admin write" ON example_sentences FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- USER TABLE (Users own their data)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- USER DATA TABLES (Users own their data)
-- ============================================

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
