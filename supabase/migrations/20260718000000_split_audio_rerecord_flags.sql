-- Split the single `audio_rerecord` developer-QA flag into three per-track
-- flags mirroring the audio_url_* columns (english / foreign / trigger).
-- Existing flagged words migrate onto the Memory Trigger track, then the
-- legacy column is dropped.

ALTER TABLE words
  ADD COLUMN IF NOT EXISTS audio_rerecord_english boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_rerecord_foreign boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_rerecord_trigger boolean DEFAULT false;

UPDATE words
  SET audio_rerecord_trigger = true
  WHERE audio_rerecord = true;

ALTER TABLE words
  DROP COLUMN IF EXISTS audio_rerecord;
