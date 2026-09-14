-- Public blog: authors, categories, posts (Supabase-backed, apex marketing domain).
-- Public read of published posts only; authors/categories fully public read.
-- All writes via service role (seeded here; admin CRUD is a follow-up).

-- ── Tables ─────────────────────────────────────────────────────────────────
create table if not exists public.blog_authors (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  role       text,
  avatar_url text,
  bio        text,
  created_at timestamptz not null default now()
);

create table if not exists public.blog_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  title           text not null,
  excerpt         text,
  body            text,
  cover_image_url text,
  author_id       uuid not null references public.blog_authors(id) on delete restrict,
  category_id     uuid references public.blog_categories(id) on delete set null,
  language_id     uuid references public.languages(id) on delete set null,
  is_published    boolean not null default false,
  is_featured     boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────
create index if not exists blog_posts_published_idx
  on public.blog_posts (is_published, published_at desc);
create index if not exists blog_posts_author_idx   on public.blog_posts (author_id);
create index if not exists blog_posts_category_idx on public.blog_posts (category_id);
create index if not exists blog_posts_language_idx on public.blog_posts (language_id);

-- ── updated_at trigger (reuse repo convention) ───────────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_blog_posts_updated_at on public.blog_posts;
create trigger set_blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.handle_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.blog_authors    enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_posts      enable row level security;

drop policy if exists "blog_authors public read"    on public.blog_authors;
drop policy if exists "blog_categories public read" on public.blog_categories;
drop policy if exists "blog_posts public read published" on public.blog_posts;

create policy "blog_authors public read"
  on public.blog_authors for select to anon, authenticated using (true);

create policy "blog_categories public read"
  on public.blog_categories for select to anon, authenticated using (true);

create policy "blog_posts public read published"
  on public.blog_posts for select to anon, authenticated using (is_published = true);

-- ── Seed: authors ────────────────────────────────────────────────────────────
insert into public.blog_authors (slug, name, role, bio) values
  ('ryan-crocombe', 'Ryan Crocombe', 'Founder',
   'Founder of 200 Words a Day. Obsessed with making vocabulary stick through humour, spaced repetition, and tiny daily wins.'),
  ('camille-laurent', 'Camille Laurent', 'Language coach',
   'Language coach and polyglot. Camille has taught French and Spanish for over a decade and believes anyone can learn a language with the right daily habit.')
on conflict (slug) do nothing;

-- ── Seed: categories ─────────────────────────────────────────────────────────
insert into public.blog_categories (slug, name, sort_order) values
  ('motivation', 'Motivation', 1),
  ('method',     'Method',     2),
  ('science',    'Science',    3),
  ('culture',    'Culture',    4)
on conflict (slug) do nothing;

-- ── Seed: posts (one INSERT…SELECT each; resolve FKs by slug/code) ────────────
insert into public.blog_posts
  (slug, title, excerpt, body, author_id, category_id, language_id, is_published, is_featured, published_at)
select
  '100-reasons-to-learn-a-language',
  '100 reasons to learn a language',
  'From ordering coffee like a local to rewiring your brain — a big, honest list of why picking up a new language is worth it.',
  E'People ask us all the time: *why bother?* Apps translate menus now. Everyone speaks a little English. Isn''t it easier to just... not?\n\nHere''s the thing. Learning a language is one of the few things that pays you back in a hundred small ways, most of which you can''t predict until you''re in them.\n\n## The obvious ones\n\n- You can travel without feeling helpless.\n- You can order the thing you actually want, not the thing you can point at.\n- You can read signs, jokes, and graffiti — the real texture of a place.\n\n## The ones nobody warns you about\n\n- You become a slightly different, funnier person in your new language.\n- You notice your *own* language more — its weird idioms and lazy habits.\n- You get a small hit of joy every single time a stranger understands you.\n\n## The science-y ones\n\nBilingualism is linked to better focus, stronger memory, and a brain that stays sharper for longer. You''re not just learning words — you''re giving your mind a daily workout.\n\nWe won''t list all hundred here (that would spoil the fun). But the real reason is simpler than any of them: **it''s one of the most reliably satisfying things you can do with twenty minutes a day.**',
  (select id from public.blog_authors where slug = 'ryan-crocombe'),
  (select id from public.blog_categories where slug = 'motivation'),
  null,
  true, true, timestamptz '2026-09-01 09:00:00+00'
where not exists (select 1 from public.blog_posts where slug = '100-reasons-to-learn-a-language');

insert into public.blog_posts
  (slug, title, excerpt, body, author_id, category_id, language_id, is_published, is_featured, published_at)
select
  'learning-languages-the-200-words-a-day-way',
  'Learning languages the 200 Words a Day way',
  'Why we bet everything on short, funny, daily sessions — and how the method actually works under the hood.',
  E'Most language courses front-load grammar and hope you''ll stick around for the good part. We do the opposite.\n\n## Start with words, not rules\n\nYou can say an enormous amount with a few hundred well-chosen words. Grammar matters, but it sticks far better once you already have things to say. So we start you with vocabulary you''ll actually use.\n\n## Make it funny on purpose\n\nMemory loves the absurd. A ridiculous mental image beats rote repetition every time — which is exactly why our prompts lean into the silly. (More on the science in a future post.)\n\n## Twenty minutes, every day\n\nConsistency beats intensity. A short daily session compounds; a three-hour weekend cram evaporates. The whole app is built to make *today''s* session easy to start and satisfying to finish.\n\n## Test, don''t just review\n\nRecalling a word is what moves it into long-term memory. That''s why testing is the core loop, not an afterthought — and why words only count as *learned* when you get them right with no clues.\n\nThat''s the method. Small, funny, daily, and built around recall. Nothing clever — just the parts that actually work, with the boring parts removed.',
  (select id from public.blog_authors where slug = 'ryan-crocombe'),
  (select id from public.blog_categories where slug = 'method'),
  null,
  true, false, timestamptz '2026-09-05 09:00:00+00'
