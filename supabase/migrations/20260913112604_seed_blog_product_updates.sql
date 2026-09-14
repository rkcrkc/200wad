-- Blog: add a "Product" category and seed product-update posts.
-- Product updates power the sidebar list on the blog index. Authored by the
-- founder; no language tie. Follows the seed pattern in create_blog_tables.

insert into public.blog_categories (slug, name, sort_order) values
  ('product', 'Product', 5)
on conflict (slug) do nothing;

insert into public.blog_posts
  (slug, title, excerpt, body, author_id, category_id, language_id, is_published, is_featured, published_at)
select
  'the-200-words-a-day-web-app-is-here',
  'The 200 Words a Day web app is here',
  'Study on any screen — the full course now runs in your browser, in sync with the mobile app.',
  E'We built 200 Words a Day on mobile first, but you told us loud and clear: sometimes you just want to learn at your desk.\n\n## One account, every screen\n\nYour progress, streaks, and coins now follow you between phone and browser. Start a session on the train, finish it on your laptop — nothing to re-sync.\n\n## Built for the keyboard\n\nOn the web you can type answers instead of tapping, so daily tests fly by. All the shortcuts you''d expect are there.\n\nHead to the app and pick up exactly where you left off.',
  (select id from public.blog_authors where slug = 'ryan-crocombe'),
  (select id from public.blog_categories where slug = 'product'),
  null,
  true, false, timestamptz '2026-09-06 09:00:00+00'
where not exists (select 1 from public.blog_posts where slug = 'the-200-words-a-day-web-app-is-here');

insert into public.blog_posts
  (slug, title, excerpt, body, author_id, category_id, language_id, is_published, is_featured, published_at)
select
  'turbo-boosters-keep-your-streak-alive',
  'Turbo Boosters: keep your streak alive',
  'Miss a day? Turbo Boosters give your streak a safety net so one busy afternoon doesn''t undo weeks of work.',
  E'Streaks are motivating right up until the day life gets in the way — and then a single miss can wipe out weeks of momentum.\n\n## A safety net, earned not bought\n\nTurbo Boosters bank a little of your consistency so a missed day doesn''t reset you to zero. Earn them by showing up, and spend them when you need them.\n\n## Still honest\n\nBoosters protect the streak, not the learning. Your words still only count as *learned* when you recall them cleanly in a test.\n\nCheck your booster balance on the dashboard and study with a little less pressure.',
  (select id from public.blog_authors where slug = 'ryan-crocombe'),
  (select id from public.blog_categories where slug = 'product'),
  null,
  true, false, timestamptz '2026-09-09 09:00:00+00'
where not exists (select 1 from public.blog_posts where slug = 'turbo-boosters-keep-your-streak-alive');

insert into public.blog_posts
  (slug, title, excerpt, body, author_id, category_id, language_id, is_published, is_featured, published_at)
select
  'leagues-are-live',
  'Leagues are live: climb the weekly leaderboard',
  'Get matched with other learners, earn XP for every session, and race to the top of your league each week.',
  E'Learning is more fun with a little friendly competition — so we added Leagues.\n\n## Matched with your pace\n\nEach week you''re placed in a room with learners on a similar streak. Earn XP from your daily sessions and watch the leaderboard shuffle in real time.\n\n## Promotion and rewards\n\nFinish near the top and you''ll be promoted to a tougher league, with coins and achievements along the way.\n\nComplete a few lessons to unlock Leagues, then see where this week takes you.',
  (select id from public.blog_authors where slug = 'ryan-crocombe'),
  (select id from public.blog_categories where slug = 'product'),
  null,
  true, false, timestamptz '2026-09-11 09:00:00+00'
where not exists (select 1 from public.blog_posts where slug = 'leagues-are-live');
