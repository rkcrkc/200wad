# v1c Turbo Booster Image Groups — formal grouping, master image, per-word overrides

Source of truth for the v1c image-groups build. Replaces the current *implicit* image
sharing (many `words` rows holding the same URL string) with a formal, CMS-managed model.

## Goal
- A **group** owns a single **master image**.
- Each word **inherits** its group's master, or sets a **per-word override**.
- The learner-facing value (`words.memory_trigger_image_url`) stays as the **materialized
  effective URL**, kept correct by DB triggers — so **no learner/admin read paths change**.

Decisions locked with user:
- **Resolution:** materialized via DB trigger (zero read-path changes).
- **Backfill scope:** **only words belonging to the Turbo Boosters and Grammar courses**
  (updated 2026-06-13 — was previously "whole `words` table").
- **Groups are scoped per course** (updated 2026-06-13): an identical picture used in both
  courses produces **two separate groups**, one per course. Grouping/membership is computed
  *within a single course* — images shared by ≥2 words *in the same course* become a group;
  the rest become per-word one-offs.
- **Missing images:** defer — only *surface* them by flagging `words.picture_missing`
  (scoped to the same two courses).

> Prereq already done: the case-mismatch fix on `memory_trigger_image_url` has been
> applied, so current URLs match real storage object names. Backfill relies on this.

### Target courses (backfill scope)
There is **no `course_id` on `words`**. A word relates to a course via
`words → lesson_words → lessons → courses`. The two in-scope courses:

| Course name                          | course_id                              |
|--------------------------------------|----------------------------------------|
| Turbo Boosters                       | `b1eaa124-808b-441c-8612-92b34c440db5` |
| Grammar Slammer & Sentence Builder   | `be6cf5e6-d19e-4337-bd85-7833b6c4b554` |

Scope membership predicate (reused in every backfill statement):
```sql
w.id IN (
  SELECT lw.word_id
  FROM lesson_words lw
  JOIN lessons l ON l.id = lw.lesson_id
  WHERE l.course_id IN (
    'b1eaa124-808b-441c-8612-92b34c440db5',
    'be6cf5e6-d19e-4337-bd85-7833b6c4b554'
  )
)
```

### Measured scope (2026-06-13)
- **9,980** distinct in-scope words, **all** with a non-empty `memory_trigger_image_url`
  (no overlap — 6,553 in Turbo Boosters, 3,427 in Grammar).
- **Course-scoped grouping** (the chosen model), grouping by exact URL within each course:

  | Course | Words w/ image | Groups (≥2) | Words in groups | One-off words |
  |--------|---------------|-------------|-----------------|---------------|
  | Turbo Boosters | 6,553 | **113** | **6,412** | 141 |
  | Grammar Slammer & Sentence Builder | 3,427 | **415** | **1,778** | 1,649 |
  | **Total** | 9,980 | **~528** | 8,190 | **1,790** |

- Edge case: only **3** filename stems (of 2,318) within a course map to >1 distinct URL,
  so grouping by exact URL ≈ grouping by stem. We group/assign by **exact URL** within a
  course (unambiguous master) and use the stem only to derive the human `key`.

---

## Data model

### New table `public.word_image_groups`
```
id               uuid PK default gen_random_uuid()
course_id        uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE  -- groups are course-scoped
key              text NOT NULL                   -- lower(decoded filename stem), e.g. 'turbo-tion-zione'
label            text NOT NULL                   -- human label, e.g. '-tion → -zione'
master_image_url text                            -- shared master (nullable)
is_exception     boolean NOT NULL default false  -- Turbo vs TurboX family
english_suffix   text                            -- optional, parsed best-effort
italian_suffix   text                            -- optional
notes            text
created_at/updated_at timestamptz

UNIQUE (course_id, key)   -- key is unique *within a course*, not globally
```
RLS mirrors `levels` (migration `...000007_v1b_levels_table.sql`): `ENABLE ROW LEVEL
SECURITY`, public `SELECT` policy `USING (true)`, writes via service role only.
Index on `word_image_groups(course_id)`.

### New columns on `public.words`
```
image_group_id     uuid NULL REFERENCES word_image_groups(id) ON DELETE SET NULL
image_override_url text NULL              -- per-word override; NULL = inherit group master
```
`memory_trigger_image_url` is **retained** and becomes the **materialized effective value**
(never edited directly going forward).

