-- ============================================================================
-- learning.test_due notification template
-- ============================================================================
--
-- Fires (lazily, on next page load via getScheduleData) when a user has a
-- milestone test whose `next_test_due_at` has just passed. One bell entry is
-- inserted per (user, lesson, milestone) — idempotency is enforced in code by
-- checking notifications.data->>{template_key, lesson_id, milestone}.
--
-- Channels: in_app only. No toast — these surface days/weeks/months after the
-- last user action and a transient toast wouldn't be relevant.
--
-- Idempotency of this migration: ON CONFLICT DO NOTHING preserves any admin
-- edits to the template content. Re-running is safe.
-- ============================================================================

INSERT INTO notification_templates (
  key,
  label,
  description,
  type,
  enabled,
  title,
  message,
  channels,
  default_data,
  is_system
) VALUES (
  'learning.test_due',
  'Test ready',
  'A milestone test (1-day / 1-week / 1-month / 1-quarter / 1-year) has come due for a lesson the user has previously studied. Fires lazily on next page load — at most once per (lesson, milestone) cycle.',
  'learning',
  TRUE,
  'Test ready: {lesson_title}',
  'Your {milestone_label} test for "{lesson_title}" is ready. Take it now to keep your schedule on track.',
  ARRAY['in_app']::TEXT[],
  NULL,
  TRUE
)
ON CONFLICT (key) DO NOTHING;
