# Mobile & Tablet Responsive Roadmap

Single source for the mobile/tablet responsive effort. It carries both halves of
the work, previously split across two files:

- **Part 1 — Batch roadmap** (*how/when*): the incremental, batch-per-commit plan.
- **Part 2 — Per-element prioritisation** (*what survives on a phone*): the
  Retain / Compress / Hide call for every element, page by page.

## Goal & scope
Make the 200WAD web app fully responsive across phone, tablet, and desktop. Prioritise the **study & testing flows** (short 5–15 min on-the-go sessions) first; progress, gamification, settings, and admin follow.

## Delivery model (incremental, test-as-you-go)
- **One small batch per commit.** Each batch below is scoped to be independently testable and revertable. I implement one batch, hand back for you to test, then start the next — never large-scale changes at once.
- **Feature branch.** All mobile work lands on `feature/mobile-responsive` as batch-sized commits; merge to `main` (whole or in stages) once reviewed.
- Run `npm run lint` after each batch; verify at phone/tablet/desktop widths before moving on.

## Working method: App UI catalog first, then component-by-component
Later batches (Group D onward — the daily-entry and tail pages) are driven through the
admin **App UI** catalog (`/admin/app-ui`, `src/components/admin/app-ui/AppUiCatalog.tsx`)
rather than editing pages blind. For each page we do the same three moves:

1. **Map the page.** List everything the page renders and file each piece into the App UI
   catalog's three tabs — **Primitives** (design-system atoms like `StatusPill`, `Popover`,
   `InlineSearch`), **Page scaffolding** (`PageShell`, `PageContainer`, `PageTopBar`), and
   **Feature blocks** (the page-specific composed sections, grouped under a per-page heading).
   Anything not yet in the catalog gets added with sample/mock data so it renders live.
2. **Decide per element.** Record the Retain / Compress / Hide call for every element in
   **Part 2** of this doc, page by page. Part 1 is the *how/when*; Part 2 is the *what*.
3. **Rework variants component-by-component.** Fix each component once, at its source, and
   verify it in the catalog's paired **desktop + mobile** previews (the mobile frame is a
   real same-origin iframe, so Tailwind `md:` media queries resolve to their true mobile
   branch — a narrowed `<div>` can't do that). Because the catalog renders the real
   component, the fix lands everywhere the component is used, not just on one page.

Guardrails: prefer **variants/tokens over per-instance overrides** (the CLAUDE.md locus test);
extend a component's `variant`/`size` or a design token rather than duplicating mobile classes
at call sites. Keep the catalog's "Used in" lists honest so a component fix's blast radius is
visible.

Pages catalogued so far: **Schedule**, **All Lessons** (feature blocks + their new
primitives `InlineSearch` / `Popover`), and **Tests hub** (`TestsList` + the new
`MobileStatsDropdown`). Remaining pages join the catalog as their batch begins.

## Confirmed UX decisions
- **Mobile nav:** add a fixed **bottom tab bar** (core destinations) + keep the existing `MobileMenu` drawer for the long tail.
- **Tablet:** treat as **small desktop** — show the sidebar from `md`/`768px` up (currently `lg`/`1024px`). Phones get bottom-bar + drawer.
- **Study/test:** add **swipe/tap gestures** (tap-to-reveal, swipe between words) alongside touch-friendly buttons.

## Current state (from exploration)
Good foundations already exist and should be reused, not rebuilt:
- `src/components/MobileMenu.tsx` — working drawer (280px, backdrop, Esc/route-close, scroll-lock), gated `lg:hidden`.
- `src/components/Sidebar.tsx` — `hidden … lg:flex w-[240px]`; collapse-to-72px rail via `SidebarCollapseContext`.
- `src/components/DashboardContent.tsx` — the shell: fixed `Header` (72px), sidebar, `main` with `lg:ml-[240px]`; study/test routes bypass the shell (own navbar/sidebar) at `DashboardContent.tsx:256-277`.
- Responsive max-width containers (`.max-w-content-*`) already use `mx-auto w-full`.
- Tailwind default breakpoints (sm640/md768/lg1024/xl1280); no custom config.

