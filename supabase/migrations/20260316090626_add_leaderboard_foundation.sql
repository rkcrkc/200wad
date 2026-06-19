
-- ============================================================================
-- Phase 1: Leaderboard Foundation
-- New tables, columns, indexes, RLS, and RPC functions
-- ============================================================================

-- 1. Add new columns to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date DATE,
  ADD COLUMN IF NOT EXISTS league TEXT DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS league_points INTEGER DEFAULT 0;

-- 2. Create user_daily_activity table
CREATE TABLE IF NOT EXISTS public.user_daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  words_studied INTEGER DEFAULT 0,
  words_mastered INTEGER DEFAULT 0,
  test_points_earned INTEGER DEFAULT 0,
  test_max_points INTEGER DEFAULT 0,
  study_time_seconds INTEGER DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, activity_date, language_id)
);

-- 3. Create weekly_leaderboard_snapshots table
CREATE TABLE IF NOT EXISTS public.weekly_leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  league TEXT NOT NULL,
  rank INTEGER NOT NULL,
  league_points INTEGER DEFAULT 0,
  words_mastered INTEGER DEFAULT 0,
  words_studied INTEGER DEFAULT 0,
  avg_words_per_day NUMERIC(10,2) DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  avg_accuracy NUMERIC(5,2) DEFAULT 0,
  reward_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create leaderboard_rewards table
CREATE TABLE IF NOT EXISTS public.leaderboard_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league TEXT NOT NULL,
  rank_min INTEGER NOT NULL,
  rank_max INTEGER NOT NULL,
  reward_cents INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create activity_flags table (anti-gaming)
