# Spanish Lesson Split Plan

Status: **APPLIED.** Both migrations have run (`split_spanish_vocab_1_lessons`, `split_spanish_vocab_2_lessons`) and were verified: lesson rows 125 (113 published + 12 unpublished empties) / 99; `courses.total_lessons` updated (125 / 99); contiguous `(course_id, number)` 1…N; `word_count` recomputed from `lesson_words` (0 mismatches); word totals conserved (1048 / 1017); no orphaned `lesson_words`; every published chunk in the 8–15 band. A later refinement (`rebalance_spanish_vocab_1_even_split`, `rebalance_spanish_vocab_2_even_split`) re-balanced every split group to the **even-split rule** below — each lesson now differs from its nearest sibling by at most 1 word — without changing lesson counts, numbering, or which words sit in which theme. This applies the same split used for French and German (see `FRENCH_LESSON_SPLIT_PLAN.md`, `GERMAN_LESSON_SPLIT_PLAN.md`) to Spanish **Vocab #1** and **Vocab #2**, with the two German-specific rules the user confirmed: **across-course continuous numbering** and a **`- General` suffix** on generic parent lessons. The tables below reflect the final, re-balanced word counts.

## Goal

Break the large Spanish vocab lessons (up to 30 words) into smaller ~10-word lessons, matching the French/German treatment. Word-level mastery is keyed to **words**, so splitting lessons does not affect any user progress.

## Locked decisions

- **Scope:** Spanish **Vocab #1** (`66c44c81-…`) and **Vocab #2** (`2d2e42f5-…`) only. The Sentences **titles** were later renamed separately (see "Sentences rename" at the end of this doc) — words/rows/progress unaffected.
- **Empty utility lessons:** the 12 zero-word lessons in Vocab #1 (`My Notes`, `Accented Words`, `Masculine Feminine - same Noun`, `Words similar Spanish & English`, `My Best Words`, `My Worst Words`, `Compound Words`, `Random Words- earlier Lessons`, `Random Words- not in Vocabulary`, `False Friends`, `Character Des Words`, `Character Jimi Hashair`) are **unpublished** (`is_published = false`), not deleted — they hold no words and stay out of the learner-facing list while preserving the rows.
- **Split threshold:** only lessons with **≥16 words** are split (16 = smallest size yielding two ≥8 halves). Lessons of **8–15 words are left whole**.
- **Chunk count:** `k = round(words / 10)` (half-up), per lesson.
- **Chunk sizes — even split (primary), gentle variety (secondary):** chunks within a group are sized **as evenly as possible**, so each lesson differs from its nearest sibling by **at most 1 word**. For `k` chunks totalling `T`: `T mod k` chunks get `⌈T/k⌉` words and the rest get `⌊T/k⌋` (e.g. `28 → 9/10/9`, `27 → 9/9/9`, `30 → 10/10/10`). All split chunks stay inside the **8–12** band. *Where* the slightly-larger `(+1)` chunks sit is the **secondary** consideration: they are placed at the positions that were largest under the earlier variable-reward draft, so the gentle **non-monotonic ‘peak’** shape is preserved (e.g. `28 → 9/10/9`, peak in the middle) rather than an ascending ramp. (This replaces the earlier "variable rewards" rule; the user prioritised evenness — max ±1 between siblings — over XP variety.)
- **Word order:** preserved exactly (positional split by existing `lesson_words.sort_order`).
- **No pooling:** Spanish has no straggler parts to absorb, so every lesson **splits in place** — no theme is combined across parts and re-split (unlike German V2). Multi-part series simply keep their original positions.
- **Across-course continuous numbering (per base):** each base theme is numbered `(1)…(N)` **continuously across both courses** in course-then-position order. So `Common Words` runs `(1)–(12)` across Vocab #1; `Food - General` runs `(1)–(3)` in Vocab #1 and continues `(4)–(5)` in Vocab #2; `Verbs - General` runs `(1)–(3)` then `(4)–(7)`. A base that yields only one lesson keeps its plain name (e.g. `Garden`).
- **`- General` suffix on generic parents:** where a plain parent lesson sits beside named subtopics, it is renamed to `… - General` for a consistent suffixed look (no reordering, just the title). Applies to **`Food`, `People`, `Verbs`**. (`Home` already uses `Home - General` in source.) Their named subtopics are untouched and remain separate bases.
- **free_lessons:** unchanged.

