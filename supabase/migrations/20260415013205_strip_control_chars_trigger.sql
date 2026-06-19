-- Sanitize text columns on INSERT/UPDATE to strip binary control characters.
-- Preserves tabs, newlines, and carriage returns.
CREATE OR REPLACE FUNCTION strip_control_chars()
RETURNS trigger AS $$
BEGIN
  -- Strip control chars from text columns (keep \t=0x09, \n=0x0A, \r=0x0D)
  IF NEW.headword IS NOT NULL THEN
    NEW.headword := regexp_replace(NEW.headword, E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', '', 'g');
  END IF;
  IF NEW.english IS NOT NULL THEN
    NEW.english := regexp_replace(NEW.english, E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', '', 'g');
  END IF;
  IF NEW.memory_trigger_text IS NOT NULL THEN
    NEW.memory_trigger_text := regexp_replace(NEW.memory_trigger_text, E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', '', 'g');
  END IF;
  IF NEW.notes IS NOT NULL THEN
    NEW.notes := regexp_replace(NEW.notes, E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', '', 'g');
  END IF;
  IF NEW.lemma IS NOT NULL THEN
    NEW.lemma := regexp_replace(NEW.lemma, E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', '', 'g');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER words_strip_control_chars
  BEFORE INSERT OR UPDATE ON words
  FOR EACH ROW
  EXECUTE FUNCTION strip_control_chars();