CREATE OR REPLACE FUNCTION public.search_language_words(p_query text, p_language_id uuid)
RETURNS TABLE(
  word_id uuid,
  english text,
  headword text,
  category text,
  lesson_id uuid,
  lesson_title text,
  lesson_number integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
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
  WHERE w.language_id = p_language_id
    AND l.is_published = true
    AND (
      f_unaccent(lower(w.headword)) LIKE '%' || f_unaccent(lower(p_query)) || '%'
      OR f_unaccent(lower(w.english)) LIKE '%' || f_unaccent(lower(p_query)) || '%'
    )
  ORDER BY w.id, l.number
  LIMIT 50;
END;
$function$;