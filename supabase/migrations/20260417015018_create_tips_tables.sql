-- Enum for where tips display (extensible later)
CREATE TYPE display_context AS ENUM ('study_sidebar');

-- Tips content table
CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  body TEXT NOT NULL,
  display_context display_context NOT NULL DEFAULT 'study_sidebar',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Junction: tips ↔ words (many-to-many)
CREATE TABLE tip_words (
  tip_id UUID NOT NULL REFERENCES tips(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tip_id, word_id)
);
CREATE INDEX idx_tip_words_word_id ON tip_words(word_id);

-- User dismissals (per-tip globally, not per-word)
CREATE TABLE user_tip_dismissals (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tip_id UUID NOT NULL REFERENCES tips(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, tip_id)
);

-- RLS
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON tips FOR SELECT USING (true);
CREATE POLICY "Admin write" ON tips FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE tip_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON tip_words FOR SELECT USING (true);
CREATE POLICY "Admin write" ON tip_words FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE user_tip_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own" ON user_tip_dismissals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own" ON user_tip_dismissals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own" ON user_tip_dismissals FOR DELETE USING (auth.uid() = user_id);