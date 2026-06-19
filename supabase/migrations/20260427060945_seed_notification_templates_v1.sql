-- Seed default notification templates per docs/NOTIFICATIONS_SYSTEM.md
-- All marked is_system=true so admins can edit content but not delete (only
-- disable). Use ON CONFLICT (key) DO NOTHING so re-running the migration is
-- safe and any admin-customised content is preserved.

INSERT INTO notification_templates
  (key, label, description, type, enabled, title, message, channels, default_data, is_system)
VALUES

-- ============================================================================
-- system.*
-- ============================================================================
(
  'system.welcome',
  'Welcome',
  'Sent once when a user confirms their email and lands in the app.',
  'system',
  true,
  'Welcome to 200WAD!',
  'You''re all set to start learning. Pick a course and dive into your first lesson.',
  ARRAY['in_app'],
  '{"severity":"info","cta":{"label":"Start learning","href":"/dashboard"}}'::jsonb,
  true
),

-- ============================================================================
-- billing.*
-- (billing.payment_failed already seeded in initial migration)
-- ============================================================================
(
  'billing.subscription_renewed',
  'Subscription renewed',
  'Sent when a recurring Stripe invoice is paid (renewal cycle).',
  'billing',
  true,
  'Subscription renewed',
  'Your subscription has been renewed. Thanks for sticking with us!',
  ARRAY['in_app'],
  '{"severity":"info","cta":{"label":"View billing","href":"/account/billing"}}'::jsonb,
  true
),
(
  'billing.subscription_cancelled',
  'Subscription cancelled',
  'Sent when a Stripe subscription is deleted (user cancellation or end of life).',
  'billing',
  true,
  'Subscription cancelled',
  'Your subscription has been cancelled. You''ll keep access until the end of the current period.',
  ARRAY['in_app'],
  '{"severity":"warning","cta":{"label":"Reactivate","href":"/account/billing"}}'::jsonb,
  true
),
(
  'billing.plan_changed',
  'Plan changed',
  'Sent when a Stripe subscription''s price/plan is updated.',
  'billing',
  true,
  'Plan updated',
  'Your plan has been updated. Visit billing to see the new details.',
  ARRAY['in_app'],
  '{"severity":"info","cta":{"label":"View billing","href":"/account/billing"}}'::jsonb,
  true
),

-- ============================================================================
-- achievement.*
-- ============================================================================
(
  'achievement.first_word_mastered',
  'First word mastered',
  'Sent the first time a user transitions any word to mastered status.',
  'achievement',
  true,
  'First word mastered!',
  'You just mastered your first word. Keep the streak going!',
  ARRAY['in_app'],
  '{"severity":"info"}'::jsonb,
  true
),
(
  'achievement.first_perfect_test',
  'First perfect test',
  'Sent the first time a user scores 100% on a non-retest milestone test.',
  'achievement',
  true,
  'Perfect score!',
  'You aced your first test with no mistakes. Nicely done.',
  ARRAY['in_app'],
  '{"severity":"info"}'::jsonb,
  true
),
(
  'achievement.first_lesson_complete',
  'First lesson complete',
  'Sent the first time a user fully masters every word in a lesson.',
  'achievement',
  true,
  'First lesson complete!',
  'You mastered every word in a lesson. One down, many to go.',
  ARRAY['in_app'],
  '{"severity":"info","cta":{"label":"Pick next lesson","href":"/dashboard"}}'::jsonb,
  true
),
(
  'achievement.words_mastered_milestone',
  'Words mastered milestone',
  'Parametric. Sent when cumulative mastered count crosses 25/50/100/200/500. Pass {count} via dataOverrides.',
  'achievement',
  true,
  '{count} words mastered!',
  'You''ve mastered {count} words. Each one is yours for life.',
  ARRAY['in_app'],
  '{"severity":"info"}'::jsonb,
  true
),
(
  'achievement.lessons_complete_milestone',
  'Lessons complete milestone',
  'Parametric. Sent when cumulative fully-mastered lesson count crosses 5/10/25/50. Pass {count} via dataOverrides.',
  'achievement',
  true,
  '{count} lessons complete!',
  'You''ve fully mastered {count} lessons. Momentum is building.',
  ARRAY['in_app'],
  '{"severity":"info"}'::jsonb,
  true
),

