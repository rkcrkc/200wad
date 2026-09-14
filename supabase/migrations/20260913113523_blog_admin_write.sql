-- Blog admin CRUD: write policies on blog tables + admin read-all on posts,
-- plus the blog-images storage bucket and its admin write policies.
-- All writes gated by public.is_admin() (mirrors user_metadata.role = 'admin').

-- ── blog_posts: admin read-all (drafts) + full write ─────────────────────────
drop policy if exists "blog_posts admin read all" on public.blog_posts;
create policy "blog_posts admin read all"
  on public.blog_posts for select to authenticated using (public.is_admin());

drop policy if exists "blog_posts admin insert" on public.blog_posts;
create policy "blog_posts admin insert"
  on public.blog_posts for insert to authenticated with check (public.is_admin());

drop policy if exists "blog_posts admin update" on public.blog_posts;
create policy "blog_posts admin update"
  on public.blog_posts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "blog_posts admin delete" on public.blog_posts;
create policy "blog_posts admin delete"
  on public.blog_posts for delete to authenticated using (public.is_admin());

-- ── blog_authors: full write (public read already exists) ────────────────────
drop policy if exists "blog_authors admin insert" on public.blog_authors;
create policy "blog_authors admin insert"
  on public.blog_authors for insert to authenticated with check (public.is_admin());

drop policy if exists "blog_authors admin update" on public.blog_authors;
create policy "blog_authors admin update"
  on public.blog_authors for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "blog_authors admin delete" on public.blog_authors;
create policy "blog_authors admin delete"
  on public.blog_authors for delete to authenticated using (public.is_admin());

-- ── blog_categories: full write (public read already exists) ─────────────────
drop policy if exists "blog_categories admin insert" on public.blog_categories;
create policy "blog_categories admin insert"
  on public.blog_categories for insert to authenticated with check (public.is_admin());

drop policy if exists "blog_categories admin update" on public.blog_categories;
create policy "blog_categories admin update"
  on public.blog_categories for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "blog_categories admin delete" on public.blog_categories;
create policy "blog_categories admin delete"
  on public.blog_categories for delete to authenticated using (public.is_admin());

-- ── blog-images storage bucket (public read; 5 MB; common image mimes) ───────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images', 'blog-images', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── blog-images storage.objects admin write policies ─────────────────────────
drop policy if exists "Admins can upload blog images" on storage.objects;
create policy "Admins can upload blog images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "Admins can update blog images" on storage.objects;
create policy "Admins can update blog images"
  on storage.objects for update to authenticated
  using (bucket_id = 'blog-images' and public.is_admin())
  with check (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "Admins can delete blog images" on storage.objects;
create policy "Admins can delete blog images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'blog-images' and public.is_admin());
