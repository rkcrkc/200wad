# Mobile pass — Study & Test mode

Making the study (`/lesson/[id]/study`) and test (`/lesson/[id]/test`) flows usable
on phones. Both flows share the same shell (`StudyNavbar`, `StudyActionBar`,
`StudyWordListSidebar`, `StudySidebar`, two-column content) so the work is done once
in the shared components and both `StudyModeClient` / `TestModeClient` layouts.

Mobile = below `md` (767px), consistent with the rest of the app (`useIsMobile`,
`max-md:` / `md:`).

## User goal & entry points

A learner studies a lesson or sits a test on their phone: read the word + memory
image, type an answer, get feedback, move through the words, and see results. Entry
is unchanged (Lessons / Tests / schedule → same routes). No desktop behaviour changes.

## Decisions (from review)

1. **Word list** → a **hamburger button at the start of the bottom action bar**
   (before the word info). Tapping it opens the full word list as a slide-over drawer
   with a scrim; tapping a word jumps and closes. The 240px fixed sidebar stays as-is
   on desktop.
2. **Study right column** (notes / examples / related / tips) → stacks **below** the
   image on mobile, each section a **collapsed accordion** (tap to expand). Expanded,
   side-by-side, unchanged on desktop.
3. **Action bar** → **essentials inline + overflow bottom-sheet**. Inline on mobile:
   hamburger · word info + score · replay · prev/next · (clue in test). Overflow (⋯)
   sheet: first/last, image-mode, music, settings, edit, **accents** (moved to overflow
   — the mobile keyboard handles accents natively).
4. **Top bar** → keep the existing items (badge, lesson title, timer, exit, test score),
   letting the row shrink/wrap; **replace the progress dots with a thin progress bar**
   pinned directly under the navbar, full width.

## Layout changes (both clients)

Desktop today: `flex h-screen` → fixed 240px sidebar + `ml-[240px]` column with a fixed
72px navbar, scroll area (`pt-[90px] pb-[160px]`), and a fixed bottom bar `left-[240px]`.

Mobile:
- Drop the left offset: `ml-[240px]` → `md:ml-[240px]`; the word-list sidebar is
  `hidden` (drawer only) below md.
- Fixed navbar / bottom bar lose the `left-[240px]` inset below md (`left-0 md:left-[240px]`).
- Add the progress-bar strip under the navbar (accounts for a little extra top padding).
- Two-column content `flex … gap-4` → `flex-col md:flex-row`; the `w-[700px] shrink-0`
  image column → `w-full md:w-[700px]`.
- Scroll area bottom padding grows a touch on mobile if the action bar is taller.

## Component changes

- **`StudyNavbar`** — extract the dots into a separate full-width `<StudyProgressBar>`
  (or a `md:hidden` bar) rendered by the clients just below the navbar; navbar keeps the
  count text but hides the inline dots on mobile. Items allowed to wrap/truncate at
  narrow widths.
- **`StudyActionBar`** — add `onOpenWordList?` (hamburger, mobile-only). Behind
  `useIsMobile`: keep essentials inline, render an **overflow `⋯` bottom sheet** holding
  the toggles now hidden from the row (first/last, accents, image-mode, music, settings,
  edit). Reuse the existing dropdown bodies (settings/music/accents) inside the sheet.
- **`StudyWordListSidebar`** — add `variant`/`isOpen`/`onClose`. Below md render as a
  left slide-over (`fixed inset-y-0 left-0 w-[85%] max-w-[320px]` + scrim), closed by
  default; desktop unchanged. Jumping to a word calls `onClose`.
- **`StudySidebar`** — on mobile wrap each section (system/user notes, examples, related,
  tips) in a collapsible header (chevron), collapsed by default; desktop stays expanded.
- **`StudyModeClient` / `TestModeClient`** — hold `isWordListOpen` state, pass
  `onOpenWordList`/drawer props, render the progress bar + drawer, apply the responsive
  layout classes above.
- **Answer input** (`AnswerInput` / `TestAnswerInput`) — verify full-width and that the
  fixed bottom bar + on-screen keyboard don't overlap the field (scroll-into-view on
  focus if needed). Mostly padding/width checks.

## States to cover

- Loading / skeleton (existing skeletons still show below md).
- Empty-ish: information/fact pages (no answer input) — hamburger + progress still work.
- Long data: long lesson titles truncate in navbar; long word/answer strings truncate in
  the action bar; many words → drawer + progress bar scale.
- Test specifics: clue button stays inline; picture-only hides word until submit;
  test-twice round labels in the drawer; running score in navbar.
- Results: `LessonCompletedModal` / `TestCompletedModal` and the start-test modal — check
  they’re usable at 390px (likely a follow-up sub-pass; flagged, not assumed done).

## Reuse / design system

`useIsMobile`, `useScrollFade`, `.scrollbar-hide`, existing dropdown bodies, StatusPill
`size="sm"`, typography + colour tokens. No new colours/utilities. Overflow sheet + drawer
follow the app’s panel/scrim patterns.

## Data & permissions

Pure presentational/responsive work — no queries, mutations, RLS, or guest-mode changes.
Admin-only edit toggle stays admin-gated (just relocated into the overflow sheet).

## App UI catalog

Reflect the shared-component changes in `/admin/app-ui` (StudyNavbar + progress bar,
StudyActionBar compact/overflow, word-list drawer, StudySidebar accordions) with mobile
`MobileFrame` previews, matching the earlier dictionary/word-detail entries.

## Suggested build order

1. Layout scaffolding in both clients (offsets, stacking, progress bar) — get the page
   not-broken on mobile.
2. Action bar: hamburger + essentials/overflow sheet.
3. Word-list drawer.
4. StudySidebar accordions.
5. Answer-input/keyboard polish.
6. Results modals pass (may split out).
7. App UI catalog entries + `npm run lint` / quality checklist.
