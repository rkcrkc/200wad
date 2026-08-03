-- Add per-voice (male/female) re-record flags nested under the existing
-- english/foreign audio re-record tracks. These are independent booleans so a
-- word can need one or both voices redone. The parent english/foreign flags are
-- left untouched and act as a rollup ("any voice on this track needs a redo").
-- Memory Trigger has no gender split.

ALTER TABLE words
  ADD COLUMN IF NOT EXISTS audio_rerecord_english_male boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_rerecord_english_female boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_rerecord_foreign_male boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_rerecord_foreign_female boolean DEFAULT false;
