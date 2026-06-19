
-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create help_entries table for glossary/help section
CREATE TABLE public.help_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient queries on published entries
CREATE INDEX idx_help_entries_published ON public.help_entries (category, sort_order, title) WHERE is_published = true;

-- Auto-update updated_at trigger
CREATE TRIGGER set_help_entries_updated_at
  BEFORE UPDATE ON public.help_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.help_entries ENABLE ROW LEVEL SECURITY;

-- Public can read published entries
CREATE POLICY "Anyone can view published help entries"
  ON public.help_entries
  FOR SELECT
  USING (is_published = true);

-- Admin can do everything
CREATE POLICY "Admins can manage all help entries"
  ON public.help_entries
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
