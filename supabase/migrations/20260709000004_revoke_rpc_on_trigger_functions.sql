-- S6 (SECURITY_AUDIT.md): the security advisor (0028/0029) flagged two SECURITY DEFINER
-- *trigger* functions — `handle_new_user()` and `handle_user_email_update()` — as executable
-- by `anon`/`authenticated` via the PostgREST `/rpc/` endpoint. They are wired up as row
-- triggers (on auth.users / public.users) and are never called directly by application code
-- (verified: no `.rpc("handle_new_user"|"handle_user_email_update")` anywhere in src/).
--
-- Exposing a trigger function over RPC serves no purpose and only widens the API surface, so we
-- revoke EXECUTE from PUBLIC (the implicit `=X/postgres` grant) plus the explicit `anon` and
-- `authenticated` grants. This does NOT affect trigger firing: a trigger function is invoked by
-- the trigger mechanism and does not require the triggering role to hold EXECUTE on it.
-- `service_role`/`postgres` keep EXECUTE (trusted, server-only) — harmless and avoids surprises.
--
-- Not touched here (intentional): `search_words` / `search_language_words` are also SECURITY
-- DEFINER and anon-callable, but by design — `search_language_words` powers user-facing (incl.
-- guest) course search, and both only read published content tables (`words`/`lessons`), never
-- user-owned data. No cross-user exposure, so their anon access stays.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_email_update() FROM PUBLIC, anon, authenticated;
