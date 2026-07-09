-- ============================================================================
-- Answer Feedback Sounds — admin-managed SFX for test-answer results
-- ============================================================================
--
-- Three rows, one per answer grade (correct / half-correct / incorrect). Each
-- holds the audio URL played when a learner submits a test answer of that grade,
-- plus a global on/off (`enabled`) admins can flip per sound.
--
-- Read is public (anon + authed) so guests hear feedback too; writes are
-- admin-only via the service-role client (no INSERT/UPDATE/DELETE policies).
-- Seeded to bundled defaults under /public/sounds; admins replace the URL by
-- uploading to the `audio` storage bucket.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.answer_feedback_sounds (
  grade       text PRIMARY KEY
              CHECK (grade IN ('correct', 'half-correct', 'incorrect')),
  audio_url   text NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.answer_feedback_sounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for answer feedback sounds"
  ON public.answer_feedback_sounds;

CREATE POLICY "Public read access for answer feedback sounds"
ON public.answer_feedback_sounds
FOR SELECT
TO public
USING (true);

-- Seed defaults (bundled files in /public/sounds). ON CONFLICT keeps this
-- migration idempotent without clobbering any admin-uploaded overrides.
INSERT INTO public.answer_feedback_sounds (grade, audio_url) VALUES
  ('correct',      '/sounds/correct.mp3'),
  ('half-correct', '/sounds/half-correct.mp3'),
  ('incorrect',    '/sounds/incorrect.mp3')
ON CONFLICT (grade) DO NOTHING;
