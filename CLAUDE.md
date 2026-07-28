# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run dev:turbo    # Start with Turbopack (faster)
npm run build        # Production build
npm run lint         # Run ESLint

# Import lessons from CSV
npx tsx scripts/import-lessons.ts --course-id <UUID> --file <path-to-csv>
```

Regenerate Supabase types:
```bash
# Writes ONLY the auto-generated schema. Do NOT target src/types/database.ts —
# that is a barrel file. Hand-written convenience aliases live in src/types/aliases.ts.
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database-generated.ts
```

## Migrations

`supabase_migrations.schema_migrations` (the ledger) is the only trustworthy record of what actually ran. Local filenames have drifted from it before — see the "Migration ledger drift" bug card.

- **Never re-paste a function body to change one thing.** Always start from the *latest* definition (`pg_get_functiondef`, or the ledger's `statements`), not from an older migration. Re-pasting an old body silently reverts every change made since. This is how `select_best_worst_words_for_course` lost three migrations in one hop (`20260519014048`).
- **Keep the filename and the applied version identical.** `apply_migration` (MCP/dashboard) stamps its *own* timestamp, which will not match a hand-picked filename. After applying, read the version back out of the ledger and name the committed file with it — or apply via `supabase db push` from the committed file so the version is the filename.
- **Before `supabase db push`, diff local versions against the ledger.** Any local version missing from the ledger *will* be executed against production. If it's already applied under a different version, use `supabase migration repair --status applied <version>` instead of letting it run.
- **Anything applied directly must still be committed.** Schema/function/trigger/policy changes that exist only in the ledger make `db reset` produce a DB that doesn't match production.

## Glossary

- **NL / new DB** — the current Supabase database backing this 200WAD app (as distinct from the legacy "old DB" / source CSVs under `/Users/ryancrocombe/Documents/200WAD/DB IMPORT/`). When the user says "NL" they mean this project's Supabase instance.

## Notion Bug Board

Bugs and small tasks for this project are tracked in the Notion **🐛 Bugs** database. Use the Notion MCP tools (`notion-fetch`, `notion-query-data-sources`, `notion-update-page`, `notion-create-pages`) to read and write it.

- **Database:** https://app.notion.com/p/30556628fa3b806ba294f6d0b3d2fdd5
- **Data source ID (use this for queries/updates):** `collection://30556628-fa3b-8061-9457-000b513631ba`

**Schema**
- `Name` (title) — the bug description.
- `Section` (select) — Admin, Study Mode, Test Mode, Dashboard, Upgrade Flow, Profile, Onboarding, Kevin Notes, Pictures, LESSONS, DICTIONARY, GOOD PICS FOR PROMOS, SCHEDULE, SCORING, TURBOBOOSTERS TESTING, TOASTS.
- `Severity` (select) — Low, Medium, High.
- `Status` (status) — Not started → In progress → In review → Done, plus **Push to v2** (deferred, treat as out of scope for now).

**Views**
- `view://30556628-fa3b-80bb-84a5-000c8085fa21` — **To do** (everything not Done and not Push to v2, grouped by Section).
- `view://31456628-fa3b-80e8-8b59-000c84c915f2` — **Done**.
- `view://35356628-fa3b-805e-b6b3-000ca5f28032` — **v2** (Push to v2).

**Working agreement**
- When asked to work on "the board", "bugs", or a bug by name, query the data source rather than guessing. Default to the **To do** filter (`Status` is not Done and not Push to v2); ignore **Push to v2** items unless explicitly asked.
- Match bugs to code by `Section` — it maps to app areas (e.g. Study Mode → study session flow, Upgrade Flow → subscriptions/paywall, Admin → `src/app/admin/`).
- **Never change a bug's `Status` (or any other property) without asking first.** Report what you fixed and propose the status change; the user makes it. Same for creating new bug pages.
- Bug fixes still follow the Feature Workflow below when non-trivial — spec first, ask about UX forks, run the quality checklist.

## Feature Workflow

Follow this for any non-trivial feature or change. The goal is to get UX/usability decisions right *before* coding, so fewer manual revision rounds are needed. Do not skip straight to code.

### 1. Write a spec first, and get sign-off before coding
Produce a short spec (half a page is fine) and wait for approval. For larger features, save it under `docs/` as `<FEATURE>_PLAN.md` (see existing examples like `docs/V1B_LEADERBOARD_PLAN.md`); for small ones, post it inline. Required sections:
- **User goal & entry points** — what the user is trying to do, where this lives, how they reach it.
- **States** — design each explicitly: empty / first-time, loading, error, success, and "too much data" (long strings, many rows). A feature is not specced until every state is described.
- **Interactions & copy** — concrete button labels, confirmations, and what happens on click / success / failure.
- **Responsive** — mobile behaviour, not just desktop.
- **Reuse** — which existing components, variants, tokens, queries/mutations, and patterns this builds on (see §3).
- **Data & permissions** — Supabase tables/RPCs touched, RLS implications, guest-mode behaviour.

### 2. Surface UX forks as questions — don't guess
When a decision has more than one reasonable answer (placement, copy, confirm-or-not, what counts as "done", default values, sort order), use the AskUserQuestion tool to ask 2–4 crisp questions *during planning* rather than picking and hoping. Cheap to answer, expensive to redo. Never silently make a judgement call the user would want a say in.

### 3. Design-system-first (enforce reuse)
Before writing new markup or styles, audit what already exists and reuse it:
- Use the documented **colors** and **typography utilities** (see Design System below) — never invent new utilities or hardcode off-palette values.
- Reuse existing components in `src/components/ui/` and feature folders; follow the **DRY** and **variants-over-overrides (locus test)** rules in Key Patterns.
- Match existing patterns for queries (`src/lib/queries/`), mutations (`src/lib/mutations/`), and validation (`src/lib/validations/`).
- If a design exists in Figma, build against it rather than approximating.

