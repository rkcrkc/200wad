-- ============================================================================
-- v1b Levels — recolour the Novice tier
-- ============================================================================
--
-- The grey Novice belt (#9ca3af) read as a disabled chip on the badge. Switch it
-- to a blue that is clearly distinct from Disciple's primary blue (#0b6cff) so
-- the ladder doesn't carry two identical blues. Idempotent: only touches the
-- novice row, leaves any later admin edits to other tiers untouched.
-- ============================================================================

UPDATE public.levels
SET color = '#3b82f6',
    updated_at = now()
WHERE slug = 'novice';
