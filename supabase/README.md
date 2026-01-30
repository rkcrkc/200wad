# Supabase Database Setup

This folder contains the SQL migrations for the 200WAD database.

## Quick Setup

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `complete_schema.sql`
4. Paste and run it

That's it! The schema includes everything:
- 13 tables
- RLS policies
- Indexes
- Triggers
- Sample Italian content for testing

## Individual Migration Files

If you prefer to run migrations separately:

1. `001_initial_schema.sql` - Core tables and triggers
2. `002_rls_policies.sql` - Row Level Security policies
3. `003_indexes.sql` - Performance indexes
4. `004_seed_data.sql` - Sample Italian content
5. `005_auth_trigger.sql` - Auto-create user profiles on signup

Run them in order.

## Tables Overview

### Content Tables (5)
- `languages` - Available languages (Italian, Spanish, etc.)
- `courses` - Courses within each language
- `lessons` - Lessons within each course
- `words` - Individual vocabulary words
- `example_sentences` - Example usage for words

### User Tables (2)
- `users` - User profiles (extends Supabase auth)
- `user_languages` - Languages a user is learning

### Progress Tables (5)
- `user_word_progress` - Per-word mastery tracking
- `user_lesson_progress` - Per-lesson completion tracking
- `study_sessions` - Study/test session records
- `user_test_scores` - Test results
- `test_questions` - Individual test answers

### System Tables (1)
- `notifications` - User notifications

## TypeScript Types

After running the schema, you can use the generated types at:
`src/types/database.ts`

To regenerate types from Supabase:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

## Deferred Features (Phase 2)

The following tables are planned but not yet created:
- Gamification: `trophies`, `badges`, `user_trophies`, `user_streaks`
- Leaderboards: `leaderboard_periods`, `leaderboard_entries`, `leaderboard_achievements`
- Payments: `subscriptions`, `entitlements`, `payment_methods`
- Growth: `referrals`
- Profile: `user_social_links`