Main gaps:
- Typography never scales down (fixed px utilities in `globals.css`).
- Study/test built desktop-only: fixed `h-[400px]` cards, single-row `StudyActionBar`, `w-[340px]`/`w-[320px]` dropdown panels, keyboard-primary answer inputs.
- Data tables have hard `min-w-[800–960px]` (Dictionary, Tests, Lessons).
- Sidebar only at `lg`, so iPad portrait falls back to phone treatment.

---

# Part 1 — Batch roadmap (how/when)

Batches are ordered so each is independently testable and lands as its own commit. Group A (foundations/nav) comes first because it's low-risk and unblocks the rest; then study, then test, then the secondary areas.

## Group A — Foundations & navigation
**Batch 1 — Responsive typography.** Convert the display-tier utilities in `src/app/globals.css` (`.text-page-header`, `.text-xxxl-*`, `.text-xxl-*`, `.text-xl-*`) to `clamp()` so every existing consumer scales down automatically — no markup churn, no new utilities. *Test:* resize desktop→phone; headings shrink smoothly, nothing overflows, desktop sizes unchanged at wide widths.

**Batch 2 — Tablet = small desktop.** Flip sidebar visibility `lg:`→`md:` in `Sidebar.tsx` and the `lg:ml-[240px]` main-margin + `lg:hidden` gates in `DashboardContent.tsx`; re-key `Header.tsx` `lg:`→`md:` (hamburger `:121`, collapse toggle `:168`, logo width `:131`, `SearchBar` `lg:block`→`md:block`). *Test:* at 768px the sidebar + full header show; 72px collapsed rail still works; 1024px unchanged.

**Batch 3 — Bottom tab bar.** New `src/components/MobileBottomNav.tsx` (fixed bottom, `md:hidden`, `env(safe-area-inset-bottom)` padding). **4 destinations: Schedule · Lessons · Tests · Community.** Wire into `DashboardContent.tsx` shell branches; add bottom padding to `main`; hidden in study/test mode. *Test:* on phone widths the bar shows, tabs route correctly, active state correct, content not hidden behind it; hidden ≥768px and in study/test.

**Batch 4 — Phone top-bar pass (`Header.tsx`).** Left = hamburger + compact course switcher (flag + chevron). Right = **search icon** (collapse `SearchBar` to an icon → full-screen search sheet below `md`); **single headline stat = course progress %** with a tap/hover dropdown showing **all** stats (progress, words/day, learning time) — consolidate the three `md:flex` popovers (`Header.tsx:201-323`); **`DailyGoalRing`**; **`NotificationBell`**. Tighten right cluster `gap-4`→`gap-2 md:gap-4` (`:331`). Drop the Admin button on phones (`:351-357`) and the top-right avatar. Add `env(safe-area-inset-top)`. *Test:* at 375px nothing crowds/overflows; search sheet opens; stats dropdown shows all three; desktop/tablet header unchanged.

**Batch 5 — Mobile drawer account block.** In `MobileMenu.tsx`, add a **fixed-bottom account block**: avatar + name expanding to Profile / Settings / Subscription / Credits + **Help**. Desktop/tablet `ProfileDropdown` stays exactly as-is. *Test:* on phone the drawer shows the pinned account block; links work; desktop account menu untouched.

**Batch 6 — Viewport/chrome + hooks.** Confirm `viewport-fit=cover` + safe-area insets; replace `h-screen`→`100dvh` where mobile chrome clips (`DashboardContent.tsx:291,315`, study/test layouts). Add `src/hooks/useMediaQuery.ts` (`useIsMobile`) and a `useSwipe` hook (used from Group B). Audit tap targets ≥44px. *Test:* no content hidden under mobile browser bars; hooks unit-verified via a consuming component.

