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
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

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
- Progress: `user_word_progress`, `user_lesson_progress`, `study_sessions`, `user_test_scores`, `test_questions`
- System: `notifications`

Types auto-generated in `src/types/database.ts` with convenience aliases (User, Course, Word, etc.)

**Progress Tracking:**
- Word mastery: 3 correct answers in a row = mastered
- Status progression: "not-started" → "studying" → "mastered"
- Session storage for pending updates, batch writes on session completion

## Design System

Colors: background `#faf8f3`, primary `#0b6cff`, success `#00c950`, warning `#ff9224`, destructive `#fb2c36`

Typography utilities: `.text-page-header` (40px), `.text-xxl-bold` (32px), `.text-xl-semibold` (24px), `.text-large-semibold` (20px), `.text-regular-semibold` (15px), `.text-small-semibold` (14px), `.text-xs-medium` (13px)

## Key Patterns

- Server Components default, mark client components with `"use client"`
- Client component files often suffixed `*Client.tsx`
- Path alias: `@/*` maps to `./src/*`
- `/200WAD` folder contains Figma exports - do not modify
