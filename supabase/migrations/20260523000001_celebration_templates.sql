-- =============================================================================
-- Celebration templates: lesson / course / language mastered
-- =============================================================================
-- Seeds three system notification templates that fire when a user reaches
-- 100% mastery at each scope. All three render the major-tier
-- CelebrationModal (confetti + green accent + share button) and persist a
-- matching entry in the bell dropdown via the in_app channel.
--
-- Idempotency: client-side firing checks
--   notifications.data->>'template_key' (auto-stamped by insertFromTemplate)
--   notifications.data->>'lesson_id' / 'course_id' / 'language_id'
-- so each scope can only fire once per (user, entity).
--
-- Admin editability: everything in the bell entry (title, message, toast)
-- uses standard notification_templates columns. Modal-specific extras
-- (emoji, subtitle override, share message, secondary CTA) live in
-- default_data.celebration so the admin form can round-trip them as one
-- JSON blob. Existing in-app title/message are reused for the modal hero
-- so admins only edit one set of copy when the modal and the bell should
-- say the same thing.
--
-- default_data.celebration shape:
--   {
--     "tier":             "major",
--     "emoji":            "🏆",
--     "subtitle":         "...optional override of message for the modal hero...",
--     "share_message":    "...what the OS share sheet pre-fills...",
--     "secondary_cta": { "label": "...", "href": "/course/{course_id}" }
--   }
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Lesson mastered
-- ---------------------------------------------------------------------------
INSERT INTO notification_templates (
  key,
  label,
  description,
  type,
  enabled,
  title,
  message,
  toast_title,
  toast_message,
  channels,
  default_data,
  is_system
) VALUES (
  'achievement.lesson_mastered',
  'Lesson mastered',
  'Fires the first time a user reaches 100% mastered (every word with a 3-streak) on a lesson. Major-tier celebration with confetti + share. Bell entry persists; toast shown once at the moment of completion.',
  'achievement',
  TRUE,
  'Lesson mastered!',
  'You mastered every word in {lesson_title}. Onto the next one.',
  'Lesson mastered! 🏆',
  '{lesson_title} — every word at a 3-streak.',
  ARRAY['in_app', 'toast']::TEXT[],
  jsonb_build_object(
    'celebration', jsonb_build_object(
      'tier', 'major',
      'emoji', '🏆',
      'subtitle', 'You mastered every word in {lesson_title}.',
      'share_message', 'I just mastered every word in {lesson_title} on 200 Words a Day!',
      'secondary_cta', jsonb_build_object(
        'label', 'Back to all lessons',
        'href', '/course/{course_id}'
      )
    )
  ),
  TRUE
)
ON CONFLICT (key) DO UPDATE
SET
  -- Preserve admin edits to copy on re-run; only fill missing fields.
  description = COALESCE(notification_templates.description, EXCLUDED.description),
  toast_title = COALESCE(notification_templates.toast_title, EXCLUDED.toast_title),
  toast_message = COALESCE(notification_templates.toast_message, EXCLUDED.toast_message),
  -- Channels are unioned so re-running the seed never narrows delivery.
  channels = (
    SELECT ARRAY(SELECT DISTINCT unnest(notification_templates.channels || EXCLUDED.channels))
  ),
  -- For default_data we preserve any existing value entirely — admin edits
  -- to celebration fields must not be overwritten by reruns. Only fill in
  -- when the row was previously null.
  default_data = COALESCE(notification_templates.default_data, EXCLUDED.default_data);

-- ---------------------------------------------------------------------------
-- 2. Course mastered
-- ---------------------------------------------------------------------------
INSERT INTO notification_templates (
  key,
  label,
  description,
  type,
  enabled,
  title,
  message,
  toast_title,
  toast_message,
  channels,
  default_data,
  is_system
) VALUES (
  'achievement.course_mastered',
  'Course mastered',
  'Fires the first time a user has every word in every lesson of a course at status=mastered (3-streak). Cascades over lesson_mastered when both unlock in the same test.',
  'achievement',
  TRUE,
  'Course mastered!',
  'Every word in {course_name} is yours. Time to pick your next one.',
  'Course mastered! 🏆',
  '{course_name} — every word mastered.',
  ARRAY['in_app', 'toast']::TEXT[],
  jsonb_build_object(
    'celebration', jsonb_build_object(
      'tier', 'major',
      'emoji', '🏆',
      'subtitle', 'You mastered every word in {course_name}. Get started on your next course.',
      'share_message', 'I just mastered every word in {course_name} on 200 Words a Day!',
      'secondary_cta', jsonb_build_object(
        'label', 'Pick a new course',
        'href', '/courses'
      )
    )
  ),
  TRUE
)
ON CONFLICT (key) DO UPDATE
SET
  description = COALESCE(notification_templates.description, EXCLUDED.description),
  toast_title = COALESCE(notification_templates.toast_title, EXCLUDED.toast_title),
  toast_message = COALESCE(notification_templates.toast_message, EXCLUDED.toast_message),
  channels = (
    SELECT ARRAY(SELECT DISTINCT unnest(notification_templates.channels || EXCLUDED.channels))
  ),
  default_data = COALESCE(notification_templates.default_data, EXCLUDED.default_data);

-- ---------------------------------------------------------------------------
-- 3. Language mastered
-- ---------------------------------------------------------------------------
INSERT INTO notification_templates (
  key,
  label,
  description,
  type,
  enabled,
  title,
  message,
  toast_title,
  toast_message,
  channels,
  default_data,
  is_system
) VALUES (
  'achievement.language_mastered',
  'Language mastered',
  'Fires the first time a user has every word in every course of a language at status=mastered. Cascades over course_mastered and lesson_mastered when all three unlock in the same test.',
  'achievement',
  TRUE,
  'Language mastered!',
  'Every course in {language_name} mastered. An entire language — at your fingertips.',
  'Language mastered! 🏆',
  'Every course in {language_name} mastered.',
  ARRAY['in_app', 'toast']::TEXT[],
  jsonb_build_object(
    'celebration', jsonb_build_object(
      'tier', 'major',
      'emoji', '🏆',
      'subtitle', 'You''ve mastered every word in every course in {language_name}.',
      'share_message', 'I just mastered an entire language ({language_name}) on 200 Words a Day!',
      'secondary_cta', jsonb_build_object(
        'label', 'Explore other languages',
        'href', '/courses'
      )
    )
  ),
  TRUE
)
ON CONFLICT (key) DO UPDATE
SET
  description = COALESCE(notification_templates.description, EXCLUDED.description),
  toast_title = COALESCE(notification_templates.toast_title, EXCLUDED.toast_title),
  toast_message = COALESCE(notification_templates.toast_message, EXCLUDED.toast_message),
  channels = (
    SELECT ARRAY(SELECT DISTINCT unnest(notification_templates.channels || EXCLUDED.channels))
  ),
  default_data = COALESCE(notification_templates.default_data, EXCLUDED.default_data);