### 4. Run the quality checklist before handing back
Before reporting a feature done, verify every item:
- [ ] All states implemented: empty/first-time, loading, error, success, "too much data".
- [ ] Long strings and large datasets don't break layout (truncation/wrapping/scroll handled).
- [ ] Mobile/responsive layout verified, not just desktop.
- [ ] Keyboard and focus behaviour work (tab order, focus rings, Esc/Enter on dialogs).
- [ ] Optimistic vs real data: UI reflects pending/failed writes correctly.
- [ ] Supabase: RLS/permissions correct; guest mode handled; admin-only paths gated.
- [ ] Reuses existing components/tokens; no invented typography utilities or off-palette colors.
- [ ] `npm run lint` passes; no unused/dead code left behind.

Human-facing **usability testing checklists** for the user to run manually live in `docs/usability-checklists/` (start with `USABILITY_CHECKLIST.md`).

## Architecture

**Stack:** Next.js 16.1 (App Router) + TypeScript + Supabase + Tailwind CSS 4 + shadcn/ui

**Data Flow Pattern:**
- `src/lib/queries/` - Server-side data fetching functions
- `src/lib/mutations/` - Server Actions for database writes
- `src/lib/validations/` - Zod schemas for input validation
- `src/context/` - UserContext (auth state), CourseContext (navigation)

**Supabase Clients:**
- `createClient()` from `@/lib/supabase/client` - Browser-side (uses anon key)
- `createClient()` from `@/lib/supabase/server` - Server-side (uses anon key with RLS)
- Admin operations use service role key (bypasses RLS)

**Auth & Middleware:**
- `src/lib/supabase/middleware.ts` handles auth redirects, admin route protection, session refresh
- Admin routes require `is_admin` in user_metadata
- Guest mode supported with local storage fallback

**Database Schema (14 tables):**
- Content: `languages`, `courses`, `lessons`, `words`, `lesson_words` (junction), `example_sentences`
- User: `users`, `user_languages`
- Progress: `user_word_progress`, `user_lesson_progress`, `study_sessions`, `test_sessions`, `test_questions`
- System: `notifications`

Types auto-generated in `src/types/database.ts` with convenience aliases (User, Course, Word, etc.)

**Progress Tracking (Word Status):**
- `not-started` → word has no progress record
- `learning` → word has been studied (seen in a study session)
- `learned` → word answered with full marks in a test (3/3 points: no mistakes, no clues)
- `mastered` → 3 full-mark tests in a row (`correct_streak >= 3`)
- "Correct" for streak/status purposes = `mistakeCount === 0 && clueLevel === 0` on a single `test_questions` row. Each row is one streak attempt — Test Twice contributes 2 attempts per word (one per `attempt_number`). Any non-perfect row resets the streak to 0.
- Floors: learned/mastered never drops below `learned`; learning never drops below `learning`
- `times_tested` counts distinct tests, not per-direction questions
- Session storage for pending updates, batch writes on session completion

## Design System

Colors: background `#faf8f3`, primary `#0b6cff`, success `#00c950`, warning `#ff9224`, destructive `#fb2c36`

Typography utilities (defined in `src/app/globals.css` — these are the ONLY ones; do not invent new ones like `.text-xxl-medium`). Display tier is sized `xl (24) < xxl (28) < xxxl (32) < page-header (40)`; the Bricolage Grotesque display face is used for `.text-page-header`, `.text-xxxl-semibold`, and `.text-xxl-semibold`:
`.text-page-header` (40px/700, Bricolage), `.text-xxxl-semibold` (32px/600, Bricolage), `.text-xxl-semibold` (28px/600, Bricolage), `.text-xl-medium` (24px/500), `.text-xl-semibold` (24px/600), `.text-large-medium` (20px/500), `.text-large-semibold` (20px/600), `.text-medium-medium` (18px/500), `.text-medium-semibold` (18px/600), `.text-regular-medium` (15px/500), `.text-regular-semibold` (15px/600), `.text-small-regular` (14px/400), `.text-small-medium` (14px/500), `.text-small-semibold` (14px/600), `.text-xs-medium` (13px/500)

## Key Patterns

- **DRY:** Extract repeated inline patterns into reusable components. If the same styling/markup appears in 3+ places, create a shared component in `src/components/ui/` instead.
- **Variants & tokens over per-instance overrides (the locus test):** Before adding a `className` override at a call site, ask whether the style describes *the component itself* or *its placement within a specific parent*.
  - **Describes the component** (a fill colour, radius, padding, typography — anything expressing a reusable visual *state*): encode it at the source. Add/extend a `variant` (or `size`) on the component, or use a design token/CSS variable. Don't duplicate it as one-off overrides — they drift out of sync and hide the behaviour from other consumers. (Example: the borderless `XpBadge` dropping its horizontal padding belongs on the `default` variant, not on each call site.)
  - **Describes placement/composition** (margins for positioning, flex/grid alignment, column spans — how this instance sits among *its* siblings): a local utility `className` is correct and usually better than a named abstraction. This is contextual to one layout, not reusable, so wrapping it in a class or component just adds indirection (and is the premature-abstraction trap — see the over-engineering notes below).
  - When a placement pattern genuinely recurs (rule of three), *then* extract it — by which point its real shape is known rather than guessed.
- Server Components default, mark client components with `"use client"`
- Client component files often suffixed `*Client.tsx`
- Path alias: `@/*` maps to `./src/*`
- `/200WAD` folder contains Figma exports - do not modify
