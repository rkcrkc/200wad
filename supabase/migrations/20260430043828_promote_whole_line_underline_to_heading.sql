-- Promote any line that is entirely <u>...</u> (no other content on the line)
-- to a "# heading". Inline <u>...</u> within prose is preserved.
-- Inner content uses [^<>\n] so multi-segment lines like
-- "<u>foo</u> mid <u>bar</u>" are NOT collapsed into a heading.
UPDATE words
SET memory_trigger_text = regexp_replace(
  memory_trigger_text,
  '(^|\n)[ \t]*<u>([^<>\n]+)</u>[ \t]*(?=\n|$)',
  '\1# \2',
  'g'
)
WHERE memory_trigger_text ~ '(^|\n)[ \t]*<u>[^<>\n]+</u>[ \t]*(\n|$)';