## Impact

| Course | Current lessons | New total | Words (unchanged) |
|---|---|---|---|
| Spanish Vocab #1 | 53 (41 vocab + 12 empty) | **113** published (+12 retained, unpublished) | 1048 |
| Spanish Vocab #2 | 49 | **99** | 1017 |

## Notes for review

1. **Generic parents renamed `- General`:** `Food → Food - General` (V1 (1)–(3), V2 (4)–(5)), `People → People - General` (V1 (1)–(3)), `Verbs → Verbs - General` (V1 (1)–(3), V2 (4)–(5) and (6)–(7)). Their named subtopics — `Food - Fruit & Vegetables`, `Food - Meat & Seafood & Drinks`, `Food - Drinks`, `People - Family`, `People - Friends`, `People - Body`, `People - Clothes`, `People - States`, `People - Attributes`, `People - Family, Friends`, `Verbs - Actions & Motion`, `Verbs - Social, Conversation` — are untouched and remain separate bases.
2. **Accent normalisation:** `Restaurant, Cafe (2)` (Vocab #2) is treated as the same base as `Restaurant, Café` (Vocab #1), so the series numbers continuously `(1)–(3)` then `(4)–(6)` with the accented title throughout.
3. **`Environment` vs `Environment & Geography` kept separate:** Vocab #1 `Environment` and Vocab #2 `Environment & Geography` are distinct base names and are numbered independently (each `(1)…`).
4. **8–15 word lessons left whole:** `Garden` (12, Vocab #2) and `Food - Meat & Seafood & Drinks (4)` (15, Vocab #2 — kept whole but still numbered within its series).

## Migration mechanics (same pattern as German, one `apply_migration` per course)

- Reuse each lesson's **anchor** original row/id for its **first** chunk (preserves `id`, `is_published`, `legacy_lesson_id`, and existing session/progress FKs).
- Insert new `lessons` rows for chunks 2…N (`is_published` copied from the anchor).
- Repoint moved words via `lesson_words.lesson_id`, keeping relative `sort_order`.
- Recompute `lessons.word_count`; renumber `number` + `sort_order` 1…N per course (shift to a high temp offset first to dodge the `(course_id, number)` unique index). The 12 unpublished empties keep their rows and sort after the published lessons.
- Set the 12 Vocab #1 empties to `is_published = false`.
- Update `courses.total_lessons`.

## Verification after running

- `courses.total_lessons` updated; lesson row counts match (113 published + 12 unpublished / 99).
- `SUM(lessons.word_count)` per course unchanged (1048 / 1017); every split chunk 8–12, every left-whole singleton 8–15.
- No orphaned `lesson_words`; `(course_id, number)` contiguous with no gaps/dupes.
- The 12 empties have `word_count = 0` and `is_published = false`.

---

## Spanish Vocab #1 — resulting lessons (113)

| # | New title | Words | From original |
|---|---|---|---|
| 1 | Common Words (1) | 8 | Common Words (1) |
| 2 | Common Words (2) | 9 | Common Words (1) |
| 3 | Common Words (3) | 9 | Common Words (1) |
| 4 | People - General (1) | 9 | People |
| 5 | People - General (2) | 9 | People |
| 6 | People - General (3) | 9 | People |
| 7 | Home - General (1) | 8 | Home - General |
| 8 | Home - General (2) | 9 | Home - General |
| 9 | Home - General (3) | 9 | Home - General |
| 10 | Where? (1) | 8 | Where? |
| 11 | Where? (2) | 9 | Where? |
| 12 | Where? (3) | 8 | Where? |
| 13 | Food - General (1) | 9 | Food |
| 14 | Food - General (2) | 10 | Food |
| 15 | Food - General (3) | 9 | Food |
| 16 | Numbers List One (1) | 11 | Numbers List One |
| 17 | Numbers List One (2) | 12 | Numbers List One |
| 18 | Time (1) | 8 | Time |
| 19 | Time (2) | 9 | Time |
| 20 | Time (3) | 9 | Time |
| 21 | Weather (1) | 9 | Weather |
| 22 | Weather (2) | 9 | Weather |
| 23 | Weather (3) | 9 | Weather |
| 24 | Health (1) | 10 | Health |
| 25 | Health (2) | 10 | Health |
| 26 | Restaurant, Café (1) | 8 | Restaurant, Café |
| 27 | Restaurant, Café (2) | 9 | Restaurant, Café |
| 28 | Restaurant, Café (3) | 9 | Restaurant, Café |
| 29 | Common Words (4) | 9 | Common Words (2) |
| 30 | Common Words (5) | 9 | Common Words (2) |
| 31 | Common Words (6) | 9 | Common Words (2) |
| 32 | People - Family (1) | 12 | People - Family |
| 33 | People - Family (2) | 12 | People - Family |
| 34 | Days, Months, Seasons (1) | 8 | Days, Months, Seasons |
| 35 | Days, Months, Seasons (2) | 9 | Days, Months, Seasons |
| 36 | Days, Months, Seasons (3) | 9 | Days, Months, Seasons |
| 37 | Home - Kitchen (1) | 8 | Home - Kitchen |
| 38 | Home - Kitchen (2) | 9 | Home - Kitchen |
| 39 | Home - Kitchen (3) | 8 | Home - Kitchen |
| 40 | Numbers List Two (1) | 8 | Numbers List Two |
| 41 | Numbers List Two (2) | 9 | Numbers List Two |
| 42 | Numbers List Two (3) | 9 | Numbers List Two |
| 43 | Food - Fruit & Vegetables (1) | 8 | Food - Fruit & Vegetables |
| 44 | Food - Fruit & Vegetables (2) | 9 | Food - Fruit & Vegetables |
| 45 | Food - Fruit & Vegetables (3) | 8 | Food - Fruit & Vegetables |
| 46 | Colours (1) | 9 | Colours |
| 47 | Colours (2) | 9 | Colours |
| 48 | Town (1) | 10 | Town |
| 49 | Town (2) | 10 | Town |
| 50 | Town (3) | 10 | Town |
| 51 | Adjectives (1) | 9 | Adjectives |
| 52 | Adjectives (2) | 9 | Adjectives |
| 53 | Adjectives (3) | 9 | Adjectives |
| 54 | Common Words (7) | 9 | Common Words (3) |
| 55 | Common Words (8) | 10 | Common Words (3) |
| 56 | Common Words (9) | 9 | Common Words (3) |
| 57 | People - Friends (1) | 9 | People - Friends |
| 58 | People - Friends (2) | 10 | People - Friends |
| 59 | People - Friends (3) | 9 | People - Friends |
| 60 | Food - Meat & Seafood & Drinks (1) | 8 | Food - Meat & Seafood & Drinks |
| 61 | Food - Meat & Seafood & Drinks (2) | 9 | Food - Meat & Seafood & Drinks |
| 62 | Food - Meat & Seafood & Drinks (3) | 8 | Food - Meat & Seafood & Drinks |
| 63 | Bank, Post Office (1) | 11 | Bank, Post Office |
| 64 | Bank, Post Office (2) | 11 | Bank, Post Office |
| 65 | Home - Bathroom (1) | 11 | Home - Bathroom |
| 66 | Home - Bathroom (2) | 11 | Home - Bathroom |
| 67 | People - Body (1) | 11 | People - Body |
| 68 | People - Body (2) | 12 | People - Body |
| 69 | Transport (1) | 10 | Transport |
| 70 | Transport (2) | 10 | Transport |
| 71 | Transport (3) | 10 | Transport |
| 72 | Shopping (1) | 8 | Shopping |
| 73 | Shopping (2) | 9 | Shopping |
| 74 | Shopping (3) | 9 | Shopping |
| 75 | Verbs - General (1) | 9 | Verbs |
| 76 | Verbs - General (2) | 10 | Verbs |
| 77 | Verbs - General (3) | 9 | Verbs |
| 78 | People - Clothes (1) | 12 | People - Clothes |
| 79 | People - Clothes (2) | 12 | People - Clothes |
| 80 | Common Words (10) | 8 | Common Words (4) |
| 81 | Common Words (11) | 9 | Common Words (4) |
| 82 | Common Words (12) | 9 | Common Words (4) |
| 83 | Conjunctions, Prepositions & Negatives (1) | 8 | Conjunctions, Prepositions & Negatives |
| 84 | Conjunctions, Prepositions & Negatives (2) | 9 | Conjunctions, Prepositions & Negatives |
| 85 | Conjunctions, Prepositions & Negatives (3) | 8 | Conjunctions, Prepositions & Negatives |
| 86 | Home - Bedroom (1) | 8 | Home - Bedroom |
| 87 | Home - Bedroom (2) | 9 | Home - Bedroom |
| 88 | Home - Bedroom (3) | 8 | Home - Bedroom |
| 89 | Travel (1) | 10 | Travel |
| 90 | Travel (2) | 10 | Travel |
| 91 | Travel (3) | 10 | Travel |
| 92 | Expressions (1) | 9 | Expressions |
| 93 | Expressions (2) | 10 | Expressions |
| 94 | Expressions (3) | 9 | Expressions |
| 95 | Sports (1) | 11 | Sports |
| 96 | Sports (2) | 12 | Sports |
| 97 | Animals (1) | 8 | Animals |
| 98 | Animals (2) | 9 | Animals |
| 99 | Animals (3) | 8 | Animals |
| 100 | People - States (1) | 9 | People - States |
| 101 | People - States (2) | 10 | People - States |
| 102 | People - States (3) | 10 | People - States |
| 103 | School (1) | 8 | School |
| 104 | School (2) | 9 | School |
| 105 | School (3) | 8 | School |
| 106 | Shapes, Forms, Quantities (1) | 10 | Shapes, Forms, Quantities |
| 107 | Shapes, Forms, Quantities (2) | 10 | Shapes, Forms, Quantities |
| 108 | Environment (1) | 9 | Environment |
| 109 | Environment (2) | 10 | Environment |
| 110 | Environment (3) | 9 | Environment |
| 111 | Leisure (1) | 8 | Leisure |
| 112 | Leisure (2) | 9 | Leisure |
| 113 | Leisure (3) | 9 | Leisure |

**Unpublished (retained, 0 words):** My Notes, Accented Words, Masculine Feminine - same Noun, Words similar Spanish & English, My Best Words, My Worst Words, Compound Words, Random Words- earlier Lessons, Random Words- not in Vocabulary, False Friends, Character Des Words, Character Jimi Hashair.

## Spanish Vocab #2 — resulting lessons (99)

| # | New title | Words | From original |
|---|---|---|---|
| 1 | Verbs - Actions & Motion (1) | 11 | Verbs - Actions & Motion |
| 2 | Verbs - Actions & Motion (2) | 11 | Verbs - Actions & Motion |
| 3 | Home - General (4) | 10 | Home - General (2) |
| 4 | Home - General (5) | 10 | Home - General (2) |
| 5 | Travel (4) | 12 | Travel (2) |
| 6 | Travel (5) | 12 | Travel (2) |
| 7 | Bank, Post Office (3) | 11 | Bank, Post Office (2) |
| 8 | Bank, Post Office (4) | 10 | Bank, Post Office (2) |
| 9 | Food - Drinks (1) | 10 | Food - Drinks |
| 10 | Food - Drinks (2) | 11 | Food - Drinks |
| 11 | Expressions (4) | 11 | Expressions (2) |
| 12 | Expressions (5) | 10 | Expressions (2) |
| 13 | People - Attributes (1) | 9 | People - Attributes |
| 14 | People - Attributes (2) | 10 | People - Attributes |
| 15 | Career (1) | 11 | Career |
| 16 | Career (2) | 10 | Career |
| 17 | Adjectives (4) | 9 | Adjectives (2) |
| 18 | Adjectives (5) | 9 | Adjectives (2) |
| 19 | Society (1) | 10 | Society |
| 20 | Society (2) | 10 | Society |
| 21 | Holidays - By the Sea (1) | 11 | Holidays - By the Sea |
| 22 | Holidays - By the Sea (2) | 12 | Holidays - By the Sea |
| 23 | IT Vocab (1) | 9 | IT Vocab |
| 24 | IT Vocab (2) | 9 | IT Vocab |
| 25 | Celebrations (1) | 11 | Celebrations |
| 26 | Celebrations (2) | 11 | Celebrations |
| 27 | Society (3) | 9 | Society (2) |
| 28 | Society (4) | 9 | Society (2) |
| 29 | Restaurant, Café (4) | 8 | Restaurant, Cafe (2) |
| 30 | Restaurant, Café (5) | 9 | Restaurant, Cafe (2) |
| 31 | Restaurant, Café (6) | 9 | Restaurant, Cafe (2) |
| 32 | Town (4) | 9 | Town (2) |
| 33 | Town (5) | 9 | Town (2) |
| 34 | Verbs - General (4) | 12 | Verbs (2) |
| 35 | Verbs - General (5) | 12 | Verbs (2) |
| 36 | Home - Housework (1) | 10 | Home - Housework |
| 37 | Home - Housework (2) | 11 | Home - Housework |
| 38 | People - Body (3) | 10 | People - Body (2) |
| 39 | People - Body (4) | 10 | People - Body (2) |
| 40 | Materials (1) | 8 | Materials |
| 41 | Materials (2) | 8 | Materials |
| 42 | Food - Fruit & Vegetables (4) | 11 | Food - Fruit & Vegetables (2) |
| 43 | Food - Fruit & Vegetables (5) | 10 | Food - Fruit & Vegetables (2) |
| 44 | Shopping (4) | 10 | Shopping (2) |
| 45 | Shopping (5) | 11 | Shopping (2) |
| 46 | Environment & Geography (1) | 10 | Environment & Geography |
| 47 | Environment & Geography (2) | 9 | Environment & Geography |
| 48 | Nationalities (1) | 10 | Nationalities |
| 49 | Nationalities (2) | 10 | Nationalities |
| 50 | Leisure (4) | 11 | Leisure (2) |
| 51 | Leisure (5) | 10 | Leisure (2) |
| 52 | Adverbs, Conjunctions & Prepositions (1) | 10 | Adverbs, Conjunctions & Prepositions |
| 53 | Adverbs, Conjunctions & Prepositions (2) | 11 | Adverbs, Conjunctions & Prepositions |
| 54 | Garden | 12 | Garden |
| 55 | People - Clothes (3) | 11 | People - Clothes (2) |
| 56 | People - Clothes (4) | 11 | People - Clothes (2) |
| 57 | School (4) | 10 | School (2) |
| 58 | School (5) | 11 | School (2) |
| 59 | Weather (4) | 10 | Weather (2) |
| 60 | Weather (5) | 10 | Weather (2) |
| 61 | Animals (4) | 11 | Animals (2) |
| 62 | Animals (5) | 11 | Animals (2) |
| 63 | Sports (3) | 9 | Sports (2) |
| 64 | Sports (4) | 9 | Sports (2) |
| 65 | Verbs - Social, Conversation (1) | 10 | Verbs - Social, Conversation |
| 66 | Verbs - Social, Conversation (2) | 11 | Verbs - Social, Conversation |
| 67 | Food - Meat & Seafood & Drinks (4) | 15 | Food - Meat & Seafood & Drinks (2) |
| 68 | Transport (4) | 11 | Transport (2) |
| 69 | Transport (5) | 11 | Transport (2) |
| 70 | Nations (1) | 9 | Nations |
| 71 | Nations (2) | 10 | Nations |
| 72 | Nations (3) | 10 | Nations |
| 73 | Where? (4) | 10 | Where? (2) |
| 74 | Where? (5) | 10 | Where? (2) |
| 75 | People - States (4) | 10 | People - States (2) |
| 76 | People - States (5) | 10 | People - States (2) |
| 77 | Events (1) | 9 | Events |
| 78 | Events (2) | 10 | Events |
| 79 | People - Family, Friends (1) | 12 | People - Family, Friends |
| 80 | People - Family, Friends (2) | 11 | People - Family, Friends |
| 81 | Health (3) | 10 | Health (2) |
| 82 | Health (4) | 11 | Health (2) |
| 83 | Adjectives (6) | 10 | Adjectives (3) |
| 84 | Adjectives (7) | 9 | Adjectives (3) |
| 85 | Home - General (6) | 11 | Home - General (3) |
| 86 | Home - General (7) | 11 | Home - General (3) |
| 87 | Shapes, Forms, Quantities (3) | 10 | Shapes, Forms, Quantities (2) |
| 88 | Shapes, Forms, Quantities (4) | 10 | Shapes, Forms, Quantities (2) |
| 89 | Work (1) | 9 | Work |
| 90 | Work (2) | 10 | Work |
| 91 | Work (3) | 9 | Work |
| 92 | Food - General (4) | 11 | Food (2) |
| 93 | Food - General (5) | 12 | Food (2) |
| 94 | Time (4) | 11 | Time (2) |
| 95 | Time (5) | 11 | Time (2) |
| 96 | Music (1) | 10 | Music |
| 97 | Music (2) | 10 | Music |
| 98 | Verbs - General (6) | 11 | Verbs (3) |
| 99 | Verbs - General (7) | 11 | Verbs (3) |

## Sentences rename

Separate from the Vocab split above, the **Sentences** courses were renamed to follow the same numeric convention (migration `rename_spanish_sentences_numeric_parts`). This is **title-only** — no rows, words, `lesson_words`, or progress were touched.

- **Courses:** Spanish Sentences (`8ed4a0e2-…`) + Spanish Sentences 2 (`e7363a3d-…`) — 215 lessons, treated as one continuous namespace (#1 then #2).
- **Why:** imported pre-split with legacy `A/B/C/D` part-suffixes that never matched the agreed `Theme (n)` numbering.
- **Rule applied:**
  - Strip the legacy trailing letter and the parenthesised group, then number continuously per base across #1→#2 (e.g. `Food - Fruit & Vegetables A/B/C` → `(1)/(2)/(3)`, continuing into #2 as `(4)/(5)`).
  - A generic parent that has named subtopics gets `- General`. Generalised here: `Food, People, Verbs`.
  - `- List …` continuations fold into their base; a base with only one resulting lesson keeps its plain name (e.g. `Verbs - Social, Conversation`).
- **Verified:** 0 still-lettered titles, 0 duplicate titles.

> The same rename was applied to **French**, **German**, and **Italian** Sentences (Italian has no plan doc and used a "General + tidy only" variant). Grammar Slammer & Sentence Builder was left untouched.
