-- 200WAD Seed Data
-- Run this AFTER 003_indexes.sql
-- Creates sample Italian language with one course and lesson for testing

-- ============================================
-- ITALIAN LANGUAGE
-- ============================================

INSERT INTO languages (id, name, flag, native_name, sort_order)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Italian',
  '🇮🇹',
  'Italiano',
  1
);

-- ============================================
-- BEGINNER COURSE
-- ============================================

INSERT INTO courses (id, language_id, name, description, level, cefr_range, word_count, total_lessons, free_lessons, price_cents, sort_order)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Italian for Beginners',
  'Start your Italian journey with essential words and phrases.',
  'beginner',
  'A1-A2',
  200,
  10,
  3,
  4900,
  1
);

-- ============================================
-- LESSON 1: GREETINGS
-- ============================================

INSERT INTO lessons (id, course_id, number, title, emoji, word_count, sort_order)
VALUES (
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  1,
  'Greetings',
  '👋',
  10,
  1
);

-- ============================================
-- WORDS FOR LESSON 1
-- ============================================

INSERT INTO words (id, lesson_id, english, foreign_word, part_of_speech, notes, memory_trigger_text, sort_order)
VALUES
  ('d4e5f6a7-b8c9-0123-def0-234567890123', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'hello', 'ciao', 'interjection', 'Used for both hello and goodbye in informal situations.', 'Think of "chow" - like eating, a friendly greeting!', 1),
  ('e5f6a7b8-c9d0-1234-ef01-345678901234', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'good morning', 'buongiorno', 'interjection', 'Formal greeting used until early afternoon.', 'BUON (good) + GIORNO (day) = Good day!', 2),
  ('f6a7b8c9-d0e1-2345-f012-456789012345', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'good evening', 'buonasera', 'interjection', 'Used from late afternoon onwards.', 'BUONA (good) + SERA (evening)', 3),
  ('a7b8c9d0-e1f2-3456-0123-567890123456', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'good night', 'buonanotte', 'interjection', 'Said when going to bed or leaving late at night.', 'BUONA (good) + NOTTE (night)', 4),
  ('b8c9d0e1-f2a3-4567-1234-678901234567', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'goodbye', 'arrivederci', 'interjection', 'Formal goodbye. Use "ciao" for informal.', 'Arrive + derci = Until we arrive again!', 5),
  ('c9d0e1f2-a3b4-5678-2345-789012345678', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'please', 'per favore', 'adverb', 'Polite way to make requests.', 'PER FAVOR(e) - do me a favor!', 6),
  ('d0e1f2a3-b4c5-6789-3456-890123456789', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'thank you', 'grazie', 'interjection', 'Express gratitude. Add "mille" for emphasis.', 'GRAZI-e sounds like "grassy" - grateful for the grass!', 7),
  ('e1f2a3b4-c5d6-7890-4567-901234567890', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'you are welcome', 'prego', 'interjection', 'Also means "I pray" or "go ahead".', 'PREGO = "I pray you accept my thanks"', 8),
  ('f2a3b4c5-d6e7-8901-5678-012345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'excuse me', 'scusa', 'interjection', 'Informal. Use "scusi" for formal.', 'Like "excuse" - SCUSA!', 9),
  ('a3b4c5d6-e7f8-9012-6789-123456789012', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'yes', 'sì', 'adverb', 'Simple affirmative.', 'SEE? Yes, I see!', 10);

-- ============================================
-- LESSON 2: NUMBERS
-- ============================================

INSERT INTO lessons (id, course_id, number, title, emoji, word_count, sort_order)
VALUES (
  'c3d4e5f6-a7b8-9012-cdef-123456789013',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  2,
  'Numbers',
  '🔢',
  10,
  2
);

-- ============================================
-- WORDS FOR LESSON 2
-- ============================================

INSERT INTO words (id, lesson_id, english, foreign_word, part_of_speech, notes, memory_trigger_text, sort_order)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'c3d4e5f6-a7b8-9012-cdef-123456789013', 'one', 'uno', 'numeral', 'The number one. Also used as indefinite article.', 'UNO - like the card game! You need ONE card to win.', 1),
  ('11111111-1111-1111-1111-111111111102', 'c3d4e5f6-a7b8-9012-cdef-123456789013', 'two', 'due', 'numeral', 'The number two.', 'DUE sounds like "do" - two things to DO!', 2),
  ('11111111-1111-1111-1111-111111111103', 'c3d4e5f6-a7b8-9012-cdef-123456789013', 'three', 'tre', 'numeral', 'The number three.', 'TRE = tree with THREE branches.', 3),
  ('11111111-1111-1111-1111-111111111104', 'c3d4e5f6-a7b8-9012-cdef-123456789013', 'four', 'quattro', 'numeral', 'The number four.', 'QUATTRO - like Audi Quattro with FOUR-wheel drive!', 4),
  ('11111111-1111-1111-1111-111111111105', 'c3d4e5f6-a7b8-9012-cdef-123456789013', 'five', 'cinque', 'numeral', 'The number five.', 'CINQUE sounds like "sink" - FIVE fingers in the sink!', 5),
  ('11111111-1111-1111-1111-111111111106', 'c3d4e5f6-a7b8-9012-cdef-123456789013', 'six', 'sei', 'numeral', 'The number six.', 'SEI sounds like "say" - SAY SIX!', 6),
  ('11111111-1111-1111-1111-111111111107', 'c3d4e5f6-a7b8-9012-cdef-123456789013', 'seven', 'sette', 'numeral', 'The number seven.', 'SETTE sounds like "set" - a SET of SEVEN.', 7),
  ('11111111-1111-1111-1111-111111111108', 'c3d4e5f6-a7b8-9012-cdef-123456789013', 'eight', 'otto', 'numeral', 'The number eight.', 'OTTO looks like 8 turned sideways - two Os!', 8),
  ('11111111-1111-1111-1111-111111111109', 'c3d4e5f6-a7b8-9012-cdef-123456789013', 'nine', 'nove', 'numeral', 'The number nine.', 'NOVE sounds like "nova" - a star exploding NINE times!', 9),
  ('11111111-1111-1111-1111-111111111110', 'c3d4e5f6-a7b8-9012-cdef-123456789013', 'ten', 'dieci', 'numeral', 'The number ten.', 'DIECI sounds like "diesel" - TEN liters of diesel!', 10);