## Group B — Study flow (highest priority)
Files: `src/components/study/*`, `src/app/(dashboard)/lesson/[lessonId]/study/*`.
**Batch 7 — Study cards responsive.** Replace fixed `h-[400px]` with responsive heights (`h-56 sm:h-72 md:h-[400px]`) in `FlashcardCard.tsx`, `MemoryTriggerCard.tsx`; stack horizontal fact/info layouts single-column (`flex-col md:flex-row`) incl. `InformationCard.tsx`, `WordCard.tsx`. *Test:* card fits a phone viewport without excessive scroll; long words/triggers wrap.
**Batch 8 — Study answer input.** `AnswerInput.tsx`: stack feedback above input on mobile; add `inputMode`, `autoComplete/autoCapitalize/autoCorrect` off; keep field above the on-screen keyboard. *Test:* type an answer on a real phone keyboard; feedback readable; submit reachable.
**Batch 9 — StudyActionBar.** Collapse secondary controls (settings, music, image-mode, accented chars) into an overflow **bottom sheet**; keep prev/next + clue primary; convert `w-[340px]`/`w-[320px]` popovers to `max-w-[95vw]` sheets. *Test:* all controls reachable one-handed; panels don't overflow.
**Batch 10 — StudyNavbar.** Condense title/progress/timer for `≤sm`. *Test:* orientation info still legible at 375px.
**Batch 11 — Study sidebars → drawers.** `StudyWordListSidebar.tsx` / `StudySidebar.tsx` / `CourseSidebar` become drawers/sheets on mobile. *Test:* open/close, word list scrolls, related-word panel works.
**Batch 12 — Study gestures.** Tap-to-reveal translation, swipe left/right for prev/next via `useSwipe`; buttons remain. *Test:* swipe + tap on a real device; buttons still work.

## Group C — Test flow
Files: `TestAnswerInput.tsx`, `TestCompletedModal.tsx`, `StartTestModal.tsx`/`LessonStartTestModal.tsx`, `.../test/*`.
**Batch 13** — mirror Batches 7–9 (cards, answer input, action bar) for test mode. **Batch 14** — make `TestCompletedModal` + start-test modals responsive (full-height sheet on mobile; verify `WordGrid` columns). **Batch 15** — test-mode gestures + one-handed scoring/clue reachability. *Test each:* run a full test on a phone.

## Group D — Daily entry points
**Batch 16** — `SchedulerCard.tsx`, `LessonPreviewCard.tsx`, lesson grid sections → single-column stacking. ✅ **Batch 17** — Tests hub `/course/[courseId]/tests`: header stats → `MobileStatsDropdown`; `TestsList` (`min-w-[960px]` → `md:min-w-[960px]`) → slimmed mobile table (see Part 2 → Tests hub). **Batch 18** — lesson detail `/lesson/[lessonId]`.

## Group E — Progress & gamification (secondary)
**Batch 19** — `/course/[courseId]/progress` charts/stat grids. **Batch 20** — `/community` leaderboard table → stacked cards. **Batch 21** — `/streak`, `/trophies`, `/shop` grid reflow + heatmap scroll.

## Group F — Tail
**Batch 22** — `DictionaryList` (`min-w-[800px]`) / `LessonsList` → cards / affordant scroll. **Batch 23** — `/settings`, `/profile`, `/account/*`, `/referrals`, `/help/*`. **Batch 24** — verification pass on `(auth)/*` + marketing.

## Group G — Admin (lowest, optional)
**Batch 25** — desktop-primary; light "don't break / horizontal-scroll tables" pass or explicitly de-scope. Decide at the time.

---

# Part 2 — Per-element prioritisation (what survives on a phone)

Live examples of the shared building blocks referenced here live in the admin
**App UI** catalog (`/admin/app-ui`).

## How to read the element tables

Every on-screen element gets one of three treatments on phone widths (`< md` /
`< 768px`). Desktop and tablet (`≥ md`) are unchanged unless stated.

| Treatment | Meaning |
|---|---|
| **Retain** | Core to the task. Keep at full fidelity; only reflow/resize as needed. |
| **Compress / collapse** | Useful but space-competing. Shrink, move behind a tap (tooltip, sheet, overflow menu), or merge with a sibling. |
| **Hide** | Not worth its pixels on a phone. Remove from the mobile DOM (desktop keeps it). |

Guiding principle from the roadmap: mobile sessions are short, on-the-go study
bursts. The **primary next action** must be reachable and obvious; everything
that competes with it earns compression or removal.

---

## Schedule page (`/course/[courseId]/schedule`)

The daily entry point. The whole page exists to answer one question — *"what do
I do next?"* — and then offer a secondary *"or study something else"* grid.

Structure: `PageShell` → `PageTopBar` (greeting) → `SchedulerSection`
(hero + `SchedulerCard`) → `LessonGridSection` (filter tabs + `LessonPreviewCard`
grid).

