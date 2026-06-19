-- v1b: validated setter for users.timezone.
--
-- The client syncs the browser's IANA timezone on mount. Rather than let the
-- app write the column directly (where a forged/garbage value would later make
-- update_daily_activity's `AT TIME ZONE` raise), this SECURITY DEFINER RPC
-- validates the name against pg_timezone_names — the same tz database
-- update_daily_activity uses — and only persists recognised values. Anything
-- else is a no-op returning false, so the stored default ('UTC') stands.
--
-- Identity comes from auth.uid() (the caller's JWT), so the user id is never
-- trusted from the client. Writes only when the value actually changed.

CREATE OR REPLACE FUNCTION public.set_user_timezone(p_timezone text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_valid   boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_timezone IS NULL
     OR length(p_timezone) = 0
     OR length(p_timezone) > 64 THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_timezone_names WHERE name = p_timezone
  ) INTO v_valid;

  IF NOT v_valid THEN
    RETURN false;
  END IF;

  UPDATE public.users
    SET timezone = p_timezone
  WHERE id = v_user_id
    AND timezone IS DISTINCT FROM p_timezone;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_timezone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_timezone(text) TO authenticated;

COMMENT ON FUNCTION public.set_user_timezone(text) IS
  'Validates an IANA timezone name against pg_timezone_names and stores it on users.timezone for the calling user (auth.uid()). Returns false (no write) for missing/unknown names so an invalid value can never reach update_daily_activity. Used by the syncUserTimezone server action.';
