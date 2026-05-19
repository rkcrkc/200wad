# Initial Words Per Day — Plan

Status: **Proposed, not yet implemented.**

Captures the user's "first-acquisition" pace, divorced from review/mastery
time. Complements the existing words/day rate (which is dragged down over
time by review hours on already-learned words).

---

## 1. What it measures

For each lesson `L` in the current course, we attribute the time the user
spent on that lesson up to (and only up to) the point where every testable
word in the lesson first reached `learned` status. After that, further
review/mastery time on `L` does not count.

In-progress lessons contribute their full sunk time so far, so the rate
updates continuously as the user works through new lessons.

```
testableWords(L) = words in L where category != 'information'
allLearned(L)    = every w in testableWords(L) has user_word_progress.learned_at != null
completionTs(L)  = max(learned_at[w]) over testableWords(L)  -- only when allLearned(L)

initialTime(L) =
  if allLearned(L):
      Σ study_sessions on L  where started_at ≤ completionTs(L)  duration_seconds
    + Σ test_sessions on L where taken_at  ≤ completionTs(L)  duration_seconds
  else:
      Σ study_sessions on L  (started_at not null)  duration_seconds
    + Σ test_sessions on L (taken_at not null)   duration_seconds
```

Course aggregate (single scalar):

```
totalInitialTime   = Σ_L initialTime(L)
totalLearnedWords  = count of course words with learned_at != null AND category != 'information'
initialWordsPerDay = Math.round((totalLearnedWords / (totalInitialTime / 3600)) * 8)
```

`× 8` matches the existing rate convention (8-hour day).

---

## 2. Definitions and decisions

| Decision | Choice |
|---|---|
| "Learned" definition | `user_word_progress.learned_at IS NOT NULL` (one full-marks 3/3 test). Not `mastered_at`. |
| Information pages | Excluded from both numerator and lesson completeness check. A lesson where every word is an info page is skipped entirely. |
| In-progress lessons | **Included** — all sunk time so far counts. As each word hits `learned_at` the lesson contribution continues; once the final word lands, the timestamp cutoff freezes the contribution. |
| Time cutoff inclusivity | `≤ completionTs(L)` — the test that pushes the last word to `learned` is part of the initial effort. |
| Scope | Current course only (matches the existing course-scoped rate). |
| Storage | **Option A: compute on read.** Migrate to materialised columns (Option B) only once the UX and math have settled. |
| Display surface | Progress page course-completion chart, as a secondary line. No per-lesson surfacing. |
| Aggregate scalar exposure | Optional — could surface as a tile later, but for now we only ship the chart series. |

### Auto-lessons (important)

Migration `20260515000001` dropped the FK from
`study_sessions.lesson_id` / `test_sessions.lesson_id` → `lessons.id` so
synthetic auto-lesson IDs (e.g. `auto-best-{courseId}`) can be stored.
`getProgressStats` now resolves course-scoped time via
`.in("lesson_id", [...realLessonIds, ...getAllAutoLessonIds(courseId)])`.

Auto-lessons **must be excluded** from `initialTime`:

- Auto-lessons have no rows in `lesson_words`, so there is no
  `testableWords(L)` set for them.
- Their sessions/tests are review/practice, not initial acquisition.
- Practically: when aggregating per-lesson contributions, only iterate
  over **real** course lesson IDs (the values of `courseLessons` query),
  not the synthetic IDs returned by `getAllAutoLessonIds`.
- Sessions/tests whose `lesson_id` matches an auto-lesson are dropped
  for the purposes of `initialTime`. They still appear in the existing
  course-wide totals (and are correctly excluded by the per-lesson
  attribution because no real lesson claims them).

### Edge cases handled by the formula

| Case | Behaviour |
|---|---|
| Word drops from `mastered` → `learning` | `learned_at` is preserved by the floor rule (`CLAUDE.md`), so `completionTs(L)` is unchanged. |
| Admin adds a new word to a completed lesson | New word has no `learned_at`, so `allLearned(L)` flips back to false and the lesson re-enters "in-progress". Subsequent time counts again, until the new word lands. Self-healing on Option A. |
| Session with null `lesson_id` | Already excluded by the `.in("lesson_id", [...])` scope. |
| Session attributed to a different course's lesson | Same — excluded by `.in()` scope. |
| User with zero learned words | `totalLearnedWords = 0`, rate = `0`. Chart line starts at 0 and lifts on the first `learned_at`. |
| User with learned words but no logged time | Won't happen — sessions/tests are the source of `learned_at` transitions, so any learned word has at least one preceding test. |