where not exists (select 1 from public.blog_posts where slug = 'learning-languages-the-200-words-a-day-way');

insert into public.blog_posts
  (slug, title, excerpt, body, author_id, category_id, language_id, is_published, is_featured, published_at)
select
  'the-science-behind-why-funny-beats-boring',
  'The science behind why funny beats boring',
  'Humour isn''t a gimmick — it''s a memory hack. Here''s what the research says about why the absurd sticks.',
  E'We get teased for how silly some of our example sentences are. We wear it as a badge of honour, because the silliness is doing real work.\n\n## The bizarreness effect\n\nPsychologists have a name for it: the *bizarreness effect*. Odd, surprising material is recalled better than ordinary material, because it stands out and demands a little more processing when you first meet it.\n\n## Emotion tags memories\n\nThings that make you laugh carry an emotional charge, and emotion is one of the brain''s strongest cues for "keep this one." A flat sentence gives your memory nothing to grab. A funny one gives it a handle.\n\n## Elaboration builds hooks\n\nWhen a sentence is vivid, you picture it — and that mental image is an extra retrieval path back to the word. More hooks, easier recall.\n\n## So we lean in\n\nThat''s why we''d rather teach you *"the penguin stole my umbrella"* than *"the man has an umbrella."* Same grammar, same word count — but one of them you''ll still remember next week.\n\nFunny isn''t the opposite of serious learning. Done right, it *is* the serious learning.',
  (select id from public.blog_authors where slug = 'camille-laurent'),
  (select id from public.blog_categories where slug = 'science'),
  null,
  true, false, timestamptz '2026-09-08 09:00:00+00'
where not exists (select 1 from public.blog_posts where slug = 'the-science-behind-why-funny-beats-boring');

insert into public.blog_posts
  (slug, title, excerpt, body, author_id, category_id, language_id, is_published, is_featured, published_at)
select
  'why-french-pronunciation-isnt-as-scary-as-it-looks',
  'Why French pronunciation isn''t as scary as it looks',
  'Silent letters, nasal vowels, the infamous R — French looks intimidating on paper. The rules are more forgiving than you think.',
  E'French spelling looks like it''s actively hiding how to say the words. Half the letters seem silent and the rest have accents. But once you learn a handful of patterns, it becomes surprisingly regular.\n\n## Silent endings are a rule, not chaos\n\nMost final consonants are silent (*petit*, *grand*, *beaucoup*). Once you expect it, you stop tripping over it — and it''s far more consistent than English.\n\n## Nasal vowels: fewer than you fear\n\nThere are only a few nasal sounds to learn (*on*, *an*, *in*, *un*). Get those, and a huge chunk of words fall into place.\n\n## The R softens with time\n\nThe French R feels alien at first because it lives at the back of the throat. Nobody nails it on day one. It comes with exposure — not with forcing it.\n\n## Let your ears lead\n\nThe fastest fix is listening before reading. Hear the word, then meet its spelling. Suddenly the "silent" letters make sense as history rather than traps.\n\nDon''t let the page scare you. French rewards the ear, and the ear learns fast.',
  (select id from public.blog_authors where slug = 'camille-laurent'),
  (select id from public.blog_categories where slug = 'culture'),
  (select id from public.languages where code = 'fr'),
  true, false, timestamptz '2026-09-10 09:00:00+00'
where not exists (select 1 from public.blog_posts where slug = 'why-french-pronunciation-isnt-as-scary-as-it-looks');

insert into public.blog_posts
  (slug, title, excerpt, body, author_id, category_id, language_id, is_published, is_featured, published_at)
select
  'five-spanish-phrases-that-make-you-sound-fluent',
  '5 Spanish phrases that instantly make you sound fluent',
  'The little connectors and reactions native speakers sprinkle everywhere. Learn these five and you''ll sound far beyond your level.',
  E'Fluency isn''t about big words — it''s about the tiny phrases that glue conversation together. Here are five that punch well above their weight.\n\n## 1. *O sea* — "I mean / that is"\n\nThe Spanish filler par excellence. Buys you a beat and instantly sounds native.\n\n## 2. *¿En serio?* — "Really?"\n\nThe perfect reaction to gossip, good news, or anything surprising. Warm, natural, everywhere.\n\n## 3. *Vale* — "okay / got it"\n\nEspecially in Spain. Drop it into any agreement and you blend right in.\n\n## 4. *Qué va* — "no way / not at all"\n\nA breezy way to disagree or brush something off, far more natural than a flat *no*.\n\n## 5. *Me da igual* — "I don''t mind / whatever"\n\nWonderfully useful for the thousand small choices of daily life.\n\nLearn these five, use them today, and watch how differently people respond. Sounding fluent often starts with sounding *relaxed*.',
  (select id from public.blog_authors where slug = 'camille-laurent'),
  (select id from public.blog_categories where slug = 'method'),
  (select id from public.languages where code = 'es'),
  true, false, timestamptz '2026-09-12 09:00:00+00'
where not exists (select 1 from public.blog_posts where slug = 'five-spanish-phrases-that-make-you-sound-fluent');
