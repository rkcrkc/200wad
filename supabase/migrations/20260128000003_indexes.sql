-- 200WAD Performance Indexes
-- Run this AFTER 002_rls_policies.sql

-- ============================================
-- CONTENT LOOKUPS
-- ============================================

CREATE INDEX idx_courses_language ON courses(language_id);
CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_words_lesson ON words(lesson_id);
CREATE INDEX idx_example_sentences_word ON example_sentences(word_id);

-- ============================================
-- USER LOOKUPS
-- ============================================

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_languages_user ON user_languages(user_id);

-- ============================================
-- PROGRESS QUERIES
-- ============================================

CREATE INDEX idx_user_word_progress_user ON user_word_progress(user_id);
CREATE INDEX idx_user_word_progress_word ON user_word_progress(word_id);
CREATE INDEX idx_user_word_progress_next_review ON user_word_progress(user_id, next_review_at);
CREATE INDEX idx_user_lesson_progress_user ON user_lesson_progress(user_id);

-- ============================================
-- TEST QUERIES
-- ============================================

CREATE INDEX idx_user_test_scores_user ON user_test_scores(user_id);
CREATE INDEX idx_user_test_scores_lesson ON user_test_scores(lesson_id);
CREATE INDEX idx_test_questions_test ON test_questions(test_score_id);
CREATE INDEX idx_test_questions_word ON test_questions(word_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
