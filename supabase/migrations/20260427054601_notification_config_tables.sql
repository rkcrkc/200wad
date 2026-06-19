-- =========================================================
-- Notification configuration tables
--   notification_types     — master list of types with master enable/disable
--   notification_templates — system-generated notification definitions
--                             (admin can toggle, edit content)
-- =========================================================

-- 1. notification_types ------------------------------------------------------
create table public.notification_types (
  type        text primary key,
  label       text not null,
  description text,
  enabled     boolean not null default true,
  sort_order  integer not null default 0,
  updated_at  timestamptz not null default now()
);

comment on table public.notification_types is
  'Master list of notification types with global enable/disable toggle.';

-- Seed canonical types (matches NOTIFICATION_TYPES in src/lib/validations/notifications.ts)
insert into public.notification_types (type, label, description, sort_order) values
  ('system',      'System',       'Service announcements, maintenance notices', 1),
  ('billing',     'Billing',      'Payment, subscription, refund notifications', 2),
  ('learning',    'Learning',     'Course updates, content recommendations', 3),
  ('reminder',    'Reminders',    'Streak, study, lesson reminders', 4),
  ('achievement', 'Achievements', 'Milestones, badges, leaderboard', 5),
  ('content',     'Content',      'New courses, words, features', 6),
  ('admin',       'Admin',        'Internal admin-only notifications', 7);

-- 2. notification_templates --------------------------------------------------
create table public.notification_templates (
  id           uuid primary key default gen_random_uuid(),
  key          text unique not null,
  label        text not null,
  description  text,
  type         text not null references public.notification_types(type) on delete restrict,
  enabled      boolean not null default true,
  title        text not null,
  message      text not null,
  channels     text[] not null default array['in_app'],
  default_data jsonb default '{}'::jsonb,
  is_system    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.notification_templates is
  'Templates for system-generated notifications. is_system templates are registered by code paths and cannot be deleted.';

-- Channel validation trigger (mirrors notification_broadcasts pattern)
create or replace function public.validate_template_channels()
returns trigger
language plpgsql
as $$
begin
  if new.channels is null or array_length(new.channels, 1) is null then
    raise exception 'channels must contain at least one entry';
  end if;
  if not (new.channels <@ array['in_app','email']) then
    raise exception 'channels may only contain in_app or email';
  end if;
  return new;
end;
$$;

create trigger validate_template_channels_tg
  before insert or update on public.notification_templates
  for each row execute function public.validate_template_channels();

-- updated_at maintenance
create or replace function public.touch_notification_template_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger touch_notification_template_updated_at_tg
  before update on public.notification_templates
  for each row execute function public.touch_notification_template_updated_at();

create or replace function public.touch_notification_type_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger touch_notification_type_updated_at_tg
  before update on public.notification_types
  for each row execute function public.touch_notification_type_updated_at();

-- 3. Seed system templates ---------------------------------------------------
insert into public.notification_templates
  (key, label, description, type, title, message, channels, default_data, is_system)
values
  ('billing.payment_failed',
   'Payment failed',
   'Triggered by Stripe webhook when a subscription payment fails.',
   'billing',
   'Payment failed',
   'Your latest subscription payment failed. Please update your payment method to avoid losing access.',
   array['in_app'],
   '{"subtype":"payment_failed","severity":"warning"}'::jsonb,
   true);

-- 4. RLS — service role only (matches notification_broadcasts) --------------
alter table public.notification_types enable row level security;
alter table public.notification_templates enable row level security;
-- (no policies = client roles get nothing; service role bypasses RLS)

-- 5. Indexes -----------------------------------------------------------------
create index notification_templates_type_idx on public.notification_templates (type);
create index notification_templates_enabled_idx on public.notification_templates (enabled);
