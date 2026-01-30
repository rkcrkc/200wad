# 200 Words a Day

A language learning application built with Next.js 16.1, Supabase, and Tailwind CSS.

## Tech Stack

- **Framework:** Next.js 16.1 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui (to be installed)
- **Backend:** Supabase (Postgres, Auth, Storage)
- **Hosting:** Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
/src
  /app              # Next.js App Router pages
  /components       # React components (to be created)
    /ui             # shadcn/ui components
    /features       # Feature-specific components
    /layout         # Layout components
  /lib              # Utilities and helpers
    /supabase       # Supabase client (to be created)
    /utils          # General utilities
  /types            # TypeScript type definitions
/200WAD             # Figma export (visual reference only)
```

## Design System

The 200WAD design system uses the following color palette:

- **Background:** `#faf8f3` (bone/cream)
- **Foreground:** `#141515` (near black)
- **Primary:** `#0b6cff` (blue)
- **Secondary:** `#f2ead9` (beige)
- **Success:** `#00c950` (green)
- **Warning:** `#ff9224` (orange)
- **Destructive:** `#fb2c36` (red)

Typography uses Inter font with custom utility classes:
- `.text-page-header` - 40px semibold
- `.text-xxl-bold` - 32px bold
- `.text-xl-semibold` - 24px semibold
- `.text-large-semibold` - 20px semibold
- `.text-regular-semibold` - 15px semibold
- `.text-small-semibold` - 14px semibold
- `.text-xs-medium` - 13px medium

## Development

The `/200WAD` folder contains the original Figma export and serves as the visual specification for the rebuild. Do not modify files in this folder.

## License

Private
