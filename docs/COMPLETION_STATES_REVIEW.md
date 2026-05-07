# Completion States Review

A full audit of how completion is defined, surfaced, and routed across word → lesson → free-tier → course → language. Findings are based on actual code paths, with gaps flagged at the end.

---

## 1. Word Completion

### Definition
Defined in `src/lib/queries/words.ts:57`:

- `not-started` → no progress row
- `learning` → answered in study (`markWordsAsLearning`, `src/lib/mutations/study.ts:323`)
- `learned` → 3/3 in test (no mistakes, no clues), stamps `learned_at`
- `mastered` → `correct_streak >= 3`, stamps `mastered_at`
- Floors prevent regression (`src/lib/mutations/test.ts:430`)

Tracked in `user_word_progress` (`src/types/database.ts:1220`):
- `status`, `learning_at`, `learned_at`, `mastered_at`
- `correct_streak`, `times_tested`, `total_points_earned`, `best_clue_level`

### What the user sees
- **Study session** — silent transition. No per-word feedback.
- **Test session** — aggregated counts in `TestCompletedModal.tsx` (newly learned, newly mastered) with popovers listing the words.
- **One-time achievement toasts** — `first_word_learned`, `first_word_mastered` (`src/lib/notifications/achievements.ts`).

### Next CTA
None at word level. Word state only feeds lesson modals.

### Gap
No per-word celebration on the *moment* of mastery (e.g. inline confetti, badge anim). Users typically only learn they mastered a word after the test summary screen.

---

## 2. Lesson Completion

### Definition
Defined in `src/lib/queries/lessons.ts:467` and `src/lib/mutations/study.ts:448`:

- `learning` → any word at `learning+`
- `learned` → 100% of testable words at `learned+` (information pages excluded from denominator)
- `mastered` → 100% of testable words at `mastered`

Plus a parallel **milestone schedule** (`src/lib/utils/milestones.ts`):
`initial → 1-day → 1-week → 1-month → 1-quarter → 1-year`
Advances on each scheduled test (`src/lib/mutations/test.ts:470`).

Tracked in `user_lesson_progress`:
- `status`, `completion_percent`, `words_mastered`, `words_learned`
- `total_study_time_seconds`, `last_studied_at`
- `next_milestone`, `next_test_due_at`

### What the user sees
- **End of study** → `LessonCompletedModal.tsx`: title "Lesson completed!", elapsed time, word grid with status tabs (All / Learning / Learned / Mastered). No animation/celebration.
- **End of test** → `TestCompletedModal.tsx`: score %, time, newly learned, newly mastered, course-wide vocab total, incorrect-words tab.
- Milestone advancement is **completely invisible** to the user.

### Next CTA
- **After study** — `Start test` (primary) / `Study again` / `Not now`
- **After test (imperfect)** — `Retest incorrect` (primary) / `Study incorrect` / `Retest all` / `Not now`
- **After test (100%)** — `Retest all` / `Done`

