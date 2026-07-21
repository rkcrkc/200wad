# Mobile & Tablet Responsive Roadmap

## Goal & scope
Make the 200WAD web app fully responsive across phone, tablet, and desktop. Prioritise the **study & testing flows** (short 5–15 min on-the-go sessions) first; progress, gamification, settings, and admin follow.

## Delivery model (incremental, test-as-you-go)
- **One small batch per commit.** Each batch below is scoped to be independently testable and revertable. I implement one batch, hand back for you to test, then start the next — never large-scale changes at once.
- **Feature branch.** Commit current WIP on `main`, then `git checkout -b feature/mobile-responsive`. All mobile work lands there as batch-sized commits; merge to `main` (whole or in stages) once reviewed.
- Run `npm run lint` after each batch; verify at phone/tablet/desktop widths before moving on.

## First steps (this session)
1. Commit the current uncommitted work on `main` (LessonPreviewCard, SchedulerCard, french-flashcard docs/scripts) so the branch starts clean. Inspect the diff first and split into sensible commits if unrelated.
2. Create `feature/mobile-responsive`.
3. Save this roadmap to `docs/MOBILE_RESPONSIVE_PLAN.md`.
4. Implement **Batch 1** (responsive typography) only, then stop for you to test.

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
**Batch 16** — `SchedulerCard.tsx`, `LessonPreviewCard.tsx`, lesson grid sections → single-column stacking. **Batch 17** — Tests hub `/course/[courseId]/tests`: tabs + stat cards stack; `TestsList` (`min-w-[960px]`) → mobile card layout. **Batch 18** — lesson detail `/lesson/[lessonId]`.

## Group E — Progress & gamification (secondary)
**Batch 19** — `/course/[courseId]/progress` charts/stat grids. **Batch 20** — `/community` leaderboard table → stacked cards. **Batch 21** — `/streak`, `/trophies`, `/shop` grid reflow + heatmap scroll.

## Group F — Tail
**Batch 22** — `DictionaryList` (`min-w-[800px]`) / `LessonsList` → cards / affordant scroll. **Batch 23** — `/settings`, `/profile`, `/account/*`, `/referrals`, `/help/*`. **Batch 24** — verification pass on `(auth)/*` + marketing.

## Group G — Admin (lowest, optional)
**Batch 25** — desktop-primary; light "don't break / horizontal-scroll tables" pass or explicitly de-scope. Decide at the time.

---

## Reuse (do not reinvent)
- Drawer pattern: `MobileMenu.tsx`. Popover/sheet primitives: `src/components/ui/` (`modal-shell.tsx`, `popover.tsx`, `scroll-fade-row.tsx`). Collapse context: `SidebarCollapseContext`. Container tokens: `.max-w-content-*`. Typography: existing `globals.css` utilities (extend via `clamp()`, never invent new ones). Colours: design-system tokens only.

## Verification
- `npm run dev`; test at 375 / 390 / 430 (phones), 768 (iPad portrait), 1024 (iPad landscape), 1280+ (desktop) via devtools + at least one real device.
- Per-phase, run the CLAUDE.md quality checklist (all states, long strings, keyboard/focus, RLS/guest, tokens-not-overrides) and `npm run lint`.
- Add a manual mobile usability checklist under `docs/usability-checklists/` mirroring `USABILITY_CHECKLIST.md`.
