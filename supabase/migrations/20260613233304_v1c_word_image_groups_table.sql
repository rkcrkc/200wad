-- ============================================================================
-- v1c Image Groups — formal grouping for shared Turbo Booster / Grammar images
-- ============================================================================
--
-- Replaces the implicit image sharing (many `words` rows holding the same URL
-- string) with a formal, CMS-managed model: a GROUP owns a single MASTER image,
-- and each word either INHERITS its group's master or sets a per-word OVERRIDE.
-- `words.memory_trigger_image_url` is retained as the MATERIALIZED effective URL,
-- kept correct by DB triggers (added in a later migration) — so no learner /
-- admin read path changes.
--
-- Groups are scoped PER COURSE: an identical picture used in both the Turbo
-- Boosters and Grammar courses produces two separate groups. `key` is therefore
-- unique within a course, not globally.
--
-- Mirrors the levels catalogue pattern (20260606000007_v1b_levels_table.sql):
-- admin-managed table, public SELECT, writes via service role.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.word_image_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Groups are course-scoped. Cascade so deleting a course cleans up its groups.
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  -- Stable machine identifier = lower(decoded filename stem), e.g.
  -- 'turbo-tion-zione'. Unique WITHIN a course (not globally) so the same
  -- picture in two courses yields two groups.
  key text NOT NULL,
  -- Human display label, best-effort seeded at backfill, freely editable.
  label text NOT NULL,
  -- Shared master image URL. Nullable: a group can exist before an image is set.
  master_image_url text,
  -- Turbo vs TurboX family flag (TurboX = the "exception" suffix images).
  is_exception boolean NOT NULL DEFAULT false,
  -- Optional best-effort parsed suffix pair (Turbo rule images only).
  english_suffix text,
  italian_suffix text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT word_image_groups_course_key_unique UNIQUE (course_id, key)
);

CREATE INDEX IF NOT EXISTS word_image_groups_course_idx
  ON public.word_image_groups (course_id);

ALTER TABLE public.word_image_groups ENABLE ROW LEVEL SECURITY;

-- Public read (mirrors levels' public read). Writes via service role only.
DROP POLICY IF EXISTS "public read word image groups" ON public.word_image_groups;
CREATE POLICY "public read word image groups"
  ON public.word_image_groups FOR SELECT
  USING (true);

COMMENT ON TABLE public.word_image_groups IS
  'Admin-managed, course-scoped image groups. A group owns a master_image_url shared by its member words (words.image_group_id). words.memory_trigger_image_url is the materialized effective URL kept correct by triggers. Public read; writes via service role.';