---

## 3. Per-day chart series

The progress chart is a daily time-series. We need `initialWordsPerDay` to
plot at any point in the history.

### Algorithm (run once during the existing date sweep in `getProgressStats`)

1. **Precompute** for each real lesson `L`:
   - `testableWordIds(L)` — already built in `fetchCourseWordIds`
   - `learnedAt[w]` for every `w ∈ testableWordIds(L)`
   - `completionTs(L)` if `allLearned(L)`, else `null`

2. **Bucket sessions/tests by date** with an attribution rule:
   - If `lesson_id` is not a real course lesson (auto-lesson or out-of-course) → skip
   - Let `L = lessons[session.lesson_id]`, `t = session.started_at` (or `test.taken_at`)
   - If `completionTs(L) == null` OR `t ≤ completionTs(L)`: include the duration in that date's `initialTimeSecondsForDay`
   - Else: skip (review/mastery time)

3. **Sort dates** (same `sortedDates` we already build) and produce a
   running `cumulativeInitialTimeSeconds` per `ChartDailyRow`.

4. In `src/lib/utils/chart.ts`, compute per-bucket:

   ```ts
   const initialHours = bucket.lastCumulativeInitialTimeSeconds / 3600;
   const initialWordsPerDay = initialHours > 0
     ? Math.round((bucket.lastCumulativeLearned / initialHours) * 8 * 10) / 10
     : 0;
   ```

   Render as a second line on the existing performance chart.

### Type additions

`src/lib/queries/stats.ts`:

```ts
export interface ChartDailyRow {
  // …existing fields…
  initialTimeSecondsForDay: number;          // new
  cumulativeInitialTimeSeconds: number;      // new
}

export interface ProgressPageStats {
  // …existing fields…
  initialWordsPerDay: number;                // new (scalar; optional surface)
}
```

`src/lib/utils/chart.ts`:

- New series option (probably alongside `value2`) for `initialWordsPerDay`
- New colour token + legend label

### Display

- New chart line alongside the current lifetime words/day line.
- Legend label: TBD — proposed **"Initial pace"** vs existing **"Words/day"**.
- Both lines visible simultaneously so the divergence (review time
  pulling the lifetime rate down) is meaningful.

---

## 4. Files touched

| File | Change |
|---|---|
| `src/lib/queries/stats.ts` | Extend `fetchCourseWordIds` (return `Map<lessonId, Set<wordId>>` in addition to flat set); compute `completionTs(L)`; per-day initial-time bucketing; aggregate `initialWordsPerDay` scalar; new `ChartDailyRow` fields. |
| `src/lib/utils/chart.ts` | New series definition + per-bucket initial-rate computation. |
| Whichever client component renders the performance chart (TBD during implementation) | Render the new line, legend entry, hover tooltip. |
| `src/lib/text.ts` | Optional new keys for legend labels / popover copy when surfaced. |

---

## 5. Out of scope (for v1)

- Materialised columns (`user_lesson_progress.initial_completed_at`,
  `initial_time_seconds`). Revisit if Progress page query gets slow on
  power users.
- Per-lesson surfacing (lesson card, lesson list, study notes).
- Header popover line — only consider once the chart series has lived
  in production for a while and we trust the number.
- Comparison badges ("you've sped up X% since lesson 1").

---

## 6. Open questions before implementation

1. **Legend label** — "Initial pace" vs "Acquisition rate" vs other?
2. **Chart visual** — solid second line, or dashed? Same Y-axis as existing words/day (left), since units match.
3. **Scalar exposure** — surface `initialWordsPerDay` as a Progress page tile in v1, or chart-only? (Plan above currently says chart-only.)
4. **What happens during the first few days where no lesson is yet complete?** The formula handles it (uses in-progress time), but the rate will look noisy. Worth a UI accommodation (e.g. dim the line until the first lesson completes)?