### Trigger logic (the core of the materialized approach)
- **Fn `words_resolve_trigger_image()`** — `BEFORE INSERT OR UPDATE OF image_group_id,
  image_override_url ON words`:
  `NEW.memory_trigger_image_url := COALESCE(NEW.image_override_url, (SELECT master_image_url FROM word_image_groups WHERE id = NEW.image_group_id));`
- **Fn `word_image_groups_fanout()`** — `AFTER UPDATE OF master_image_url ON
  word_image_groups`:
  `UPDATE words SET memory_trigger_image_url = COALESCE(image_override_url, NEW.master_image_url), updated_at = now() WHERE image_group_id = NEW.id;`

Result: changing a group master rewrites every inheriting member; setting/clearing a word
override recomputes just that row. One-off words (no group) simply have
`image_override_url` = their image.

---

## Migrations (`supabase/migrations/`, follow existing `20260606…` naming)

1. **`..._v1c_word_image_groups_table.sql`** — create table (incl. `course_id` FK +
   `UNIQUE (course_id, key)`) + RLS + index on `word_image_groups(course_id)`.
2. **`..._v1c_words_image_group_columns.sql`** — add the two `words` columns + FK + index
   `words(image_group_id)`.
3. **`..._v1c_word_image_resolve_triggers.sql`** — the two trigger functions + triggers.
4. **`..._v1c_backfill_image_groups.sql`** — idempotent backfill, **scoped to the two
   courses** and **grouped per course** (a word maps to exactly one scoped course; the two
   courses have zero overlap). Build a CTE of scoped `(word_id, course_id, url)` via the
   predicate above, then:
   - Insert one group per `(course_id, exact URL)` shared by ≥2 words **in that course**:
     `course_id`, `key = lower(decoded filename stem)`, `master_image_url = that URL`,
     `is_exception = (filename ~* 'turbox' OR filename ~ 'X\.png$')`, `label` best-effort
     from key. `ON CONFLICT (course_id, key) DO NOTHING` (covers the 3 stem→multi-URL
     collisions; the losing URL's words fall through to the one-off branch).
   - `UPDATE words SET image_group_id = g.id, image_override_url = NULL` for *scoped* words
     joined to a group on **`g.course_id = <word's scoped course>` AND `g.master_image_url
     = w.memory_trigger_image_url`** (fires BEFORE trigger → effective stays equal).
   - `UPDATE words SET image_override_url = memory_trigger_image_url` for the remaining
     *scoped* words with no group assignment (per-course one-offs, incl. stem-collision losers).
   - Words outside the two courses are left untouched (no group, no override).
5. **Data step (not a schema migration; run via `mcp__supabase__execute_sql`)** — flag
   missing, **scoped to the two courses**: `UPDATE words SET picture_missing = true WHERE
   <scope predicate> AND memory_trigger_image_url IS NOT NULL AND NOT EXISTS (matching
   storage.objects row)`. Surfacing only.

Apply via `mcp__supabase__apply_migration` (DDL) and `execute_sql` (the data step).

---

## App layer

### Types
- Regenerate `src/types/database-generated.ts` (command in CLAUDE.md). **Do not** edit the
  barrel `database.ts`.
- Add `WordImageGroup` alias in `src/types/aliases.ts`.

### Storage (`src/lib/supabase/storage.client.ts`)
- Extend `EntityType` to include `"image-groups"`. Master upload path becomes
  `image-groups/{groupId}/master.webp` via existing `generatePath` + `processWordImage`
  (reuse as-is). `uploadFileClient` already supports `upsert`.

### Queries — `src/lib/queries/imageGroups.ts` (new, mirror `queries/levels.ts`)
- `getAllImageGroupsAdmin()` — service-role (`createAdminClient`), returns groups (incl.
  `course_id` + joined course name) + member counts (`words` count grouped by
  `image_group_id`). Server-only. Order by course then label.

### Mutations — `src/lib/mutations/admin/imageGroups.ts` (new, mirror `mutations/admin/levels.ts`)
- `createImageGroup`, `updateImageGroup` (incl. `master_image_url` after upload → trigger
  fan-out), `deleteImageGroup` (warn: members lose inherited image unless overridden).
- `assignWordToGroup(wordId, groupId | null)` and `setWordImageOverride(wordId, url | null)`
  — thin wrappers around `updateWord`.
- `revalidatePath("/admin/image-groups")` + `revalidatePath("/admin/words")`.

### Validation — `src/lib/validations/admin.ts`
- Add `createImageGroupSchema` (incl. required `course_id: uuid()`) / `updateImageGroupSchema`.
- Extend `createWordSchema`/`updateWordSchema` (lines ~80-106) with `image_group_id:
  uuid().nullable()` and `image_override_url: string().url().nullable()`.

### Word mutations — `src/lib/mutations/admin/words.ts`
- `updateWord`/`createWord`: accept `image_group_id`, `image_override_url`. **Stop writing
  `memory_trigger_image_url` directly** — the trigger owns it.
- `deleteWord` already cleans storage via `deleteEntityFiles`; unchanged.

### Admin CMS page `/admin/image-groups` (mirror `/admin/levels`)
- `src/app/admin/image-groups/page.tsx` — server, calls `getAllImageGroupsAdmin()`.
- `ImageGroupsClient.tsx` — table: master thumbnail (`EditableImage`/Next Image), course,
  label, key, exception badge, member count, edit action. Group/filter by course.
- `ImageGroupEditModal.tsx` (mirror `LevelEditModal.tsx`) — edit label/suffixes/exception,
  upload/replace **master** (uses `uploadFileClient("word-images", file, "image-groups",
  groupId, "master")` then `updateImageGroup({master_image_url})`), and a read-only member
  list.

### AdminWordEditModal (`src/components/admin/AdminWordEditModal.tsx`)
- **Memory Trigger tab** (~lines 1531-1543):
  - Group selector (dropdown of `word_image_groups`) bound to `image_group_id`.
  - When inheriting (no override): show the group master as a read-only preview +
    "Override image for this word" action.
  - The existing `AdminFileUpload` now targets the **override**: in the upload block
    (~lines 476-540) change the trigger-image entry's `column` from
    `memory_trigger_image_url` → `image_override_url`, `fileType` stays `"trigger"`. Seed
    `previewUrls.triggerImage` from effective (`memory_trigger_image_url`) and treat
    `image_override_url` as the editable value.
- Add a "Clear override (re-inherit)" control that sets `image_override_url = null`.

### Sidebar (`src/components/admin/AdminSidebar.tsx`)
- Add `{ label: "Image Groups", href: "/admin/image-groups", icon: <Images className="h-5 w-5" /> }`
  to Section 2 (Content & media). Import `Images` from `lucide-react`.

### Read paths — **unchanged**
Study (`StudyModeClient.tsx`), Test (`TestModeClient.tsx`), `queries/words.ts`
(`words(*)`), preload, and `EditableImage` all keep reading `memory_trigger_image_url`.

---

## Verification
1. **Migrations apply** cleanly (`apply_migration`); `list_migrations` shows the 4 v1c entries.
2. **Backfill sanity (SQL):**
   - `SELECT count(*) FROM word_image_groups;` ≈ **528** (113 Turbo + 415 Grammar).
   - `SELECT course_id, count(*) FROM word_image_groups GROUP BY course_id;` → 113 / 415.
   - Every inheriting member equals its master:
     `SELECT count(*) FROM words w JOIN word_image_groups g ON g.id=w.image_group_id WHERE w.image_override_url IS NULL AND w.memory_trigger_image_url IS DISTINCT FROM g.master_image_url;` → **0**.
   - One-offs covered: ungrouped *in-scope* words have `image_override_url = memory_trigger_image_url`.
   - Out-of-scope words untouched: `image_group_id IS NULL AND image_override_url IS NULL`.
3. **Trigger fan-out:** update one group's `master_image_url`, confirm all inheriting
   members change in one statement; set a word override and confirm only that row diverges;
   clear it and confirm re-inherit.
4. **Missing flag:** `SELECT count(*) FROM words WHERE picture_missing;` ≈ scoped missing count.
5. **Build/lint:** `npm run lint` and `npm run build` pass after type regen.
6. **Manual E2E:** `/admin/image-groups` lists groups with thumbnails + counts; replacing a
   master updates a learner's study page image for a member word; overriding one word in
   `AdminWordEditModal` diverges it; clearing re-inherits.

## Risks / notes
- Group **delete** sets members' `image_group_id` to NULL; inheriting members then show no
  image (override-only survive). UI must warn.
- All image authoring must route through `image_override_url`/group master (covered by the
  modal + mutation edits above) since direct `memory_trigger_image_url` writes are bypassed.
- Fan-out updates can touch hundreds of rows per master change — a single bulk `UPDATE`,
  fine for an admin action.
- Backfill is **scoped to two courses**; words in other courses keep their current
  `memory_trigger_image_url` with no group/override and are not surfaced by `picture_missing`.
