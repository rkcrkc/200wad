# French Lesson Split Plan

Status: **APPLIED.** Both migrations have run (`split_french_vocab_1_lessons`, `split_french_vocab_2_lessons`) and were verified (lesson counts, contiguous numbering, `word_count` = actual, 8–12 band, no orphaned/duplicated words). A later refinement (`rebalance_french_vocab_1_even_split`, `rebalance_french_vocab_2_even_split`) re-balanced every split group to the **even-split rule** below — each lesson now differs from its nearest sibling by at most 1 word — without changing lesson counts, numbering, or which words sit in which theme. The tables below reflect the final, re-balanced word counts. This document lists every resulting lesson (title, number/sort order, word count, source lesson).

## Goal

Break the large French vocab lessons (up to 30 words) into smaller lessons so each study/test set is more digestible. Target ~10 words per lesson.

## Locked decisions

- **Scope:** French **Vocab #1** and French **Vocab #2** only. Sentences (#1/#2) and Proverbs were untouched by the *split* work; the Sentences **titles** were later renamed separately (see "Sentences rename" at the end of this doc) — their words/rows/progress are unaffected.
- **Split threshold:** only lessons with **≥16 words** are split (16 is the smallest size that yields two ≥8-word halves). Lessons of **8–15 words are left whole** — so some 12–15 word lessons remain where they have no sibling to combine with (listed in "Notes for review").
- **Pooling sibling themes:** eight Vocab #2 themes that had multiple smaller parts are **pooled** (words combined across parts) and then re-split into even 9–11 chunks, so the 12–15 stragglers disappear: `Weather`, `Music`, `Adjectives`, `Shapes, Forms, Quantities`, `People - Clothes`, `Leisure - Sports`, `Verbs`, `Shopping`. A pooled theme is anchored at its **earliest** part's position and the later part's slot is closed up (so the original spacing between parts collapses into one block). `Common Words` is explicitly **not** pooled (its parts are difficulty tiers, not one topic). `School` (already 9/9/9/9), `Restaurant, Cafe` and `Information Technology` (24 words → only 12/12) are left split independently.
- **Chunk count:** `k = round(words / 10)` (per pooled-theme total, or per lesson otherwise).
- **Chunk sizes — even split (primary), gentle variety (secondary):** chunks within a group are sized **as evenly as possible**, so each lesson differs from its nearest sibling by **at most 1 word**. For `k` chunks totalling `T`: `T mod k` chunks get `⌈T/k⌉` words and the rest get `⌊T/k⌋` (e.g. `28 → 9/10/9`, `27 → 9/9/9`, `30 → 10/10/10`, `34 → 12/11/11`, `53 → 11/11/11/10/10`). All split chunks stay inside the **8–12** band; left-whole singletons remain 8–15. *Where* the slightly-larger `(+1)` chunks sit is the **secondary** consideration: they are placed at the positions that were largest under the earlier variable-reward draft, so the gentle **non-monotonic ‘peak’** shape is preserved (e.g. `28 → 9/10/9`, peak in the middle) rather than an ascending ramp. (This replaces the earlier "variable rewards" rule, which spread sizes to distinct values across a wider 8–12 spread; the user prioritised evenness — max ±1 between siblings — over XP variety.)
- **Word order:** preserved exactly. Splits are by existing `lesson_words.sort_order` (positional), never reshuffled. For a pooled theme, words run part 1 → part 2 (each in its own order).
- **Naming:** `Theme (n)`. For each base theme within a course, all resulting lessons are numbered continuously `(1)…(M)` in course order. If a theme yields only one lesson it keeps its plain name.
- **free_lessons:** unchanged — stays **10** on both courses.

## Impact

| Course | Current lessons | New total |
|---|---|---|
| French Vocab #1 | 38 | **106** |
| French Vocab #2 | 66 | **98** |

