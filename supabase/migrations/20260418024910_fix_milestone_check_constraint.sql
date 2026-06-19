
ALTER TABLE user_test_scores
  DROP CONSTRAINT user_test_scores_milestone_check;

ALTER TABLE user_test_scores
  ADD CONSTRAINT user_test_scores_milestone_check
  CHECK (milestone = ANY (ARRAY['initial', '1-day', '1-week', '1-month', '1-quarter', '1-year', 'other']));
