ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'achievement'::text,
    'admin'::text,
    'billing'::text,
    'coins'::text,
    'content'::text,
    'goal'::text,
    'learning'::text,
    'personal_best'::text,
    'reminder'::text,
    'streak'::text,
    'system'::text,
    'wordprogress'::text
  ]));