Total words per course are unchanged (Vocab #1 = **1037**, Vocab #2 = **1006** — these are the true `lesson_words` sums; the previously-quoted 1018/1000 came from the two stale `word_count` columns). All `user_word_progress` is keyed to **words**, so word-level mastery is completely unaffected.

## Notes for review (please check these)

1. **12–15 word lessons left whole** (singletons with no sibling to pool with — confirmed: leave as-is, above the ~10 target but coherent single topics):
   - *Vocab #1:* `Colours` (15).
   - *Vocab #2:* `Food - Meat & Seafood & Drinks` 15, `Health` 12, `Leisure - Camping` 14, `Leisure - Cinema` 14, `People - Attributes` 14, `School - subjects` 13, `Transport - Train` 12, `Town - Buildings` 14, `TV` 13, `Leisure - Seaside` 15, `Telephone` 15, `Where?` 14, `People - Friends` 14.
   - Plus 12-word halves of the non-pooled 24-word pairs (`Restaurant, Cafe`, `Information Technology` 13, `Work - Careers`, `Home - General`) and `Geography - Countries (1)` 12.

2. **Pooled themes (Vocab #2).** Eight themes are combined across their parts and re-split into even 8–12 lessons (see even-split rule above), collapsing the previous spacing into one block at the earliest position: `Adjectives` (29→9/10/10), `Shapes, Forms, Quantities` (30→10/10/10), `Shopping` (34→11/12/11), `Verbs` (53→10/11/10/11/11), `Weather` (27→9/9/9), `Music` (27→9/9/9), `People - Clothes` (28→9/10/9), `Leisure - Sports` (31→10/11/10).

3. **Continuous renumbering of multi-part themes.** `Common Words (1)–(4)` (118 words across 4 lessons) becomes `Common Words (1)–(12)`. Likewise `Verbs`, `School`, `Shopping`, `Expressions` etc. in Vocab #2 renumber continuously even where the original parts are scattered through the course (their positions are preserved; only the number in the title is sequential).
   - **Common Words is difficulty-ranked** (set 1 = easiest → set 4 = hardest) and is deliberately spread through the course at increasing difficulty. This progression is **kept as-is**: CW1's spin-offs sit at positions 1–3, CW2's at 27–29, CW3's at 48–50, CW4's at 76–78 — so the easier sets always precede the harder ones. New chunks are inserted adjacent to their parent, never appended at the end.

4. **Duplicate-named lessons get disambiguated.** Vocab #2 currently has several pairs of lessons with identical titles (e.g. two `Adjectives`, two `Weather`, two `Music`, two `Restaurant, Cafe`). These now become `(1)`/`(2)` (the pooled ones merge entirely; the non-pooled `Restaurant, Cafe` stays two lessons).

5. **One lone suffix normalised:** Vocab #2 `Numbers (2)` → `Numbers` (there is no `Numbers (1)` in this course; the `(1)` lived in Vocab #1).

## Migration mechanics (for when approved)

- Reuse each group's **anchor** original lesson row/id for its **first** chunk (preserves `id`, `is_published`, `legacy_lesson_id`, and keeps existing session/progress foreign keys valid). For a pooled theme the anchor is the earliest part; the other parts' rows are deleted after their words are repointed.
- Insert new `lessons` rows for chunks 2…N (`legacy_lesson_id` = NULL, `is_published` copied from source).
- Repoint moved words via `lesson_words.lesson_id`; keep relative `lesson_words.sort_order` (pooled themes concatenate part 1 → part 2).
- Recompute `lessons.word_count` for every affected lesson.
- Renumber `number` + `sort_order` per course. The unique `(course_id, number)` index means numbers are first shifted to a high temporary offset, then reassigned 1…N.
- Update `courses.total_lessons` (106 / 98).
- Run as one idempotent `apply_migration` per course.
- **Note:** because pooled themes delete their non-anchor parts, the few dev `study_sessions`/`test_sessions` pointing at those deleted lesson ids are cleared as part of the migration.

## Verification after running

- `courses.total_lessons` = 106 / 98; lesson row counts match.
- `SUM(lessons.word_count)` per course unchanged (1037 / 1006); every split lesson's `word_count` between 8 and 12, and every left-whole singleton between 8 and 15. (The migration recomputes `word_count` from `lesson_words`, which also corrected the two previously-stale columns: Vocab #1 `Environment` and Vocab #2 `Expressions`.)
- No orphaned `lesson_words` (every word still on exactly one lesson per course).
- `(course_id, number)` contiguous 1…N with no gaps/dupes.

---

## French Vocab #1 — resulting lessons (106)

| # | New title | Words | From original lesson |
|---|---|---|---|
| 1 | Common Words (1) | 9 | Common Words (1) |
| 2 | Common Words (2) | 10 | Common Words (1) |
| 3 | Common Words (3) | 9 | Common Words (1) |
| 4 | People (1) | 9 | People |
| 5 | People (2) | 10 | People |
| 6 | People (3) | 10 | People |
| 7 | Home - General (1) | 10 | Home - General |
| 8 | Home - General (2) | 10 | Home - General |
| 9 | Home - General (3) | 10 | Home - General |
| 10 | Where (1) | 10 | Where |
| 11 | Where (2) | 10 | Where |
| 12 | Where (3) | 10 | Where |
| 13 | Food (1) | 9 | Food |
| 14 | Food (2) | 9 | Food |
| 15 | Food (3) | 9 | Food |
| 16 | Numbers (1) | 10 | Numbers |
| 17 | Numbers (2) | 10 | Numbers |
| 18 | Numbers (3) | 10 | Numbers |
| 19 | Time (1) | 9 | Time |
| 20 | Time (2) | 10 | Time |
| 21 | Time (3) | 10 | Time |
| 22 | Weather (1) | 12 | Weather |
| 23 | Weather (2) | 12 | Weather |
| 24 | Restaurant, Café (1) | 10 | Restaurant, Café |
| 25 | Restaurant, Café (2) | 10 | Restaurant, Café |
| 26 | Restaurant, Café (3) | 10 | Restaurant, Café |
| 27 | Common Words (4) | 10 | Common Words (2) |
| 28 | Common Words (5) | 10 | Common Words (2) |
| 29 | Common Words (6) | 10 | Common Words (2) |
| 30 | People - Family (1) | 10 | People - Family |
| 31 | People - Family (2) | 10 | People - Family |
| 32 | People - Family (3) | 10 | People - Family |
| 33 | Days, Months, Seasons (1) | 9 | Days, Months, Seasons |
| 34 | Days, Months, Seasons (2) | 10 | Days, Months, Seasons |
| 35 | Days, Months, Seasons (3) | 9 | Days, Months, Seasons |
| 36 | Home - Kitchen (1) | 11 | Home - Kitchen |
| 37 | Home - Kitchen (2) | 11 | Home - Kitchen |
| 38 | Food - Fruit & Vegetables (1) | 9 | Food - Fruit & Vegetables |
| 39 | Food - Fruit & Vegetables (2) | 9 | Food - Fruit & Vegetables |
| 40 | Food - Fruit & Vegetables (3) | 9 | Food - Fruit & Vegetables |
| 41 | Colours | 15 | Colours |
| 42 | Town (1) | 10 | Town |
| 43 | Town (2) | 10 | Town |
| 44 | Town (3) | 10 | Town |
| 45 | Adjectives (1) | 9 | Adjectives |
| 46 | Adjectives (2) | 10 | Adjectives |
| 47 | Adjectives (3) | 10 | Adjectives |
| 48 | Common Words (7) | 10 | Common Words (3) |
| 49 | Common Words (8) | 10 | Common Words (3) |
| 50 | Common Words (9) | 10 | Common Words (3) |
| 51 | People - Friends (1) | 8 | People - Friends |
| 52 | People - Friends (2) | 9 | People - Friends |
| 53 | People - Friends (3) | 9 | People - Friends |
| 54 | Food - Meat & Seafood & Drinks (1) | 10 | Food - Meat & Seafood & Drinks |
| 55 | Food - Meat & Seafood & Drinks (2) | 10 | Food - Meat & Seafood & Drinks |
| 56 | Food - Meat & Seafood & Drinks (3) | 10 | Food - Meat & Seafood & Drinks |
| 57 | Bank, Post Office (1) | 10 | Bank, Post Office |
| 58 | Bank, Post Office (2) | 10 | Bank, Post Office |
| 59 | Bank, Post Office (3) | 10 | Bank, Post Office |
| 60 | Home - Bathroom (1) | 9 | Home - Bathroom |
| 61 | Home - Bathroom (2) | 9 | Home - Bathroom |
| 62 | People - Body (1) | 9 | People - Body |
| 63 | People - Body (2) | 10 | People - Body |
| 64 | People - Body (3) | 10 | People - Body |
| 65 | Transport (1) | 9 | Transport |
| 66 | Transport (2) | 9 | Transport |
| 67 | Transport (3) | 9 | Transport |
| 68 | Shopping (1) | 8 | Shopping |
| 69 | Shopping (2) | 9 | Shopping |
| 70 | Shopping (3) | 9 | Shopping |
| 71 | Verbs (1) | 10 | Verbs |
| 72 | Verbs (2) | 10 | Verbs |
| 73 | Verbs (3) | 10 | Verbs |
| 74 | People - Clothes (1) | 10 | People - Clothes |
| 75 | People - Clothes (2) | 11 | People - Clothes |
| 76 | Common Words (10) | 10 | Common Words (4) |
| 77 | Common Words (11) | 10 | Common Words (4) |
| 78 | Common Words (12) | 10 | Common Words (4) |
| 79 | Home - Bedroom (1) | 8 | Home - Bedroom |
| 80 | Home - Bedroom (2) | 9 | Home - Bedroom |
| 81 | Home - Bedroom (3) | 8 | Home - Bedroom |
| 82 | Travel (1) | 10 | Travel |
| 83 | Travel (2) | 10 | Travel |
| 84 | Travel (3) | 10 | Travel |
| 85 | Expressions (1) | 10 | Expressions (1) |
| 86 | Expressions (2) | 10 | Expressions (1) |
| 87 | Expressions (3) | 10 | Expressions (1) |
| 88 | Animals (1) | 10 | Animals |
| 89 | Animals (2) | 9 | Animals |
| 90 | People - States (1) | 10 | People - States |
| 91 | People - States (2) | 10 | People - States |
| 92 | People - States (3) | 10 | People - States |
| 93 | School (1) | 9 | School |
| 94 | School (2) | 10 | School |
| 95 | School (3) | 10 | School |
| 96 | Shapes, Forms, Quantities (1) | 11 | Shapes, Forms, Quantities |
| 97 | Shapes, Forms, Quantities (2) | 12 | Shapes, Forms, Quantities |
| 98 | Environment (1) | 9 | Environment |
| 99 | Environment (2) | 10 | Environment |
| 100 | Environment (3) | 9 | Environment |
| 101 | Leisure (1) | 9 | Leisure |
| 102 | Leisure (2) | 10 | Leisure |
| 103 | Leisure (3) | 9 | Leisure |
| 104 | Health (1) | 10 | Health |
| 105 | Health (2) | 10 | Health |
| 106 | Health (3) | 10 | Health |

## French Vocab #2 — resulting lessons (98)

"Pooled" = theme combined across its parts then re-split (spacing collapsed to the earliest position).

| # | New title | Words | Pooled |
|---|---|---|---|
| 1 | Adjectives (1) | 9 | ✓ |
| 2 | Adjectives (2) | 10 | ✓ |
| 3 | Adjectives (3) | 10 | ✓ |
| 4 | Animals | 10 | |
| 5 | Bank, Post Office (1) | 8 | |
| 6 | Bank, Post Office (2) | 8 | |
| 7 | Celebrations (1) | 11 | |
| 8 | Celebrations (2) | 11 | |
| 9 | Food - Meat & Seafood & Drinks | 15 | |
| 10 | Geography - Countries (1) | 12 | |
| 11 | Geography - Countries (2) | 11 | |
| 12 | Health | 12 | |
| 13 | Home - Kitchen | 10 | |
| 14 | Leisure - Camping | 14 | |
| 15 | Numbers | 10 | |
| 16 | People (1) | 8 | |
| 17 | People (2) | 8 | |
| 18 | School (1) | 9 | |
| 19 | School (2) | 9 | |
| 20 | Transport (1) | 8 | |
| 21 | Transport (2) | 8 | |
| 22 | Verbs - Work (1) | 9 | |
| 23 | Verbs - Work (2) | 9 | |
| 24 | Environment | 10 | |
| 25 | Home - Bathroom & Bedroom | 10 | |
| 26 | Information Technology (1) | 13 | |
| 27 | Leisure - Cinema | 14 | |
| 28 | People - Attributes | 14 | |
| 29 | Restaurant, Cafe (1) | 12 | |
| 30 | School - In class (1) | 8 | |
| 31 | School - In class (2) | 9 | |
| 32 | Shapes, Forms, Quantities (1) | 10 | ✓ |
| 33 | Shapes, Forms, Quantities (2) | 10 | ✓ |
| 34 | Shapes, Forms, Quantities (3) | 10 | ✓ |
| 35 | Shopping (1) | 11 | ✓ |
| 36 | Shopping (2) | 12 | ✓ |
| 37 | Shopping (3) | 11 | ✓ |
| 38 | Travel (1) | 9 | |
| 39 | Travel (2) | 9 | |
| 40 | Verbs (1) | 10 | ✓ |
| 41 | Verbs (2) | 11 | ✓ |
| 42 | Verbs (3) | 10 | ✓ |
| 43 | Verbs (4) | 11 | ✓ |
| 44 | Verbs (5) | 11 | ✓ |
| 45 | Weather (1) | 9 | ✓ |
| 46 | Weather (2) | 9 | ✓ |
| 47 | Weather (3) | 9 | ✓ |
| 48 | Adverbs | 10 | |
| 49 | Music (1) | 9 | ✓ |
| 50 | Music (2) | 9 | ✓ |
| 51 | Music (3) | 9 | ✓ |
| 52 | People - Body (1) | 8 | |
| 53 | People - Body (2) | 8 | |
| 54 | School - subjects | 13 | |
| 55 | Town | 11 | |
| 56 | Transport - Train | 12 | |
| 57 | When? (1) | 10 | |
| 58 | When? (2) | 11 | |
| 59 | People - Clothes (1) | 9 | ✓ |
| 60 | People - Clothes (2) | 10 | ✓ |
| 61 | People - Clothes (3) | 9 | ✓ |
| 62 | Restaurant, Cafe (2) | 12 | |
| 63 | Town - Buildings | 14 | |
| 64 | TV | 13 | |
| 65 | Work - Careers (1) | 12 | |
| 66 | Work - Careers (2) | 12 | |
| 67 | Home - General (1) | 12 | |
| 68 | Home - General (2) | 12 | |
| 69 | Leisure - Seaside | 15 | |
| 70 | School (3) | 9 | |
| 71 | School (4) | 9 | |
| 72 | Telephone | 15 | |
| 73 | Expressions (1) | 11 | |
| 74 | Expressions (2) | 11 | |
| 75 | Leisure - Sports (1) | 10 | ✓ |
| 76 | Leisure - Sports (2) | 11 | ✓ |
| 77 | Leisure - Sports (3) | 10 | ✓ |
| 78 | Materials | 10 | |
| 79 | People - Family | 9 | |
| 80 | Where? | 14 | |
| 81 | Nationalities (1) | 8 | |
| 82 | Nationalities (2) | 9 | |
| 83 | People - Friends | 14 | |
| 84 | Incidents (1) | 9 | |
| 85 | Incidents (2) | 9 | |
| 86 | Food (1) | 10 | |
| 87 | Food (2) | 10 | |
| 88 | Information Technology (2) | 11 | |
| 89 | People - States (1) | 10 | |
| 90 | People - States (2) | 9 | |
| 91 | Transport - Car (1) | 8 | |
| 92 | Transport - Car (2) | 8 | |
| 93 | Leisure (1) | 8 | |
| 94 | Leisure (2) | 8 | |
| 95 | People - Work (1) | 9 | |
| 96 | People - Work (2) | 10 | |
| 97 | World Events, Problems (1) | 8 | |
| 98 | World Events, Problems (2) | 8 | |

## Sentences rename

Separate from the Vocab split above, the **Sentences** courses were renamed to follow the same numeric convention (migration `rename_french_sentences_numeric_parts`). This is **title-only** — no rows, words, `lesson_words`, or progress were touched.

- **Courses:** French Sentences #1 (`291a279c-…`) + French Sentences #2 (`345a78ff-…`) — 219 lessons, treated as one continuous namespace (#1 then #2).
- **Why:** these were imported pre-split with legacy `A/B/C/D` part-suffixes (e.g. `Common Words (1) A`, `Common Words (1) B`), which never matched the agreed `Theme (n)` numbering used by the Vocab split.
- **Rule applied:**
  - Strip the legacy trailing letter and the parenthesised group, then number continuously per base across #1→#2 — so `Common Words (1) A/B/C` → `Common Words (1)/(2)/(3)`, `Common Words (2) A/B/C` → `(4)/(5)/(6)`, and so on.
  - A generic parent that has named subtopics gets `- General` (e.g. plain `Food` → `Food - General`, alongside `Food - Fruit & Vegetables` etc.). Generalised here: `Food, Leisure, People, School, Town, Transport, Verbs`.
  - `- List …` continuations fold into their base (e.g. `Numbers - List Two` joins the `Numbers` series rather than creating `Numbers - General`).
  - A base with only one resulting lesson keeps its plain name (no number).
- **Verified:** 0 still-lettered titles, 0 duplicate titles.

> The same rename was applied to **German**, **Spanish**, and **Italian** Sentences (see their plan docs; Italian has no plan doc and used a "General + tidy only" variant). Grammar Slammer & Sentence Builder was left untouched.
