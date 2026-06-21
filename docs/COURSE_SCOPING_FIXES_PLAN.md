# Course-Scoping Fixes Plan

Six bugs reported on first opening the French course. All stem from data/stats
leaking from the user's previously-active course (Italian) into the newly-opened
French course, plus an XP terminology pass and a lesson-ordering data bug.

## Root-cause summary (investigated)

1. **Header/Sidebar learning stats are sourced from the stale persisted course.**
   `(dashboard)/layout.tsx` streams header stats computed against
   `users.current_course_id` (still Italian on first visit — it's only updated
   via `after()` once you land on the course). The course-scoped layout
   (`course/[courseId]/layout.tsx`) overrides *some* stats into `CourseContext`
   (`dueTestsCount`, words mastered/total, progress %) — but **not** words-per-day
   or learning time, so those keep showing Italian. This explains **#4** and **#5**.
2. **`Sidebar.tsx:153` has inverted precedence:** `propDueTestsCount ?? contextDueTestsCount`.
   The stale streamed prop (Italian's "7") is non-null so it wins over the correct
   course-scoped context value. This is **#1**.
3. **XP has no per-course breakdown.** Everything reads `users.lifetime_xp`
   (all-account). Verified `lifetime_xp == SUM(test_sessions.points_earned)`
   exactly, so a course total is computable on the fly. This is **#2**.
4. **French `sort_order` is wrong.** The scheduler orders by `sort_order`, but the
   French import set `sort_order = legacy_lesson_id` (scattered) instead of the
   curriculum order. The clean order lives in `number` (School=1, Town=2, …,
   matching the All Lessons page). Italian has `number == sort_order`, so it was
   never exposed. This is **#3**. Fix: `sort_order = number`.

## Decisions confirmed with user
- XP secondary stats (Today / Best day) on Tests & Progress: **make course-specific**.
- Scheduler order: the All Lessons `number` order (School first) is canonical;
  set `sort_order = number` so the scheduler agrees.

---

## Fix 1 — Course-scope the header/sidebar learning stats (#1, #4, #5)

**Files:** `course/[courseId]/layout.tsx`, `context/CourseContext.tsx`,
`components/SetCourseContext.tsx`, `components/Header.tsx`, `components/Sidebar.tsx`.

- Course layout additionally calls `getUserLearningStats(courseId)` **and**
  `getUserLearningStats()` (all-course, for the popover's second column) and pushes
  into `CourseContext`:
  - `wordsPerDay` (course)
  - `studyTimeSeconds` / `testTimeSeconds` / `totalTimeSeconds` (course)
  - `allCourseStudyTimeSeconds` / `allCourseTestTimeSeconds` / `allCourseTotalTimeSeconds`
- `CourseContext` + `SetCourseContext` gain these optional fields.
- `Header.tsx` `effectiveStats`: prefer context values for `wordsPerDay` and the
  course time breakdown (same `context.X ?? baseStats.X` pattern already used for
  words-mastered/total/percent).
- `Sidebar.tsx:153`: flip to `contextDueTestsCount ?? propDueTestsCount` so the
  course-scoped value wins inside a course, falling back to the streamed value on
  non-course pages.

**#4 specifically:** once scoped, a fresh French course reads 0 study/test time →
`wordsPerDay = 0` (no more "33"). Tooltip copy "(this course)" already correct.

**#5 (learning-time popover):** convert the popover body to a two-column table:
`This course | All courses`, rows = Study / Test / Total. Headline stat (in the
header) stays course-specific. Reuse existing `Popover` + `formatDuration`.

States: zero (new course shows 0s), large values (formatDuration handles), loading
(already streamed via Suspense). Mobile: table is small; keep current popover width.

## Fix 2 — Course-specific XP + terminology (#2)

**New query:** `getCourseXp(courseId)` in `lib/queries/` returning
`{ totalXp, todayXp, bestDayXp }`, all summed from `test_sessions.points_earned`
scoped to the course via the existing `course_id = courseId` **OR** `lesson_id in
(course lessons)` pattern (catches auto-lesson rows with null `course_id`).
- `todayXp` = sum where `taken_at::date = today`.
- `bestDayXp` = max daily sum grouped by `taken_at::date`.

**Tests page** (`tests/page.tsx`, `getTests`): rename "Lifetime XP" →
**"Total XP (This course)"**; value = course `totalXp`. Tooltip Today/Best-day use
course `todayXp`/`bestDayXp`. Daily-goal ring keeps the user's `daily_xp_goal`
(an account setting) but measures course `todayXp` against it.

**Progress page** (`SummaryCards.tsx`, `getProgressStats`): card label →
**"Total XP (This course)"**; value = course `totalXp`; "Best day" → course `bestDayXp`.

**Leaderboard** (`LeaderboardClient.tsx` `PersonalBestsStats`, `getPersonalBests`):
add a **"Total XP (All Course)"** stat = `users.lifetime_xp` (stays all-account).

**Experience Level** (`LevelCard.tsx`): relabel "Current XP" →
**"Current XP (all course)"**. Value unchanged (all-account `lifetime_xp`).

## Fix 3 — Progress page title (#6)
`progress/page.tsx`: `Progress` → **`Course Progress`**.

## Fix 4 — Scheduler lesson order (#3)
- **Data migration** (new `supabase/migrations/*.sql`): for both French courses,
  `UPDATE lessons SET sort_order = number`. Verified `number` is clean, unique,
  contiguous 1..N per course; `sort_order` currently = scattered `legacy_lesson_id`.
  After this the scheduler greets "School" first, matching All Lessons.
- **Importer fix** (future languages): set `sort_order = number` (curriculum order)
  rather than `legacy_lesson_id` when creating lessons, so this can't recur.

---

## Quality checklist
- States: empty/first-time (zeros), large numbers, loading (streamed) — covered.
- No off-palette colours / new typography utilities; reuse XpBadge, XpIcon,
  Tooltip, Popover, `formatDuration`/`formatNumber`, `courseScopeOr` pattern.
- Guest mode: queries already short-circuit to zeros.
- RLS: reads are user-scoped; the migration is content data (no RLS change).
- `npm run lint` clean for touched files; no dead code.

## Out of scope / follow-up
- Backfilling a cached per-course XP column (on-the-fly sum is exact and simpler).
- Re-checking other languages' `sort_order` vs `number` if more courses are imported.
