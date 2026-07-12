-- S5 (SECURITY_AUDIT.md): 18 functions in `public` had a mutable (unset) `search_path`,
-- flagged by the Supabase linter `0011_function_search_path_mutable`. The real risk is on
-- SECURITY DEFINER functions: an attacker who controls their session `search_path` can make
-- an unqualified name inside the function resolve to a malicious object in a schema they
-- control, which then runs with the definer's elevated privileges (schema-shadowing
-- escalation). Pinning a fixed `search_path` on the function removes the caller's control
-- entirely, closing the vector.
--
-- Why `= public` (not `= ''`): several of these functions reference `public` objects
-- UNqualified (e.g. `search_words`/`search_language_words` select from `words`/`lessons`/
-- `lesson_words` and call `f_unaccent(...)`; the trigger functions update `courses`/`lessons`/
-- `words`). Setting `search_path = ''` would break them unless every reference were rewritten
-- to be schema-qualified. Pinning to `public` is equally safe against hijacking on Supabase —
-- untrusted roles (`anon`/`authenticated`) have no CREATE privilege on `public`, so they can't
-- plant a shadowing object — while preserving current name resolution with no body changes.
-- `pg_catalog` is always searched implicitly (so built-ins like `now()`/`regexp_replace` still
-- resolve), and `pg_temp` is deliberately omitted so temp objects can never shadow. Functions
-- that already qualify cross-schema refs (`is_admin` → `auth.users`, `f_unaccent` →
-- `extensions.unaccent`, `handle_user_email_update` → `public.users`) are unaffected.

ALTER FUNCTION public.f_unaccent(text) SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_user_email_update() SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.search_language_words(text, uuid) SET search_path = public;
ALTER FUNCTION public.search_words(text, uuid) SET search_path = public;
ALTER FUNCTION public.strip_control_chars() SET search_path = public;
ALTER FUNCTION public.touch_notification_template_updated_at() SET search_path = public;
ALTER FUNCTION public.touch_notification_type_updated_at() SET search_path = public;
ALTER FUNCTION public.update_course_counts() SET search_path = public;
ALTER FUNCTION public.update_lesson_word_count() SET search_path = public;
ALTER FUNCTION public.update_lesson_word_count_on_category_change() SET search_path = public;
ALTER FUNCTION public.update_study_music_tracks_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.validate_broadcast_channels() SET search_path = public;
ALTER FUNCTION public.validate_template_channels() SET search_path = public;
ALTER FUNCTION public.word_image_groups_fanout() SET search_path = public;
ALTER FUNCTION public.words_resolve_trigger_image() SET search_path = public;