### Gaps
- No differentiation between "lesson learned" (100% learned) and "lesson mastered" (100% mastered) in the modal — both look identical.
- Hitting the **1-year milestone** (terminal state of a lesson's journey) is silent. Major missed celebration.
- "Done" CTA after a perfect test just dismisses — doesn't auto-suggest next lesson.

---

## 3. Free-tier (Locked) Lesson Completion

### Definition
`courses.free_lessons` defines N free lessons. Lessons N+1+ require a subscription.

### What the user sees
- Trying to open a locked lesson → redirect to course page with `?upgrade-lesson=<id>` (`src/app/(dashboard)/lesson/[lessonId]/study/page.tsx:21`).
- Course page auto-opens `UpgradeModal.tsx` showing Free / Language / All-Languages tiers + Monthly / Annual / Lifetime toggle.

### Next CTA
Subscribe (Stripe) or dismiss.

### Gap (significant)
There is **no celebration when a free user completes the last free lesson**. The conversion moment is wasted: the user only encounters the upgrade modal *after* trying a locked lesson, which feels like a wall rather than a reward. A "You've mastered the free lessons — keep going?" celebratory upsell is missing.

---

## 4. Course Completion

### Definition
`src/lib/queries/courses.ts:223`:

```
status = "mastered" if wordsMastered >= actualWordCount (excl. info pages)
       = "learning" if any words studied
       = "not-started" otherwise
progressPercent = wordsMastered / actualWordCount * 100
```

### What the user sees
- Progress bar on course page header.
- Per-lesson status pills.
- **Nothing at 100%.** No end-of-course screen, no trophy, no toast, no recommendation.

### Next CTA
None. User must manually navigate.

### Gaps
- No celebration screen at 100% word mastery.
- No "next course in this language" recommendation.
- No summary stats (time invested, words learned, streak, fastest lesson, etc.).
- No distinction in UI between "all lessons completed once" vs. "all words mastered" — these are different milestones and could each be acknowledged.

---

## 5. Language Completion

### Definition
Implicit. Computed on the fly by summing course progress; no `language_completion` row, no derived status field.

### What the user sees
Nothing language-specific. Dashboard lists languages with raw progress numbers.

### Next CTA
None. App offers no signal that an entire language is complete.

### Gaps
- No language completion concept at all in the data layer.
- No celebration, no shareable moment, no journey summary.
- No prompt to start a new language or revisit milestones.

---

## Cross-cutting observations

| Layer | Current | Worth designing |
|---|---|---|
| Word | Silent in study, summarised in test modal | Inline mastery confirmation? Streak celebrations at 3 / 10 / 30 days? |
| Lesson | Modal with stats, no celebration | Differentiate "completed", "learned", "mastered" visually. Celebrate terminal 1-year milestone. |
| Free-tier exhaustion | Hard wall, retroactive upgrade modal | **Proactive** celebration upsell when last free lesson finishes |
| Course | Silent at 100% | End-of-course summary + next-course CTA |
| Language | Doesn't exist as a state | Language mastery screen, shareable artefact |
| Milestones | Schedule advances silently | Surface milestone progression — users don't know they're on a 1-year journey |
| Recommendation | None | After any completion, suggest the obvious next thing (next lesson / retest weakest / next course / new language) |

---

## Key product questions

1. Should "lesson complete" mean *learned all words once* or *mastered all words*? Right now both surface the same modal.
2. Is the 1-year milestone the actual end of a lesson's journey, and if so how do we mark it?
3. Where does conversion live — at the wall, or at the celebration *before* the wall?
4. Is there a notion of "graduating" a course/language, or do users keep cycling through milestones forever?
5. Do we want streaks, badges, or shareable moments tied to any of these completion states?

---

# Proposed direction

This section captures decisions and design directions agreed in review. Implementation is sequenced separately.

## Guiding principles

- **Every completion ends with a clear next action.** No dead-end "Done" buttons.
- **Tier celebrations to match the size of the moment.** Per-word toast → per-lesson celebration → per-course/language major modal with share.
- **Conversion lives at the celebration, not at the wall.** Use the peak emotional moment (last free lesson done) to upsell, not the moment of denial.
- **Major celebrations are shareable.** Generate dynamic OG images so milestones can travel. Share button is a standard slot on every celebration modal.
- **Major-milestone modals are first-class, admin-managed content** (see "Major milestone modals" below).

## 1. Word — newly mastered

- **Per-word toast** the moment a word's `correct_streak` hits 3 (mastery transition). Each newly-mastered word gets its own toast — not aggregated.
- **Inline confetti burst** at the same moment, on the answer screen.
- **Aggregated count already exists** in `TestCompletedModal.tsx` via `masteredWordsCount` with popover listing the words. No new aggregated UI needed.
- Existing `first_word_mastered` achievement still fires once.
- Streak badges deferred to future badge system.

## 2. Lesson — distinguish actual state transitions

### "Lesson completed" tier removed

The lesson state machine is `not-started | learning | learned | mastered`. There is no "completed" state. Finishing a study session doesn't necessarily change lesson state, so the current `LessonCompletedModal` is misnamed.

**Reframe:**
- **Rename** `LessonCompletedModal.tsx` → `StudySessionCompletedModal.tsx` (codebase hygiene).
- **User-facing copy** changes from "Lesson completed!" to a neutral "Study session complete" / "Nice work!".
- **Celebration overlay fires only when lesson state actually transitions.**

### Two real lesson celebration moments

| Trigger | Modal | Treatment | Accent |
|---|---|---|---|
| Lesson transitions to `learned` (100% words at learned+) | Medium celebration | Filled badge | Primary blue |
| Lesson transitions to `mastered` (100% words at mastered) | Major celebration + confetti + share | Trophy/star | Success green |

### Perfect test CTA hierarchy

Replace current `Retest all / Done` with context-aware CTAs:

| Context | Primary | Secondary | Tertiary |
|---|---|---|---|
| More lessons in course | `Next lesson →` | `Retest all` | `Done` |
| Last lesson, course not yet mastered | `Retest all` | `Done` | — |
| Last lesson, triggers course completion | (hand off to course celebration modal) | — | — |
| Lesson newly mastered | `Next lesson →` | `Review stats` | `Done` |

### Milestone schedule extension

Extend `MILESTONE_ORDER` from `1-year` to include `2-year`, `3-year`, `4-year`, `5-year`. Five-year is the **terminal graduation** moment.

| Milestone | Treatment |
|---|---|
| `initial` → `1-month` | Silent advancement |
| `1-quarter` | Subtle toast |
| `1-year` | Medium celebration modal: "Committed to long-term memory" |
| `2y, 3y, 4y` | Light celebration toasts |
| `5-year` | Major celebration modal: "Retained for life" + certificate + share |

(Milestone timeline UI component dropped — not pursuing.)

## 3. Free tier — celebrate, then convert

Move primary conversion from the wall to the celebration.

### Trigger

Fires once per user, idempotent, on whichever happens **first**:
- (a) Test taken on the last free lesson (any score), OR
- (b) Last free lesson reaches `learned`, OR
- (c) Last free lesson reaches `mastered`.

### Flow

1. The standard test completion modal renders as normal (no changes to it).
2. On dismiss, a celebration variant of `UpgradeModal` opens automatically:
   - Hero stats (words mastered so far, days active, study time)
   - Headline: "You've finished your free lessons in [Course]"
   - Plan cards (Free / Language / All Languages)
   - Primary CTA: `Unlock the next [N] lessons`
3. Existing wall-based `UpgradeModal` (`?upgrade-lesson=…`) stays as fallback for users who jump ahead.

## 4. Course — two completion moments

| Trigger | Modal | Treatment | Primary CTA |
|---|---|---|---|
| **All lessons learned** | Medium celebration + share | Filled badge | Push for mastery on weakest lesson |
| **All lessons mastered** | Major celebration + confetti + share | Trophy | `Start [next course] →` |

Course-mastered modal layout:
- Hero: course title + completion badge
- Stats grid (selection deferred to admin preview review — candidates: words mastered, lessons mastered, total study time, days from start to finish, longest streak, perfect-test count, fastest lesson)
- Primary CTA: next course in same language
- Secondary: "Try a new language" with 3–4 suggestions
- Tertiary: share button

(Graduation tier — every lesson at 5y — deferred to badge system.)

## 5. Language — two completion moments

Parallel to course; both tiers fire major celebrations. Mastered is the bigger moment with share prominence.

| Trigger | Modal | Primary CTA |
|---|---|---|
| **All courses learned** | Major celebration + share | Push for mastery on weakest course |
| **All courses mastered** | Major celebration + confetti + share | Pick a new language |

Layout (mastered):
- Hero: "You've mastered [Language]" + flag + trophy
- Lifetime stats across all courses
- Primary CTA: pick a new language (3–4 prominent suggestions)
- Secondary: explore advanced content / revisit weakest words
- Share button prominent

(Stats selection also deferred to admin preview review.)

## 6. Graduation — deferred to badge system

Capture all needed timestamps now (`learned_at`, `mastered_at`, milestone advancement). Graduation status (e.g. "all lessons learned" → graduated, "all lessons mastered" → graduated tier 2) becomes a future badge layered on top of existing data without rework.

## 7. Major milestone modals — managed via existing notification admin

Major celebrations are **admin-managed templates**, not hardcoded UI. Copy, imagery, and CTAs tunable without deploys.

Extend the notification system:
- Add `display_type` enum: `toast | modal | banner | email | push`
- Templates can target one or more channels
- A global `MajorMilestoneModal` component renders any template flagged as `modal`
- Admin gains a modal-channel preview alongside existing toast/email previews
- A/B testing celebration copy becomes possible

Templates to add:
- `lesson.learned` (medium)
- `lesson.mastered` (major)
- `lesson.milestone_1year`
- `lesson.milestone_5year` (with certificate)
- `course.all_learned`
- `course.mastered`
- `language.all_learned`
- `language.mastered`
- `free_tier.completed` (upgrade variant)

## 8. Shareable moments

- **Web Share API** as primary trigger (native share sheet on mobile, copy-link fallback on desktop).
- **Dynamic OG images** at `/share/achievement/[token]`, auto-generated via Next.js `ImageResponse` (Satori) using template metadata (title, stats, badge).
- Token is opaque; image shows achievement + course/language + headline stats only (no PII unless opted in).
- **Admin OG controls per template:**
  - Default: auto-generated dynamic OG.
  - Override: upload a static image for bespoke art.
  - Remove: falls back to default.
  - Preview: render current OG (default or override) inline in admin.
- Public profile / brag-board view deferred; share-token route can host it later.

## 9. Next-action recommendation matrix

Bake into every completion modal:

| Completion | Primary next action |
|---|---|
| Word mastered | (toast + confetti, no CTA) |
| Test imperfect | Retest incorrect words |
| Test perfect, lesson not yet mastered | `Done` (no nag — next milestone test will come due) |
| Lesson newly learned | Aim for mastery on weakest words |
| Lesson newly mastered | Next lesson in course |
| Last free lesson (any of a/b/c) | Unlock more (upgrade) |
| Last lesson in course | Hand off to course-completion modal |
| Course learned | Push for mastery on weakest lesson |
| Course mastered | Next course in same language |
| Language learned | Push for mastery on weakest course |
| Language mastered | Pick a new language |

## 10. Streaks & badges (deferred)

Logged for a future badge system. Existing data plus a future session/streak table will support badges without rework. Major celebrations ship first; badges layer on top.

---

# Open questions / decisions still needed

1. **Stats selection for course-mastered & language-mastered modals** — defer until admin preview is built; pick visually.
2. **Annual reviews past 5y** — silent forever, or surface as a yearly check-in toast?
3. **Share copy ownership** — should share text be admin-templated, or generated client-side from template metadata?
4. **Course/language recommendations** — manual curation in admin, or algorithmic (e.g., next by display order)?

---

# Implementation sequencing

1. Update this doc with agreed decisions ✅
2. **Build admin celebrations preview page** at `/admin/celebrations/preview` with all variants rendered against mock data, for visual review.
3. Iterate on copy/layout/stats with stakeholder review.
4. Build the underlying `display_type=modal` extension to notifications admin.
5. Wire actual triggers (per-word toast, lesson learned/mastered, free-tier celebration, course, language).
6. Add OG image generation + admin overrides.
7. Future: badges, streaks, shareable profile pages.

---

## File reference

### Completion data models
- `src/types/database.ts` — table schemas
- `src/lib/queries/words.ts:57` — `WordStatus`
- `src/lib/queries/lessons.ts:6,467` — `LessonStatus`, derivation
- `src/lib/queries/courses.ts:38,223` — `CourseWithProgress`, status derivation

### Word transitions
- `src/lib/mutations/study.ts:323` — `markWordsAsLearning()`
- `src/lib/mutations/test.ts:430` — `updateWordTestProgress()`
- `src/lib/notifications/achievements.ts` — first-time achievement toasts

### Lesson transitions & milestones
- `src/lib/mutations/study.ts:576` — `completeStudySession()`
- `src/lib/mutations/test.ts:123,470` — `completeTestSession()`, milestone advance
- `src/lib/utils/milestones.ts:34,47` — `MILESTONE_ORDER`, `getNextMilestone()`

### UI
- `src/components/study/LessonCompletedModal.tsx` — study completion modal
- `src/components/study/TestCompletedModal.tsx` — test completion modal
- `src/components/UpgradeModal.tsx` — locked lesson + pricing

### Pages
- `src/app/(dashboard)/lesson/[lessonId]/study/page.tsx` — study access gate
- `src/app/(dashboard)/lesson/[lessonId]/test/page.tsx` — test page + achievement pre-fetch
- `src/app/(dashboard)/course/[courseId]/page.tsx` — course overview