-- ============================================
-- LESSON 3: FOOD AND DRINKS
-- ============================================

INSERT INTO lessons (id, course_id, number, title, emoji, word_count, sort_order)
VALUES (
  'c3d4e5f6-a7b8-9012-cdef-123456789014',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  3,
  'Food and Drinks',
  '🍕',
  10,
  3
);

-- ============================================
-- WORDS FOR LESSON 3
-- ============================================

INSERT INTO words (id, lesson_id, english, foreign_word, part_of_speech, notes, memory_trigger_text, sort_order)
VALUES
  ('22222222-2222-2222-2222-222222222201', 'c3d4e5f6-a7b8-9012-cdef-123456789014', 'pizza', 'pizza', 'noun', 'The famous Italian dish! Same word in English.', 'PIZZA is the same - Italy gave this word to the world!', 1),
  ('22222222-2222-2222-2222-222222222202', 'c3d4e5f6-a7b8-9012-cdef-123456789014', 'pasta', 'pasta', 'noun', 'General term for all pasta dishes.', 'PASTA is also the same - another Italian gift!', 2),
  ('22222222-2222-2222-2222-222222222203', 'c3d4e5f6-a7b8-9012-cdef-123456789014', 'bread', 'pane', 'noun', 'A staple food in Italian cuisine.', 'PANE sounds like "pan" - bread in a PAN!', 3),
  ('22222222-2222-2222-2222-222222222204', 'c3d4e5f6-a7b8-9012-cdef-123456789014', 'water', 'acqua', 'noun', 'Essential beverage. Acqua minerale = mineral water.', 'ACQUA sounds like "aqua" - aquatic water!', 4),
  ('22222222-2222-2222-2222-222222222205', 'c3d4e5f6-a7b8-9012-cdef-123456789014', 'wine', 'vino', 'noun', 'Italy is famous for its wines!', 'VINO sounds like "vino" in many languages - VINOtage!', 5),
  ('22222222-2222-2222-2222-222222222206', 'c3d4e5f6-a7b8-9012-cdef-123456789014', 'coffee', 'caffè', 'noun', 'Italians take their coffee seriously!', 'CAFFÈ = CAFFEine = COFFEE!', 6),
  ('22222222-2222-2222-2222-222222222207', 'c3d4e5f6-a7b8-9012-cdef-123456789014', 'cheese', 'formaggio', 'noun', 'Italy has many famous cheeses like Parmigiano.', 'FORMAGGIO - for MY cheese! Form + aggio.', 7),
  ('22222222-2222-2222-2222-222222222208', 'c3d4e5f6-a7b8-9012-cdef-123456789014', 'tomato', 'pomodoro', 'noun', 'Key ingredient in Italian cuisine.', 'POMODORO = "golden apple" (pomo d''oro) - red gold!', 8),
  ('22222222-2222-2222-2222-222222222209', 'c3d4e5f6-a7b8-9012-cdef-123456789014', 'ice cream', 'gelato', 'noun', 'Italian-style ice cream, denser than regular ice cream.', 'GELATO - like "gel" - smooth and creamy gel!', 9),
  ('22222222-2222-2222-2222-222222222210', 'c3d4e5f6-a7b8-9012-cdef-123456789014', 'fruit', 'frutta', 'noun', 'Collective term for fruits.', 'FRUTTA sounds like "fruit" + "a" - easy!', 10);

-- ============================================
-- LESSON 4: FAMILY
-- ============================================

INSERT INTO lessons (id, course_id, number, title, emoji, word_count, sort_order)
VALUES (
  'c3d4e5f6-a7b8-9012-cdef-123456789015',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  4,
  'Family',
  '👨‍👩‍👧‍👦',
  10,
  4
);

