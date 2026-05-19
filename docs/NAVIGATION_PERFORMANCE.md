# Navigation Performance — Fixes Applied & Backlog

A working log of the page-navigation speed work. The goal was making page
transitions feel near-instant by trimming server-side critical-path work,
streaming slow data, and warming dynamic-route data on hover.

## Fixes applied

### Fix #1–4 — Initial wave (commit `434491c`)
Speed up navigation with loading skeletons and cached global queries.
- Added `loading.tsx` skeletons on the slow routes so the shell paints
  immediately while the server completes.
- Wrapped truly-global queries (pricing plans, enabled tiers, text
  overrides, language list) with `unstable_cache` so repeat hits skip the
  DB entirely.
- Standardised the dashboard shell so it doesn't reflow on every
  navigation.

### Fix #5 — Cut the duplicate auth round-trip (commit `a54722c`)
`UserContext` was calling `supabase.auth.getUser()` again on every page
even though the root layout had already resolved the user. Reused the
server-rendered user object via context instead, dropping one network
round-trip per navigation.

### Fix #6 — Parallelize lesson-page reads (commit `a54722c`)
`/lesson/[lessonId]` was awaiting course → lesson → words sequentially.
The course query was hoisted to the layout and run in parallel with the
lesson/words fetch, so the longest read no longer chains behind two
others.

### Fix #7 — Drop the heavy `user_test_scores` embed (commit `a54722c`)
`getWords()` was embedding
`user_test_scores(lesson_id, auto_lesson_type, course_id, lessons(id, title, emoji, number))`
into every `test_questions` row to build a "where was this answered"
label that was never read by any consumer. Removed the embed plus the
unused fields from `TestAttempt`. Single biggest per-word-page win.

### Fix #8 — Skip top-N leaderboard fetch in the dashboard layout (commit `d0b90f8`)
The dashboard header only needs the signed-in user's rank, not the full
leaderboard. Added `getUserLeaderboardPosition()` — a thin wrapper that
calls only the `get_user_leaderboard_position` RPC — and switched the
layout to it. Cuts the leaderboard cost in half on every dashboard hit.

### Fix #9 — Stream slow header stats via Suspense (commit `cbbb049`)
The layout was awaiting nine queries in `Promise.all` before rendering
any children. Split into:
- **FAST (awaited inline):** pricing plans, enabled tiers, text overrides,
  subscriptions, subscription display info — these power providers the
  children need synchronously.
- **SLOW (bundled into an un-awaited Promise):** due-tests count, user
  learning stats, course progress, leaderboard rank — streamed into a
  new `HeaderStatsContext` via a `<Suspense>` bridge that calls
  `use(promise)` inside its own boundary.

The shell, sidebar, and child page all render immediately. The header
and sidebar fill in their stats once the bundle resolves; everything
else doesn't wait.

Implementation: `src/context/HeaderStatsContext.tsx` plus rewrites of
`src/app/(dashboard)/layout.tsx` and `src/components/DashboardContent.tsx`.

### Fix #10 — SKIPPED (Image optimization)
`next.config.ts` ships `unoptimized: true`. Investigated turning Next's
optimizer back on, but `docs/technical-questions.md` documents this as a
deliberate decision on 27 Apr 2026 after hitting Vercel's free-tier
5,000 image-transformation cap. Left as-is by user direction.

### Fix #11 — Force full prefetch on hot Link instances (commit `4f72dc6`)
Next 16 defaults to skeleton-only prefetch for dynamic routes
(`/lesson/:id`, `/course/:id/...`). Added `prefetch` to the most-
traveled navigation links so the data prefetch fires alongside the
route prefetch:
- `Sidebar.tsx` / `MobileMenu.tsx` — single reusable nav-item component
  drives all sidebar and drawer entries
- `Header.tsx` — Course Progress, Words/Day, Leaderboard Rank stat
  blocks
- `CourseCard.tsx`, `LanguageCard.tsx` — browse flow
- `SchedulerCard.tsx` — eye/preview lesson icon
- `TestRow.tsx` — both lesson links (title + preview button)
- `LessonPageContent.tsx` — prev/next footer
- `WordDetailView.tsx` — lessons tab list

## Backlog (not yet implemented)

### Phase B/C caching — deferred from Fix #2
Wrap the expensive per-user queries (`getCourseProgress`,
`getUserLearningStats`, `getUserLeaderboardPosition`,
`getDueTestsCount`) with `unstable_cache` keyed by user+course, plus
tag-based revalidation triggered by the mutations that change those
numbers (test submit, study session save, subscription change). Repeat
visits within a session would skip the DB entirely.

### Route-segment caching / `revalidate` on dashboard layout
The dashboard layout + `/course/[courseId]/*` segments still rerun all
server work on every navigation between sibling pages. A short
`revalidate` (e.g. 30–60s) or explicit `cache: "force-cache"` with
tag-based busting on relevant routes would let the layout shell come
from cache when bouncing between schedule ⇄ tests ⇄ dictionary.

### `loading.tsx` for the remaining slow routes
Some routes still flash blank before paint:
- `/lesson/[lessonId]/test` (test-taking view)
- `/course/[courseId]/dictionary`
- `/course/[courseId]/progress`

Each needs a route-local skeleton matching its real layout so the shell
shows instantly on click.

### Drop the `getCurrentCourse` round-trip from the dashboard layout
The layout awaits `getCurrentCourse()` to resolve `course` and
`language` for the header. `users.current_course_id` (plus a join on
`courses` and `languages`) can be folded into the same request that
fetches the user, removing one serial read from every dashboard hit.

### Split `WordDetailView.tsx`
File is ~1200 lines and ships a lot of admin-only JS (developer notes
section, picture-flag controls, system-notes editor) to every word
page. Code-split the admin section behind a dynamic import gated on
`isAdmin` so non-admin users don't pay the bundle cost.

### Image dimensions / lazy mounts for heavy panels
`WordsList` and `LessonActivityHistory` are mounted on the lesson page
even when hidden behind tab toggles. Defer their initial mount until
they're visible, and supply explicit `width`/`height` to `<Image>`
where missing so the browser doesn't lay out twice.

### Audit `router.push()` callsites
Three places use `router.push()` instead of `<Link>` and miss prefetch
entirely:
- `LessonPageContent.tsx` — `handleStartTest`
- `WordDetailView.tsx` — upgrade fallback to `/account/subscriptions`
- elsewhere flagged by the original prefetch audit

Either swap to `<Link>` where the action is a pure navigation, or call
`router.prefetch(href)` on hover/intent for the imperative cases.

## Notes / conventions

- Anything that streams via `<Suspense>` must keep its fallback shape
  pixel-identical to the resolved shape — otherwise the swap reflows
  the page and undoes the perceived-perf win.
- `unstable_cache` keys must include every variable that scopes the
  result (user id, course id, language id) or callers will see stale
  data after switching courses.
- Server Actions that mutate cached data must call `revalidateTag()` for
  every tag the cached query is registered under, not just the most
  obvious one.
- `prefetch` on `<Link>` is now the default we want for any link that
  routes to a dynamic segment; the few exceptions (upgrade modal
  triggers, sign-out, etc.) should remain off.
