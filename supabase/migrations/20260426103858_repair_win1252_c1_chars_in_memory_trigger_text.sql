-- Repair memory_trigger_text rows where the legacy RTF importer wrote
-- Windows-1252 byte values (0x80–0x9F) as raw Unicode code points instead of
-- their proper typographic equivalents. The most common case is 0x85 (…) which
-- ended up as U+0085 NEL, rendered as a missing-glyph box in the UI.

UPDATE words
SET memory_trigger_text = translate(
  memory_trigger_text,
  E'\u0080\u0082\u0083\u0084\u0085\u0086\u0087\u0088\u0089\u008a\u008b\u008c\u008e\u0091\u0092\u0093\u0094\u0095\u0096\u0097\u0098\u0099\u009a\u009b\u009c\u009e\u009f',
  E'€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'
)
WHERE memory_trigger_text ~ '[\u0080-\u009F]';