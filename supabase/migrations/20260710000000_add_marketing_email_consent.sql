-- C4 · Marketing consent (GDPR/PECR): record a lawful, affirmative opt-in for
-- promotional email, plus the timestamp needed to *demonstrate* consent (Art. 7).
--
-- Tri-state on purpose (nullable BOOLEAN):
--   NULL  = never asked / no decision  -> the in-app opt-in prompt may fire
--   TRUE  = opted in
--   FALSE = explicitly declined
-- Existing rows stay NULL (no backfill): we must NOT manufacture consent for
-- users who never gave it. They opt in via Settings or the prompt.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS marketing_email_consent BOOLEAN,
  ADD COLUMN IF NOT EXISTS marketing_consent_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.marketing_email_consent IS
  'Promotional-email consent. NULL = undecided (prompt eligible), TRUE = opted in, FALSE = declined. Affirmative opt-in only (GDPR Art. 4(11)/7).';
COMMENT ON COLUMN public.users.marketing_consent_updated_at IS
  'When the marketing_email_consent decision was last recorded (proof-of-consent timestamp).';

-- Signup carries the checkbox choice through auth user_metadata
-- (`marketing_consent`). Email signups always send the key (true/false), so
-- they are recorded as a decision and never see the prompt; OAuth signups omit
-- it and stay NULL (prompt eligible).
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  INSERT INTO public.users (
    id, email, name, referral_code,
    marketing_email_consent, marketing_consent_updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    generate_referral_code(),
    CASE WHEN NEW.raw_user_meta_data ? 'marketing_consent'
         THEN (NEW.raw_user_meta_data->>'marketing_consent')::boolean END,
    CASE WHEN NEW.raw_user_meta_data ? 'marketing_consent'
         THEN now() END
  );
  RETURN NEW;
END;
$function$;
