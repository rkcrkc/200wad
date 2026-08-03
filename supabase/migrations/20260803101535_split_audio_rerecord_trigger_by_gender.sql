-- Extend the male/female re-record split to the Memory Trigger audio track,
-- mirroring the english/foreign gender columns. Independent booleans; the
-- parent audio_rerecord_trigger flag remains a rollup for reporting.

ALTER TABLE words
  ADD COLUMN IF NOT EXISTS audio_rerecord_trigger_male boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_rerecord_trigger_female boolean DEFAULT false;
