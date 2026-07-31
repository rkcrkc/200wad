-- Account-scoped study/test toggles so they persist across devices.
-- Nullable on purpose: NULL means the user has never explicitly set the value,
-- so the client falls back to its localStorage value (migrating it up) or the
-- app default. Non-null means the user's explicit choice wins everywhere.
alter table public.users
  add column if not exists sound_effects_enabled boolean,
  add column if not exists replay_trigger_enabled boolean;

comment on column public.users.sound_effects_enabled is
  'Answer-feedback SFX toggle for study/test. NULL = unset (client uses localStorage/default ON).';
comment on column public.users.replay_trigger_enabled is
  'Play-memory-trigger-after-answer toggle for test mode. NULL = unset (client uses localStorage/default OFF).';
