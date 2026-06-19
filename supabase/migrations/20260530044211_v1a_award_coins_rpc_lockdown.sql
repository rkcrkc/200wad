REVOKE EXECUTE ON FUNCTION
  public.award_coins(uuid, integer, text, text, uuid, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.award_coins(uuid, integer, text, text, uuid, text)
  TO service_role;