CREATE TABLE IF NOT EXISTS public.activity_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  details JSONB DEFAULT '{}',
  session_id UUID,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_user_daily_activity_user_date
  ON public.user_daily_activity(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_user_daily_activity_language_date
  ON public.user_daily_activity(language_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_user
  ON public.weekly_leaderboard_snapshots(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_language_week
  ON public.weekly_leaderboard_snapshots(language_id, week_start, league);
CREATE INDEX IF NOT EXISTS idx_activity_flags_user
  ON public.activity_flags(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_flags_unresolved
  ON public.activity_flags(resolved, created_at) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_users_league
  ON public.users(league, league_points DESC);
CREATE INDEX IF NOT EXISTS idx_users_streak
  ON public.users(current_streak DESC);

-- 7. Enable RLS
ALTER TABLE public.user_daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_daily_activity
CREATE POLICY "Users can view own daily activity"
  ON public.user_daily_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage daily activity"
  ON public.user_daily_activity FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for weekly_leaderboard_snapshots (public read)
CREATE POLICY "Anyone can view leaderboard snapshots"
  ON public.weekly_leaderboard_snapshots FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage snapshots"
  ON public.weekly_leaderboard_snapshots FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for leaderboard_rewards (public read)
CREATE POLICY "Anyone can view leaderboard rewards"
  ON public.leaderboard_rewards FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage rewards"
  ON public.leaderboard_rewards FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for activity_flags (admin only)
CREATE POLICY "Users can view own flags"
  ON public.activity_flags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage flags"
  ON public.activity_flags FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 8. Seed default leaderboard rewards
INSERT INTO public.leaderboard_rewards (league, rank_min, rank_max, reward_cents) VALUES
  ('diamond', 1, 1, 1500),
  ('diamond', 2, 3, 1000),
  ('diamond', 4, 10, 300),
  ('gold', 1, 1, 1000),
  ('gold', 2, 3, 500),
  ('gold', 4, 10, 200),
  ('silver', 1, 1, 500),
  ('silver', 2, 3, 300),
  ('bronze', 1, 1, 300),
  ('bronze', 2, 3, 100);

-- 9. Seed leaderboard league config into platform_config
INSERT INTO public.platform_config (key, value, description) VALUES
  ('leaderboard_leagues', '{"leagues": ["bronze", "silver", "gold", "diamond"], "promote_top_n": 10, "relegate_bottom_n": 5, "point_formula": {"words_mastered_weight": 2, "streak_days_weight": 5, "accuracy_weight": 0.1}}', 'League system configuration'),
  ('streak_rewards', '{"milestones": [{"days": 7, "reward_cents": 100}, {"days": 30, "reward_cents": 300}, {"days": 100, "reward_cents": 1000}, {"days": 365, "reward_cents": 5000}]}', 'Streak milestone reward configuration')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = now();

-- 10. RPC: update_daily_activity — upserts daily activity and updates streak
CREATE OR REPLACE FUNCTION public.update_daily_activity(
  p_user_id UUID,
  p_language_id UUID,
  p_words_studied INTEGER DEFAULT 0,
  p_words_mastered INTEGER DEFAULT 0,
  p_test_points_earned INTEGER DEFAULT 0,
  p_test_max_points INTEGER DEFAULT 0,
  p_study_time_seconds INTEGER DEFAULT 0
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  -- Upsert daily activity
  INSERT INTO user_daily_activity (user_id, activity_date, language_id, words_studied, words_mastered, test_points_earned, test_max_points, study_time_seconds, sessions_count)
  VALUES (p_user_id, v_today, p_language_id, p_words_studied, p_words_mastered, p_test_points_earned, p_test_max_points, p_study_time_seconds, 1)
  ON CONFLICT (user_id, activity_date, language_id)
  DO UPDATE SET
    words_studied = user_daily_activity.words_studied + EXCLUDED.words_studied,
    words_mastered = user_daily_activity.words_mastered + EXCLUDED.words_mastered,
    test_points_earned = user_daily_activity.test_points_earned + EXCLUDED.test_points_earned,
    test_max_points = user_daily_activity.test_max_points + EXCLUDED.test_max_points,
    study_time_seconds = user_daily_activity.study_time_seconds + EXCLUDED.study_time_seconds,
    sessions_count = user_daily_activity.sessions_count + 1,
    updated_at = now();

  -- Update streak on users table
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM users WHERE id = p_user_id;

  IF v_last_activity = v_today THEN
    -- Already active today, no streak change
    NULL;
  ELSIF v_last_activity = v_today - INTERVAL '1 day' THEN
    -- Active yesterday, increment streak
    v_current_streak := COALESCE(v_current_streak, 0) + 1;
    v_longest_streak := GREATEST(COALESCE(v_longest_streak, 0), v_current_streak);
    UPDATE users SET
      current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_activity_date = v_today,
      updated_at = now()
    WHERE id = p_user_id;
  ELSE
    -- Gap in activity, reset streak to 1
    UPDATE users SET
      current_streak = 1,
      longest_streak = GREATEST(COALESCE(longest_streak, 0), 1),
      last_activity_date = v_today,
      updated_at = now()
    WHERE id = p_user_id;
  END IF;

  -- Check for streak milestone rewards
  SELECT current_streak INTO v_current_streak FROM users WHERE id = p_user_id;

  -- Auto-award streak rewards from platform_config
  DECLARE
    v_streak_config JSONB;
    v_milestone JSONB;
    v_milestone_days INTEGER;
    v_reward_cents INTEGER;
    v_already_awarded BOOLEAN;
  BEGIN
    SELECT value::jsonb INTO v_streak_config FROM platform_config WHERE key = 'streak_rewards';
    IF v_streak_config IS NOT NULL THEN
      FOR v_milestone IN SELECT * FROM jsonb_array_elements(v_streak_config->'milestones')
      LOOP
        v_milestone_days := (v_milestone->>'days')::INTEGER;
        v_reward_cents := (v_milestone->>'reward_cents')::INTEGER;

        IF v_current_streak >= v_milestone_days THEN
          -- Check if already awarded
          SELECT EXISTS(
            SELECT 1 FROM credit_transactions
            WHERE user_id = p_user_id
              AND type = 'streak_reward'
              AND reference_id = 'streak_' || v_milestone_days::TEXT
          ) INTO v_already_awarded;

          IF NOT v_already_awarded THEN
            INSERT INTO credit_transactions (user_id, amount_cents, type, status, description, reference_id)
            VALUES (p_user_id, v_reward_cents, 'streak_reward', 'completed',
                    v_milestone_days || '-day streak reward',
                    'streak_' || v_milestone_days::TEXT);
          END IF;
        END IF;
      END LOOP;
    END IF;
  END;
END;
$$;

-- 11. RPC: get_leaderboard — returns ranked users
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_language_id UUID,
  p_metric TEXT DEFAULT 'avg_words_per_day',
  p_period TEXT DEFAULT 'week',
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  username TEXT,
  name TEXT,
  avatar_url TEXT,
  nationalities TEXT[],
  league TEXT,
  current_streak INTEGER,
  metric_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
BEGIN
  -- Determine date range
  IF p_period = 'week' THEN
    v_start_date := date_trunc('week', CURRENT_DATE)::DATE;
  ELSIF p_period = 'month' THEN
    v_start_date := date_trunc('month', CURRENT_DATE)::DATE;
  ELSE
    v_start_date := '2000-01-01'::DATE; -- all-time
  END IF;

  IF p_metric = 'avg_words_per_day' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY
        CASE WHEN COUNT(DISTINCT da.activity_date) > 0
             THEN SUM(da.words_studied)::NUMERIC / COUNT(DISTINCT da.activity_date)
             ELSE 0 END DESC
      ) AS rank,
      u.id AS user_id,
      u.username,
      u.name,
      u.avatar_url,
      u.nationalities,
      u.league,
      u.current_streak,
      CASE WHEN COUNT(DISTINCT da.activity_date) > 0
           THEN ROUND(SUM(da.words_studied)::NUMERIC / COUNT(DISTINCT da.activity_date), 1)
           ELSE 0 END AS metric_value
    FROM users u
    JOIN user_daily_activity da ON da.user_id = u.id
    WHERE da.language_id = p_language_id
      AND da.activity_date >= v_start_date
    GROUP BY u.id, u.username, u.name, u.avatar_url, u.nationalities, u.league, u.current_streak
    HAVING SUM(da.words_studied) > 0
    ORDER BY metric_value DESC
    LIMIT p_limit;

  ELSIF p_metric = 'words_mastered' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY SUM(da.words_mastered) DESC) AS rank,
      u.id AS user_id,
      u.username,
      u.name,
      u.avatar_url,
      u.nationalities,
      u.league,
      u.current_streak,
      SUM(da.words_mastered)::NUMERIC AS metric_value
    FROM users u
    JOIN user_daily_activity da ON da.user_id = u.id
    WHERE da.language_id = p_language_id
      AND da.activity_date >= v_start_date
    GROUP BY u.id, u.username, u.name, u.avatar_url, u.nationalities, u.league, u.current_streak
    HAVING SUM(da.words_mastered) > 0
    ORDER BY metric_value DESC
    LIMIT p_limit;

  ELSIF p_metric = 'streak' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY u.current_streak DESC) AS rank,
      u.id AS user_id,
      u.username,
      u.name,
      u.avatar_url,
      u.nationalities,
      u.league,
      u.current_streak,
      u.current_streak::NUMERIC AS metric_value
    FROM users u
    WHERE u.current_streak > 0
      AND EXISTS (
        SELECT 1 FROM user_daily_activity da
        WHERE da.user_id = u.id AND da.language_id = p_language_id
      )
    ORDER BY u.current_streak DESC
    LIMIT p_limit;

  END IF;
END;
$$;

-- 12. RPC: get_user_leaderboard_position
CREATE OR REPLACE FUNCTION public.get_user_leaderboard_position(
  p_user_id UUID,
  p_language_id UUID,
  p_metric TEXT DEFAULT 'avg_words_per_day',
  p_period TEXT DEFAULT 'week'
) RETURNS TABLE(
  rank BIGINT,
  metric_value NUMERIC,
  total_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_user_value NUMERIC;
  v_rank BIGINT;
  v_total BIGINT;
BEGIN
  IF p_period = 'week' THEN
    v_start_date := date_trunc('week', CURRENT_DATE)::DATE;
  ELSIF p_period = 'month' THEN
    v_start_date := date_trunc('month', CURRENT_DATE)::DATE;
  ELSE
    v_start_date := '2000-01-01'::DATE;
  END IF;

  IF p_metric = 'avg_words_per_day' THEN
    SELECT CASE WHEN COUNT(DISTINCT da.activity_date) > 0
                THEN ROUND(SUM(da.words_studied)::NUMERIC / COUNT(DISTINCT da.activity_date), 1)
                ELSE 0 END
    INTO v_user_value
    FROM user_daily_activity da
    WHERE da.user_id = p_user_id
      AND da.language_id = p_language_id
      AND da.activity_date >= v_start_date;

    SELECT COUNT(*) + 1 INTO v_rank
    FROM (
      SELECT da2.user_id,
        CASE WHEN COUNT(DISTINCT da2.activity_date) > 0
             THEN ROUND(SUM(da2.words_studied)::NUMERIC / COUNT(DISTINCT da2.activity_date), 1)
             ELSE 0 END AS val
      FROM user_daily_activity da2
      WHERE da2.language_id = p_language_id
        AND da2.activity_date >= v_start_date
        AND da2.user_id != p_user_id
      GROUP BY da2.user_id
      HAVING SUM(da2.words_studied) > 0
    ) ranked WHERE ranked.val > v_user_value;

    SELECT COUNT(DISTINCT da3.user_id) INTO v_total
    FROM user_daily_activity da3
    WHERE da3.language_id = p_language_id
      AND da3.activity_date >= v_start_date
      AND EXISTS (SELECT 1 FROM user_daily_activity x WHERE x.user_id = da3.user_id AND x.words_studied > 0);

  ELSIF p_metric = 'words_mastered' THEN
    SELECT COALESCE(SUM(da.words_mastered), 0)
    INTO v_user_value
    FROM user_daily_activity da
    WHERE da.user_id = p_user_id
      AND da.language_id = p_language_id
      AND da.activity_date >= v_start_date;

    SELECT COUNT(*) + 1 INTO v_rank
    FROM (
      SELECT da2.user_id, SUM(da2.words_mastered) AS val
      FROM user_daily_activity da2
      WHERE da2.language_id = p_language_id
        AND da2.activity_date >= v_start_date
        AND da2.user_id != p_user_id
      GROUP BY da2.user_id
      HAVING SUM(da2.words_mastered) > 0
    ) ranked WHERE ranked.val > v_user_value;

    SELECT COUNT(DISTINCT da3.user_id) INTO v_total
    FROM user_daily_activity da3
    WHERE da3.language_id = p_language_id
      AND da3.activity_date >= v_start_date;

  ELSIF p_metric = 'streak' THEN
    SELECT COALESCE(u.current_streak, 0) INTO v_user_value
    FROM users u WHERE u.id = p_user_id;

    SELECT COUNT(*) + 1 INTO v_rank
    FROM users u2
    WHERE u2.current_streak > v_user_value
      AND u2.id != p_user_id
      AND EXISTS (
        SELECT 1 FROM user_daily_activity da WHERE da.user_id = u2.id AND da.language_id = p_language_id
      );

    SELECT COUNT(*) INTO v_total
    FROM users u3
    WHERE u3.current_streak > 0
      AND EXISTS (
        SELECT 1 FROM user_daily_activity da WHERE da.user_id = u3.id AND da.language_id = p_language_id
      );
  END IF;

  RETURN QUERY SELECT COALESCE(v_rank, 1), COALESCE(v_user_value, 0), COALESCE(v_total, 0);
END;
$$;
