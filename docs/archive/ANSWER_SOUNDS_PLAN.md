# Answer Feedback Sounds — Plan

Short SFX when a learner submits a test answer: **correct**, **half-correct**, **incorrect**.
Sounds are **CMS-editable** by admins (upload replacements) and can be toggled on/off per-user.

## User goal & entry points
- **Learner (test mode):** on submit, hears a sound matching the result grade, then the existing
  foreign-word pronunciation. Fires at `TestModeClient.tsx` `handleSubmit` (~line 864).
- **Admin (CMS):** uploads/replaces each of the three sound files and toggles each on/off, at a new
  `/admin/answer-sounds` page (sibling to `/admin/music`).

## Grade → sound mapping
`result.grade` from `scoring.ts` is already `"correct" | "half-correct" | "incorrect"`. One file each.

## Playback behaviour (learner)
- **Sequence:** `await playAudio(sfxUrl, "sfx")` → then existing `playAudio(foreign)`. Reuses the
  single `useAudio` channel, so feedback plays first, pronunciation follows (no overlap).
- SFX loudness follows the existing **word-audio volume**. On error, `useAudio` resolves the promise,
  so the chain still reaches the pronunciation (no hang).
- Gated by a per-user **"Answer sounds"** toggle (localStorage, default ON) AND the admin `enabled`
  flag for that sound. If either is off, skip the SFX and play pronunciation as today.

## Data model (CMS)
New table `answer_feedback_sounds` (mirrors the `notification_templates` admin pattern):

| column | type | notes |
|---|---|---|
| `grade` | text PK | `'correct' \| 'half-correct' \| 'incorrect'` (check constraint) |
| `audio_url` | text | public URL; seeded to bundled defaults |
| `enabled` | boolean | default true; admin global on/off per sound |
| `updated_at` | timestamptz | default now() |

- **RLS:** public read (anon + authed) so guests get sounds; writes admin-only (service role via API route).
- **Seed:** 3 rows pointing at bundled defaults in `public/sounds/{correct,half-correct,incorrect}.mp3`.
- Regenerate `src/types/database-generated.ts` after migration.

## Default assets
- Ship 3 royalty-free, subtle/UI-like SFX in `public/sounds/`. Admin uploads override them.
- Uploads go to the existing **`audio`** Supabase Storage bucket under
  `answer-feedback/{grade}-{timestamp}.mp3`, via an admin-verified API route mirroring
  `/api/admin/upload-music`.

## Slices
1. **DB:** migration for `answer_feedback_sounds` (+ RLS + seed); regen types.
2. **Assets:** add 3 default SFX to `public/sounds/`.
3. **Query:** `getAnswerFeedbackSounds()` → client-safe `Record<grade, {audio_url, enabled}>`
   (mirrors `getToastTemplates`).
4. **Playback:** extend `useAudio` — add `"sfx"` to `AudioType` and localStorage-backed
   `soundEffectsEnabled` / `setSoundEffectsEnabled` (key `sound-effects-enabled`). Wire the
   grade→SFX→pronunciation chain into `handleSubmit`. Pass sound URLs from `test/page.tsx` → client
   (same pattern as `toastTemplates`).
5. **User toggle:** "Answer sounds" switch in the **Settings dropdown** of `StudyActionBar.tsx`
   (test mode only, via optional props). Helper copy: *"Play a sound for correct, half, and wrong answers."*
6. **Admin UI:** `/admin/answer-sounds` page + sidebar entry. Per-grade row: label, play/preview,
   `Editable*`-style upload, enabled toggle. Upload mutation/API route + `updateAnswerFeedbackSound`.

## States
- Default (toggle ON, sound enabled): SFX → pronunciation.
- User toggle OFF **or** admin `enabled=false`: no SFX; pronunciation unchanged.
- Word volume 0: both silent (shared channel).
- No foreign audio: SFX alone.
- SFX file missing/broken: promise resolves on error → pronunciation still plays.
- Guest mode: sounds play (public read); no per-user server state, toggle still works via localStorage.

## Responsive / a11y
- User toggle reuses the existing dropdown + shadcn `Switch` (keyboard-focusable, labelled).
- Admin page reuses existing admin table/upload components; audio `<audio controls>` preview.

## Permissions
- Read: public. Write/upload: admin-only (middleware + `requireAdmin()` + service-role API route).

## Out of scope
- Study mode, WordDetailView, per-SFX volume slider, multiple sound "themes".
