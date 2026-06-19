-- Enable the unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA extensions;

-- Create an immutable wrapper (required for use in indexes/generated columns on Supabase)
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text AS $$
  SELECT extensions.unaccent($1);
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- RPC: Accent-insensitive search for words within a course (student search bar)
CREATE OR REPLACE FUNCTION public.search_course_words(p_query text, p_course_id uuid)
RETURNS TABLE(
  word_id uuid,
  english text,
  headword text,
  category text,
  lesson_id uuid,
  lesson_title text,
  lesson_number int
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (w.id)
    w.id AS word_id,
    w.english,
    w.headword,
    w.category,
    l.id AS lesson_id,
    l.title AS lesson_title,
    l.number AS lesson_number
  FROM lesson_words lw
  JOIN words w ON w.id = lw.word_id
  JOIN lessons l ON l.id = lw.lesson_id
  WHERE l.course_id = p_course_id
    AND l.is_published = true
    AND (
      f_unaccent(lower(w.headword)) LIKE '%' || f_unaccent(lower(p_query)) || '%'
      OR f_unaccent(lower(w.english)) LIKE '%' || f_unaccent(lower(p_query)) || '%'
    )
  ORDER BY w.id, l.number
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- RPC: Accent-insensitive search for words (admin / relationship searches)
CREATE OR REPLACE FUNCTION public.search_words(p_query text, p_exclude_word_id uuid DEFAULT NULL)
RETURNS TABLE(
  word_id uuid,
  english text,
  headword text,
  language_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id AS word_id,
    w.english,
    w.headword,
    w.language_id
  FROM words w
  WHERE (
    f_unaccent(lower(w.headword)) LIKE '%' || f_unaccent(lower(p_query)) || '%'
    OR f_unaccent(lower(w.english)) LIKE '%' || f_unaccent(lower(p_query)) || '%'
    OR f_unaccent(lower(w.lemma)) LIKE '%' || f_unaccent(lower(p_query)) || '%'
  )
  AND (p_exclude_word_id IS NULL OR w.id != p_exclude_word_id)
  ORDER BY w.headword
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;