### PageTopBar / greeting row

| Element | Treatment | Mobile behaviour & rationale |
|---|---|---|
| Time-of-day greeting ("Good morning, Ryan") | **Compress** | Keep one line; drop the translation tooltip affordance on phones (hover doesn't exist). Consider shrinking to `text-large-*`. It's warmth, not task — shouldn't push the card below the fold. |
| Greeting translation tooltip | **Hide** | Hover-only; no touch equivalent worth the space. |
| Width-toggle button (md/lg) | **Hide** | Already desktop-only (`PageTopBar` renders it for pointer widths). Phone is always full-width. |

### SchedulerSection (hero)

| Element | Treatment | Mobile behaviour & rationale |
|---|---|---|
| Section heading ("It's time for your first lesson" / "Time for a test") | **Retain** | Sets context for the one thing that matters. Keep, but allow the display type to `clamp()` down (Batch 1). |
| Test folder tabs (milestone dots, when several tests are due) | **Compress** | Horizontally scroll or collapse to a compact "N tests due" affordance; the tab strip competes with the card for vertical space above the fold. |
| **SchedulerCard** | **Retain** | This is the page. See breakdown below. |

### SchedulerCard (the hero card)

Today: `min-h-[450px]`, image beside a tall info column on desktop
(`md:flex-row`), stacked on mobile (`flex-col`).

| Element | Treatment | Mobile behaviour & rationale |
|---|---|---|
| Lesson image | **Compress** | Already `h-[220px]` stacked on top. Consider a shorter height on small phones so the title + primary button stay near the fold. Keep it — it aids recognition — but it's the first thing to shrink. |
| Milestone kicker badge (pulse dot + "New lesson" / "1-week test") | **Retain** | Tiny, high-signal, tells the user what kind of action this is. |
| Word-count pill (`WordsPreviewTooltip`) | **Compress** | Keep the count; the hover word-list preview is desktop-only. On tap it could open the same list as a small sheet, or defer to the lesson preview page. |
| StatusPill | **Retain** | Small, communicates progress state at a glance. |
| "Lesson #N" | **Retain** | One short line; cheap and orienting. |
| Lesson title | **Retain** | Primary label. Currently `truncate` — verify it doesn't clip real titles on narrow screens; prefer 2-line clamp over hard truncation on mobile. |
| Word pills (`ScrollablePills`, 3 rows) | **Compress** | Drop to 2 rows on phone to reclaim height; the row is already horizontally scrollable with edge fades, so no words are lost. |
| Primary action (Start test / Study lesson + XP badge) | **Retain** | The single most important control. Full-width, thumb-height, keep the pulse. On very small screens this is the element every other one yields space to. |
| Secondary ghost icons (study-instead / take-test, preview) | **Compress** | Keep the most useful one inline; move the rest into an overflow "…" or drop the hover tooltips (touch has no hover). These are shortcuts, not the main path. |

### LessonGridSection ("Or study something else")

| Element | Treatment | Mobile behaviour & rationale |
|---|---|---|
| Section heading ("Or study a lesson" / "Or study something else") | **Retain** | Cheap, sets up the secondary grid. |
| Filter tabs (New / Recent / Needs review) | **Compress** | Only shown at ≥2 lessons. On phone, collapse the tab strip to a compact segmented control or a select so it doesn't wrap; it's a refinement, not the main path. |
| Lesson grid | **Retain (reflow)** | Already `grid-cols-1 md:grid-cols-2` — single column on phone is correct. Keep the 6-item cap. |
| **LessonPreviewCard** | **Retain** | See breakdown below. |
| EmptyState fallbacks | **Retain** | Important for the first-time/all-caught-up states; keep. |

### LessonPreviewCard (grid item)

Structurally a smaller SchedulerCard; apply the same calls.

| Element | Treatment | Mobile behaviour & rationale |
|---|---|---|
| Image | **Compress** | `h-[220px]` is tall for a stacked card list; consider reducing on phone so more than one card is scannable per screen. |
| "Lesson #N" + word-count pill + StatusPill row | **Retain / Compress** | Keep number + status; the word-count hover preview is desktop-only (same as the hero). |
| Title | **Retain** | Prefer 2-line clamp over `truncate` on mobile. |
| Word pills (`ScrollablePills`, 2 rows) | **Compress** | 1 row on phone is likely enough for a preview; still horizontally scrollable. |
| Primary "Study lesson" + XP badge | **Retain** | The card's main action. Full-width. |
| Secondary ghost icons (take-test, preview) | **Compress** | Same as hero — one inline, rest into overflow; drop hover tooltips. |

### Net effect on a phone

Above the fold: greeting (compact) → hero heading → SchedulerCard with a
shorter image, tighter word pills, and a full-width primary button. Everything
hover-dependent (tooltips, width toggle, word-preview popovers) is dropped or
moved behind a tap. The secondary grid stacks one card per row below.

---

## All Lessons page (`/course/[courseId]`)

The full catalogue for a course. Reached from the Schedule page's "All lessons
(N)" button. Desktop shows a wide sortable table; on a phone that table was the
whole problem (it forced 800px+ of horizontal scroll).

Status: **implemented** (`LessonsList.tsx` + `LessonRow.tsx`). The table is kept
(not swapped for cards) but restructured so on a phone it reads as a **list of
rows**: the header is hidden, the numeric columns collapse into a compact
sub-row beneath each lesson title, and only the lesson cell + a narrow action
cell remain visible.

Structure: `PageShell` → header (`h1` "All Lessons" + `CourseStatsBar`) →
`SpecialLessonsRow` (auto-lessons) → `LessonsList` (filter tabs + search/stats
toggle + lessons table).

### Header

| Element | Treatment | Mobile behaviour & rationale |
|---|---|---|
| "All Lessons" heading | **Retain** | Page title; cheap and orienting. |
| CourseStatsBar (4 popover stats) | **Compress** | The four stats wrap raggedly on a phone. Mobile shows only the **first** stat (Words learned) inline with a down-caret; tapping opens a dropdown listing the other three vertically. Desktop keeps the full four-stat row with its per-stat popovers. The collapse mechanism now lives in the shared `MobileStatsDropdown` (extracted for the Tests hub header, which needed the same treatment). |

### SpecialLessonsRow (auto-lessons)

| Element | Treatment | Mobile behaviour & rationale |
|---|---|---|
| Horizontal card row (Lost Mastery, Worst, Notes, …) | **Retain** | Already a horizontal snap-scroll row with edge fades; works as-is on phone. |
| `SpecialLessonCard` word count | **Compress** | On mobile the count moves **beneath** the lesson name (v-stack) instead of competing on the right; the desktop hover-swap ("View" / "Start test") is dropped (no touch hover). Card width is `w-fit`. |

### LessonsList controls

| Element | Treatment | Mobile behaviour & rationale |
|---|---|---|
| Filter tabs (All / Not started / Learning / …) | **Retain (reflow)** | Horizontally scrollable via the shared `Tabs`/`ScrollFadeRow` (wrapped in `min-w-0 flex-1` so it shrinks and scrolls); scrollbar hidden with gradient edge fades on overflow. |
| Search (`InlineSearch`) | **Retain** | Pinned to the right of the tab row (`flex-shrink-0`); filtering by title stays useful on a phone. |
| Stats toggle (milestone-scores grid) | **Hide** | Swaps in a 9-column Initial/Day/Week/…/Overall grid (~900px) — a desktop-only power view. The toggle button is hidden below `md`, so phones only ever see the default list. |

### Lessons table → list of rows on mobile

The `<table>` is kept, but its min-width is `md`-only so it fits the viewport,
the **header row is hidden** below `md` (the table reads as a list), and the
secondary columns collapse into a compact meta sub-row beneath the title.

**Below `md` there is exactly one visible cell** — the Lesson cell (emoji + "N."
+ title + meta sub-row + the chevron). Everything else, the action cell included,
is `display:none`. Same model as the Tests hub, and for the same reasons: see
[the two consequences there](#tests-table--list-of-rows-on-mobile) (don't leave
the action cell visible-but-narrow; corner rounding must follow the visible
cells).

| Element | Treatment | Mobile behaviour & rationale |
|---|---|---|
| Table header row (`thead`) | **Hide** | `hidden md:table-header-group` for the default view — on a phone the table is a list of rows, so the column labels aren't needed. (QA/stats views keep their header.) |
| `#` (lesson number) | **Hide → merge** | The dedicated column is `hidden md:table-cell`; on mobile the number is **prepended to the title** as `"N. "`. This reclaims the widest wasted column. |
| Lesson (emoji + title) | **Retain** | The flexible column; title truncates within the row. It's the only visible cell below `md`, so it takes all four of the table's corners (`rounded-t-xl` / `rounded-b-xl`, reset at `md` where the number and action cells reclaim them). The emoji tile drops to `h-8 w-8 text-base` below `md` — at 40px it ate width the title needed. |
| Status pill | **Compress → sub-row** | Moves beneath the title as a compact `StatusPill size="sm"` (11px, tighter padding, `h-2.5` star/check). Sits in the **trailing** slot of the meta sub-row. Desktop keeps the dedicated Status column. |
| XP available (`word_count × 3`) | **Compress → sub-row** | Shown in the meta sub-row as a compact `XpBadge size="xs" variant="available"`, in the **leading** slot next to the word count. Desktop keeps the dedicated column. |
| # Words | **Compress → sub-row** | Rendered as plain "N words" text (11px muted) in the meta sub-row's leading slot. The desktop `WordsPreviewTooltip` column is `hidden md:table-cell`. |
| # Learned / # Mastered | **Hide** | Two numeric columns dropped below `md` (`hidden md:table-cell`). |
| Study / Test shortcut buttons | **Hide** | The whole action cell is `hidden md:table-cell`, so the `BookOpen`/`ClipboardPen` ghost buttons go with it; the row tap opens the lesson and study/test are reachable from the lesson detail. Only the **chevron** (or the **lock**) remains as the open affordance, rendered inside the lesson cell's flex line rather than in a column of its own. |
| Column-header sorting | **Compress** | Headers are hidden on mobile, so sorting is a desktop affordance; the default sort applies on the phone list. |
| QA "Developer notes" rows (admin) | **Compress** | `# Words` column hidden below `md`; the Study action is retained. |

The mobile meta sub-row (beneath the title): **leading** = word count + XP badge;
**trailing** = status pill; laid out `flex items-center justify-between`.

### Net effect on a phone

Header collapses to the title + a single tappable stat. The lessons list becomes
a clean two-part row — lesson (with number prepended, and a word-count / XP /
status meta line) and a chevron — with no header and no sideways scroll, and
each row taps straight through to the lesson.

---

## Tests hub (`/course/[courseId]/tests`)

Status: **implemented (Batch 17)** — `TestsList.tsx` + `TestRow.tsx`. The Tests
table is a *separate* implementation from All Lessons (no shared code), so the
All Lessons mobile work did **not** carry over; the same treatment was applied
here. It has two tabs that reshape the table and two extra columns (Test Name,
Test #), so it was a touch more involved.

Structure: `PageShell` → header ("Tests" `h1` + 3 stat cards) → `SpecialLessonsRow`
(auto-lessons) → `TestsList` (tabs: **Tests Due** / **Previous Tests** + table).

### Header

| Element | Treatment | Mobile behaviour & rationale |
|---|---|---|
| "Tests" heading | **Retain** | Page title. |
| Stat cards — Total test time, Avg score/word, Total XP | **Compress** | Re-keyed `lg:flex-row` → `md:flex-row` so tablet gets the row too. On phone they use the **CourseStatsBar pattern** via the shared `MobileStatsDropdown`: **Total XP** shows inline with a down-caret (it's the page's headline ledger stat), and Total Test Time + Avg score/word open in a dropdown on tap. Desktop keeps the three-stat row and its XP tooltip. |

### SpecialLessonsRow (auto-lessons)

| Element | Treatment | Mobile behaviour & rationale |
|---|---|---|
| Horizontal auto-lesson card row | **Retain** | Same shared component as All Lessons; already phone-friendly (snap-scroll + edge fades). |

### TestsList controls

| Element | Treatment | Mobile behaviour & rationale |
|---|---|---|
| Filter tabs (Tests Due / Previous Tests, with counts) | **Retain (reflow)** | Shared `Tabs`/`ScrollFadeRow`; only two tabs so overflow is unlikely, but keep the scrollable treatment for consistency. |

### Tests table → list of rows on mobile

Mirror the All Lessons approach: `min-w-[960px]` → `md:min-w-[960px]`; hide the
header below `md`; prepend the lesson number to the title; collapse the rest into
a meta sub-row. The two tabs feed the sub-row different data.

**Below `md` there is exactly one visible cell** — the Lesson cell (emoji + "N."
+ title + meta sub-row + the Start button). Everything else, the action cell
included, is `display:none`. That is the point: a phone row is a list item, not a
grid, so nothing should be reserving column width. Two consequences:

- **Don't leave the action cell visible-but-narrow.** The table is `table-fixed`
  and the header is hidden, so the first body row defines the columns; a visible
  action cell forces you to hand-pick a width that then fights the title for
  space. Hiding it and putting the button in the row's flex line removes the
  problem entirely — the title takes `min-w-0 flex-1` and truncates, the button
  is `flex-shrink-0`.
- **Corner rounding must follow the visible cells.** `:nth-child`/`:last-child`
  are structural and ignore `display:none`, so a `tbody`-level rule (the approach
  the Lessons hub still uses) drops the radius on a hidden cell and the visible row
  renders square. Tests instead rounds **the cells themselves**, driven by the
  `isFirst`/`isLast` props already passed to `TestRow`: on mobile the lesson cell
  takes all four corners (`rounded-t-xl` / `rounded-b-xl`), and the `md:` resets
  hand the left pair back to the number cell and the right pair to the action cell.

| Element | Treatment | Mobile behaviour & rationale |
|---|---|---|
| Table header row (`thead`) | **Hide** | `hidden md:table-header-group` — list of rows on phone. |
| `#` (lesson number) | **Hide → merge** | `hidden md:table-cell`; prepend `"N. "` to the title. |
| Lesson (emoji + title) | **Retain** | Flexible column; title is a `Link` to the lesson. The emoji tile shrinks to `h-8 w-8 text-base` below `md` (`md:h-10 md:w-10 md:text-xl`) — at 40px it ate width the title and Start button both needed. |
| Test Name (milestone) | **Compress → sub-row** | *Decided:* an 11px muted label in the **leading** slot on **both** tabs, and always first — it's what makes the two tabs open the same way. |
| Test # (attempt number) | **Hide** | Low value on a phone; dropped below `md`. |
| Status (Tests Due) | **Hide** | *Decided:* no status pill on the Due tab. The row is an invitation to act, not a progress readout — the button already says what's on offer. |
| Score (Previous Tests) | **Retain → sub-row** | `ProgressRing size={18}` + % in the **leading** slot, after the milestone. The one number that matters on a past test. |
| XP earned (Previous Tests) | **Retain → sub-row** | Compact `XpBadge size="xs" variant="earned"` in the **trailing** slot, mirroring where Tests Due puts its XP-available chip. Desktop keeps its dedicated "XP earned" column. |
| XP available | **Move → button (desktop) / sub-row (Due only)** | *Decided:* never a column — the desktop "XP" column on Tests Due is removed entirely, and from `md` the value lives inside the CTA button as `XpBadge variant="on-primary-subtle" size="xs"`, reading as the reward for the action. Below `md` the button has to stay narrow enough to share the row with the title, so the badge is `hidden md:inline-flex` and the value moves to the sub-row's **trailing** slot as `variant="available"` — on **Tests Due only**. Previous Tests drops it: a past test has no XP on offer to advertise, and the earned figure is the one that matters. |
| # Words | **Compress → sub-row (Due only)** | *Decided:* plain "N words" text after the milestone on **Tests Due**, dot-separated in the same text run (`3-Month · 42 words`). Dropped on **Previous Tests**, where the score ring takes that slot — the sub-row can't hold both and stay on one line. |
| # Learned / # Mastered (or New Learned / New Mastered) | **Hide** | Numeric columns dropped below `md`. |
| Actions — **CTA button** + Eye preview | **Move into the row** | *Decided:* the action **cell** is `hidden md:table-cell` — below `md` the table is a list of rows, not a grid, so there is no action column to size. The button renders inside the lesson cell's flex row instead (`flex-shrink-0`, right-aligned after the title), and the cell is the only visible one on mobile. Label is **`Start`** on Tests Due and **`Re-test`** on Previous Tests. On mobile that label + chevron is the whole button; from `md` the XP badge joins them in a single centered `gap-1.5` run, using the fill-less `on-primary-subtle` variant so a third element doesn't crowd the control. The **Eye/preview** icon stays desktop-only. Button text is 13px below `md`. |
| Row tap | **Retain (as-is)** | *Decided:* keep current behaviour — emoji + title link to the lesson, the button opens the start-test modal. No full-row tap. |

The mobile meta sub-row (beneath the title), **milestone always first**, with a
trailing XP chip on both tabs:
- **Tests Due** — leading: `milestone · N words` (one text run, dot-separated —
  they're both plain labels, so a gap alone read as two unrelated chips).
  Trailing: XP available.
- **Previous Tests** — leading: milestone + score ring + %. Trailing: XP earned.

**CTA button width.** From `md` the button is `flex-1` inside the action cell, so
every row's button is the same width and they line up down the column instead of
each sizing to its own XP value (54 vs 126 is a visible raggedness). Its contents
are `justify-center` with a flat `gap-1.5`, so the extra width becomes even
padding either side rather than opening a gap inside the label / XP / chevron
run. The Eye stays `flex-shrink-0` beside it. Below `md` the button is
content-sized — expanding there would eat the title.

On Previous Tests the button's XP value is `max_points` — what a **re-test** of
that lesson is worth, which is what the `Re-test` label says out loud. So on
desktop the row reads "you scored +116, another run is worth 126", which is why
both chips can coexist without reading as a contradiction. On mobile only the
earned figure appears (the button's badge is desktop-only), so the ambiguity
can't arise in the first place.

### Milestone labels

Due tests carry raw `next_milestone` values (`initial`, `1-day`, `1-week`,
`1-month`, `1-quarter`, `1-year`). `getMilestoneShortLabel()` in
`src/lib/utils/milestones.ts` maps them to display labels, notably
**`1-quarter` → "3-Month"** — a quarter isn't a unit users think in, and it
matches the existing "3 Month Review" wording. Used by the mobile sub-row *and*
the desktop Test Name column, so both tabs read the same on every breakpoint.

### The width budget

The button and the meta sub-row share the row, so they trade off directly: the
button takes its natural width (`Start` + a 3-digit XP chip + chevron ≈ 124px)
and the title/sub-row column absorbs whatever is left — roughly 185px at 390px.
That is enough for milestone + word count (Due), or milestone + ring + % with the
XP chip trailing (Previous), but not for both word count *and* ring. That
constraint decided the table above; it isn't a style preference.

Nothing is hard-coded to achieve it — flex does the sizing. The catalog mocks
still lead with the widest case (longest milestone, 3-digit XP) so the tightest
row is the one on top.

### Net effect on a phone

The stats header collapses to Total XP + a caret; the tests list becomes a
single-cell row — lesson (with number prepended, plus a milestone / words / score
meta line) with a prominent "Start + XP" button on the right — no header and no
sideways scroll.

---

## Other pages

To be added as each page's mobile pass begins — lesson detail, study flow, test
flow, progress, community, settings. Same three-way Retain / Compress / Hide
framing.

---

## Reuse (do not reinvent)
- Drawer pattern: `MobileMenu.tsx`. Popover/sheet primitives: `src/components/ui/` (`modal-shell.tsx`, `popover.tsx`, `scroll-fade-row.tsx`). Header stat rows that must collapse on a phone: `mobile-stats-dropdown.tsx` (`MobileStatsDropdown`) — used by `CourseStatsBar` and the Tests hub header. Collapse context: `SidebarCollapseContext`. Container tokens: `.max-w-content-*`. Typography: existing `globals.css` utilities (extend via `clamp()`, never invent new ones). Colours: design-system tokens only.

## Verification
- `npm run dev`; test at 375 / 390 / 430 (phones), 768 (iPad portrait), 1024 (iPad landscape), 1280+ (desktop) via devtools + at least one real device.
- Per-phase, run the CLAUDE.md quality checklist (all states, long strings, keyboard/focus, RLS/guest, tokens-not-overrides) and `npm run lint`.
- Add a manual mobile usability checklist under `docs/usability-checklists/` mirroring `USABILITY_CHECKLIST.md`.
