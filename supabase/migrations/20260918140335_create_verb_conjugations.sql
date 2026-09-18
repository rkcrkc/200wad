-- Verb-conjugation pages migrated from the legacy SBI site (SEO Phase B).
-- Public read of published rows only; writes via service role (import script).
-- Structured so the page is re-templatable/re-skinnable rather than an HTML blob.

create table if not exists public.verb_conjugations (
  id               uuid primary key default gen_random_uuid(),
  language_id      uuid not null references public.languages(id) on delete restrict,
  slug             text not null,                 -- infinitive slug, e.g. 'aller'
  legacy_path      text unique not null,          -- '/french-verb-aller.html' (served URL + canonical)
  infinitive       text not null,                 -- 'aller'
  translation      text,                          -- 'to go'
  title            text not null,                 -- exact legacy <title>
  meta_description text,                           -- exact legacy meta description
  h1               text not null,                 -- exact legacy H1
  subtitle         text,                           -- 'A Top Ten French Verb' (badge)
  mnemonic         text,                           -- memory-trigger sentence
  conjugation      jsonb not null default '{}'::jsonb, -- { simple:[...], compound:[...] }
  intro_html       text,                           -- sanitised "MORE on…" prose
  notes_html       text,                           -- sanitised "HOW TO CONQUER…" prose
  lead_image_url   text,                           -- re-hosted image (Supabase Storage)
  lead_image_alt   text,                           -- exact legacy alt
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (language_id, slug)
);

create index if not exists verb_conjugations_published_idx
  on public.verb_conjugations (is_published);
create index if not exists verb_conjugations_language_idx
  on public.verb_conjugations (language_id);

-- reuse the repo-wide updated_at trigger fn (created by the blog migration)
drop trigger if exists set_verb_conjugations_updated_at on public.verb_conjugations;
create trigger set_verb_conjugations_updated_at
  before update on public.verb_conjugations
  for each row execute function public.handle_updated_at();

alter table public.verb_conjugations enable row level security;

drop policy if exists "verb_conjugations public read published" on public.verb_conjugations;
create policy "verb_conjugations public read published"
  on public.verb_conjugations for select to anon, authenticated using (is_published = true);