-- ============================================
-- WORDS FOR LESSON 4
-- ============================================

INSERT INTO words (id, lesson_id, english, foreign_word, part_of_speech, notes, memory_trigger_text, sort_order)
VALUES
  ('33333333-3333-3333-3333-333333333301', 'c3d4e5f6-a7b8-9012-cdef-123456789015', 'mother', 'madre', 'noun', 'Formal term for mother. Mamma is informal.', 'MADRE = MAternal - like Madonna, the mother!', 1),
  ('33333333-3333-3333-3333-333333333302', 'c3d4e5f6-a7b8-9012-cdef-123456789015', 'father', 'padre', 'noun', 'Formal term for father. Papà is informal.', 'PADRE = PAternal - like a padre (priest) is a father figure.', 2),
  ('33333333-3333-3333-3333-333333333303', 'c3d4e5f6-a7b8-9012-cdef-123456789015', 'brother', 'fratello', 'noun', 'Male sibling.', 'FRATELLO = FRATernal - fraternity brothers!', 3),
  ('33333333-3333-3333-3333-333333333304', 'c3d4e5f6-a7b8-9012-cdef-123456789015', 'sister', 'sorella', 'noun', 'Female sibling.', 'SORELLA = SORority - sorority sisters!', 4),
  ('33333333-3333-3333-3333-333333333305', 'c3d4e5f6-a7b8-9012-cdef-123456789015', 'son', 'figlio', 'noun', 'Male child.', 'FIGLIO = FILial - filial son!', 5),
  ('33333333-3333-3333-3333-333333333306', 'c3d4e5f6-a7b8-9012-cdef-123456789015', 'daughter', 'figlia', 'noun', 'Female child.', 'FIGLIA = FILial daughter - just add "a"!', 6),
  ('33333333-3333-3333-3333-333333333307', 'c3d4e5f6-a7b8-9012-cdef-123456789015', 'grandfather', 'nonno', 'noun', 'Father''s or mother''s father.', 'NONNO = like "nono" (ninth) - old and wise!', 7),
  ('33333333-3333-3333-3333-333333333308', 'c3d4e5f6-a7b8-9012-cdef-123456789015', 'grandmother', 'nonna', 'noun', 'Father''s or mother''s mother.', 'NONNA = NONNO + A for feminine - grandma!', 8),
  ('33333333-3333-3333-3333-333333333309', 'c3d4e5f6-a7b8-9012-cdef-123456789015', 'family', 'famiglia', 'noun', 'The family unit.', 'FAMIGLIA sounds like "family" + "a"!', 9),
  ('33333333-3333-3333-3333-333333333310', 'c3d4e5f6-a7b8-9012-cdef-123456789015', 'child', 'bambino', 'noun', 'Young person. Bambina for female.', 'BAMBINO = baby in Bambino Jesus!', 10);

-- ============================================
-- EXAMPLE SENTENCES
-- ============================================

INSERT INTO example_sentences (word_id, foreign_sentence, english_sentence, sort_order)
VALUES
  ('d4e5f6a7-b8c9-0123-def0-234567890123', 'Ciao, come stai?', 'Hello, how are you?', 1),
  ('d4e5f6a7-b8c9-0123-def0-234567890123', 'Ciao, a domani!', 'Bye, see you tomorrow!', 2),
  ('e5f6a7b8-c9d0-1234-ef01-345678901234', 'Buongiorno, signora!', 'Good morning, madam!', 1),
  ('f6a7b8c9-d0e1-2345-f012-456789012345', 'Buonasera a tutti!', 'Good evening everyone!', 1),
  ('d0e1f2a3-b4c5-6789-3456-890123456789', 'Grazie mille!', 'Thank you very much!', 1),
  -- Numbers examples
  ('11111111-1111-1111-1111-111111111101', 'Ho uno zaino.', 'I have one backpack.', 1),
  ('11111111-1111-1111-1111-111111111104', 'Ci sono quattro stagioni.', 'There are four seasons.', 1),
  ('11111111-1111-1111-1111-111111111110', 'Ho dieci dita.', 'I have ten fingers.', 1),
  -- Food examples
  ('22222222-2222-2222-2222-222222222201', 'Vorrei una pizza margherita.', 'I would like a margherita pizza.', 1),
  ('22222222-2222-2222-2222-222222222206', 'Un caffè, per favore.', 'A coffee, please.', 1),
  ('22222222-2222-2222-2222-222222222209', 'Il gelato italiano è buonissimo!', 'Italian ice cream is delicious!', 1),
  -- Family examples
  ('33333333-3333-3333-3333-333333333301', 'Mia madre cucina bene.', 'My mother cooks well.', 1),
  ('33333333-3333-3333-3333-333333333309', 'La mia famiglia è grande.', 'My family is big.', 1),
  ('33333333-3333-3333-3333-333333333310', 'Il bambino gioca nel parco.', 'The child plays in the park.', 1);