-- ============================================================================
-- reminder.* (trigger TBD — require cron jobs not yet built)
-- ============================================================================
(
  'reminder.streak_at_risk',
  'Streak at risk',
  'Trigger TBD: nightly cron when user has an active streak but hasn''t studied today.',
  'reminder',
  true,
  'Your streak is at risk',
  'You haven''t studied today. Even one word keeps your streak alive.',
  ARRAY['in_app'],
  '{"severity":"warning","cta":{"label":"Study now","href":"/dashboard"}}'::jsonb,
  true
),
(
  'reminder.streak_broken',
  'Streak broken',
  'Trigger TBD: when a user returns after their streak has reset. Pass {days} via dataOverrides.',
  'reminder',
  true,
  'Streak broken',
  'Your study streak ended at {days} days. Start a new one today!',
  ARRAY['in_app'],
  '{"severity":"info","cta":{"label":"Start fresh","href":"/dashboard"}}'::jsonb,
  true
),
(
  'reminder.daily_study',
  'Daily study reminder',
  'Trigger TBD: daily cron at user-preferred time, only if no session today.',
  'reminder',
  true,
  'Time to study',
  'A short session today goes a long way. Pick up where you left off.',
  ARRAY['in_app'],
  '{"severity":"info","cta":{"label":"Resume","href":"/dashboard"}}'::jsonb,
  true
),
(
  'reminder.win_back',
  'Win-back',
  'Trigger TBD: cron when a user has been inactive ≥5 days. Pass {days} via dataOverrides.',
  'reminder',
  true,
  'We miss you',
  'It''s been {days} days since your last session. Come back and master one new word.',
  ARRAY['in_app'],
  '{"severity":"info","cta":{"label":"Welcome back","href":"/dashboard"}}'::jsonb,
  true
),
(
  'reminder.review_due',
  'Review due',
  'Trigger TBD: when SRS surfaces words at peak review window. Pass {count} via dataOverrides.',
  'reminder',
  true,
  '{count} words ready to review',
  '{count} words you''ve been learning are at their best review moment. Lock them in.',
  ARRAY['in_app'],
  '{"severity":"info","cta":{"label":"Review now","href":"/dashboard"}}'::jsonb,
  true
),

-- ============================================================================
-- learning.* (mostly cron-driven)
-- ============================================================================
(
  'learning.weekly_recap',
  'Weekly recap',
  'Trigger TBD: weekly cron. Pass {newWords},{mastered},{minutes} via dataOverrides.',
  'learning',
  true,
  'Your weekly recap',
  '{newWords} new words, {mastered} mastered, {minutes} minutes studied this week.',
  ARRAY['in_app'],
  '{"severity":"info","cta":{"label":"View progress","href":"/dashboard"}}'::jsonb,
  true
),
(
  'learning.mastery_regression',
  'Mastery regression',
  'Trigger TBD: nightly cron flags mastered words slipping in correct_streak. Pass {count} via dataOverrides.',
  'learning',
  true,
  '{count} words slipping',
  '{count} words you''d mastered are due for a review. Lock them back in.',
  ARRAY['in_app'],
  '{"severity":"warning","cta":{"label":"Review now","href":"/dashboard"}}'::jsonb,
  true
),
(
  'learning.lesson_almost_done',
  'Lesson almost done',
  'Trigger TBD: when 1–2 words remain in a lesson. Pass {remaining},{lessonName} via dataOverrides.',
  'learning',
  true,
  'Almost there!',
  'You''re {remaining} words away from finishing {lessonName}.',
  ARRAY['in_app'],
  '{"severity":"info"}'::jsonb,
  true
),

-- ============================================================================
-- content.* (admin-managed / manual)
-- ============================================================================
(
  'content.new_lesson',
  'New lesson',
  'Trigger TBD: when admin publishes a new lesson in a course the user is enrolled in. Pass {lessonName},{courseName} via dataOverrides.',
  'content',
  true,
  'New lesson published',
  '{lessonName} is now available in {courseName}.',
  ARRAY['in_app'],
  '{"severity":"info"}'::jsonb,
  true
),
(
  'content.new_course',
  'New course',
  'Trigger TBD: when admin publishes a new course matching user''s expressed interest. Pass {courseName} via dataOverrides.',
  'content',
  true,
  'New course available',
  'Start learning {courseName} today.',
  ARRAY['in_app'],
  '{"severity":"info"}'::jsonb,
  true
),
(
  'content.audio_updated',
  'Audio updated',
  'Trigger TBD: when admin updates audio for a word the user is studying. Pass {wordHeadword} via dataOverrides.',
  'content',
  true,
  'Audio updated',
  'We refreshed the audio for {wordHeadword}. Replay it to hear the change.',
  ARRAY['in_app'],
  '{"severity":"info"}'::jsonb,
  true
),
(
  'content.feature_announcement',
  'Feature announcement',
  'For one-off product announcements. Pass {featureTitle},{featureBody} via dataOverrides.',
  'content',
  true,
  '{featureTitle}',
  '{featureBody}',
  ARRAY['in_app'],
  '{"severity":"info"}'::jsonb,
  true
)

ON CONFLICT (key) DO NOTHING;