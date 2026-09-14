# German Lesson Split Plan

Status: **APPLIED.** Both migrations have run (`split_german_vocab_1_lessons`, `split_german_vocab_2_lessons`) and were verified: lesson counts (110 / 101), `courses.total_lessons` updated, contiguous `(course_id, number)` 1…N, `word_count` recomputed from `lesson_words`, word totals conserved (1038 / 1009), no orphaned `lesson_words`. The 9 V2 non-anchor pooled lessons that were dissolved had **0** `user_lesson_progress` / `study_sessions` / `test_sessions` rows, so no user data was affected. A later refinement (`rebalance_german_vocab_1_even_split`, `rebalance_german_vocab_2_even_split`) re-balanced every split group to the **even-split rule** below — each lesson now differs from its nearest sibling by at most 1 word — without changing lesson counts, numbering, or which words sit in which theme. This applies the same split used for French (see `FRENCH_LESSON_SPLIT_PLAN.md`) to German **Vocab #1** and **Vocab #2**, with two German-specific rules the user chose: **across-course continuous numbering** and a **`- General` suffix** on generic parent lessons. The tables below reflect the final, re-balanced word counts (verified: word counts conserved, every chunk 8–12, no group dropped).

## Goal

Break the large German vocab lessons (up to 32 words) into smaller ~10-word lessons, matching the French treatment. Word-level mastery is keyed to **words**, so splitting lessons does not affect any user progress.

## Locked decisions

- **Scope:** German **Vocab #1** (`d5caa8f8-…`) and **Vocab #2** (`2c7d302d-…`) only. The Sentences **titles** were later renamed separately (see "Sentences rename" at the end of this doc) — words/rows/progress unaffected.
- **Split threshold:** only lessons with **≥16 words** are split (16 = smallest size yielding two ≥8 halves). Lessons of **8–15 words are left whole** unless they belong to a pooled series.
- **Chunk count:** `k = round(words / 10)` (half-up), per pooled-theme total or per lesson.
- **Chunk sizes — even split (primary), gentle variety (secondary):** chunks within a group are sized **as evenly as possible**, so each lesson differs from its nearest sibling by **at most 1 word**. For `k` chunks totalling `T`: `T mod k` chunks get `⌈T/k⌉` words and the rest get `⌊T/k⌋` (e.g. `28 → 9/10/9`, `27 → 9/9/9`, `30 → 10/10/10`, `52 → 11/11/10/10/10`). All split chunks stay inside the **8–12** band; left-whole singletons remain 8–15. *Where* the slightly-larger `(+1)` chunks sit is the **secondary** consideration: they are placed at the positions that were largest under the earlier variable-reward draft, so the gentle **non-monotonic ‘peak’** shape is preserved (e.g. `28 → 9/10/9`, peak in the middle) rather than an ascending ramp. (This replaces the earlier "variable rewards" rule; the user prioritised evenness — max ±1 between siblings — over XP variety.)
- **Word order:** preserved exactly (positional split by existing `lesson_words.sort_order`). For a pooled theme, words run part 1 → part 2 → … in their original order.
- **Pooling — "clean same-topic wins" (German V2):** five exact-base multi-part series are combined then re-split, so 13–15 stragglers disappear:
  - `Adjectives (4–7)` 61w → 6, `Verbs (2–5)` 52w → 5, `School (2)+(3)` 30w → 3, `Leisure (1)+(2)` 26w → 3, `People - States (2)+(3)` 25w → 3.
  - A pooled theme anchors at its **earliest** part's position; later parts' slots close up.
  - **`Important Words (1–5)` is NOT pooled** — those are difficulty tiers (like French `Common Words`); each splits in place and stays spread through the course.
  - **Subtopics stay separate bases** — e.g. `Food - Fruit`, `Home - Bedroom`, `Health - Doctor` are independent of their parent and of each other.
- **Across-course continuous numbering (per base):** each base theme is numbered `(1)…(N)` **continuously across both courses** in course-then-position order. So `Adjectives` runs `(1)–(6)` in Vocab #1 and continues `(7)–(12)` in Vocab #2; `Verbs` runs `(1)–(3)` then `(4)–(8)`; `Important Words` runs `(1)–(15)` across Vocab #1. A base that yields only one lesson keeps its plain name.
- **`- General` suffix on generic parents:** where a plain parent lesson sits beside named subtopics, it is renamed to `… - General` for a consistent suffixed look (no reordering, just the title). Applies to `Food`, `Health`, `Town`, `School`, `Sports`. (`People` is left plain because a distinct `People - General` already exists; `Home` already uses `Home - General`.)
- **free_lessons:** unchanged — stays **10** on both courses.

## Impact

| Course | Current lessons | New total | Words (unchanged) |
|---|---|---|---|
| German Vocab #1 | 39 | **110** | 1038 |
| German Vocab #2 | 70 | **101** | 1009 |

The `lessons.word_count` column was **stale** for two lessons (`Important Words (5)` showed 14 vs real 28; `People - States (3)` showed 7 vs real 12). The migration recomputes `word_count` from `lesson_words`, correcting both.

## Notes for review

1. **Generic parents renamed `- General`:** `Food → Food - General` (V1 (1)–(3), V2 (4)–(5)), `Health → Health - General`, `Town → Town - General`, `School → School - General` (pooled in V2), `Sports → Sports - General`. Their named subtopics (`Food - Fruit`, `Food - Vegetables`, `Food - Sweet`, `Town - Buildings`, `School - Subjects`, `Sports - kinds`, `Health - Doctor`, `Health - Illnesses`) are untouched and remain separate bases.
2. **12–15 word lessons left whole** (singletons with no exact-base sibling to pool): V2 `Home - Bathroom` 14, `Home - Bedroom` 14, `Home - Garden` 14, `Home - Living Room` 11, `Home - Kitchen (3)` 12, `Road` 12, `Celebrations` 13, `Clothes` 13, `Weather (4)` 13, `Numbers List Two` 12, `Conjunctions, Prepositions & Negatives` 15, `Travel` 13, `Work -Training` 12, `Sports - kinds` 12, `Shapes, Forms, Quantities (3)` 13, `Shops` 15, `People - Friends (3)` 14, `People - Family (4)` 12.
3. **Important Words stays spread** at increasing difficulty: chunks sit at their parents' positions (1–3, 30–32, 54–56, 83–85, 104–106) so easier sets always precede harder ones.

## Migration mechanics (same pattern as French, one `apply_migration` per course)

- Reuse each group's **anchor** original lesson row/id for its **first** chunk (preserves `id`, `is_published`, `legacy_lesson_id`, and existing session/progress FKs). Pooled themes anchor at the earliest part; other parts' rows are deleted after their words are repointed.
- Insert new `lessons` rows for chunks 2…N (`is_published` copied from the anchor).
- Repoint moved words via `lesson_words.lesson_id`, keeping relative `sort_order` (pooled themes concatenate part 1 → part 2 → …).
- Recompute `lessons.word_count`; renumber `number` + `sort_order` 1…N per course (shift to a high temp offset first to dodge the `(course_id, number)` unique index).
- Update `courses.total_lessons` (110 / 101).

## Verification after running

- `courses.total_lessons` = 110 / 101; lesson row counts match.
- `SUM(lessons.word_count)` per course unchanged (1038 / 1009); every split chunk 8–12, every left-whole singleton 8–15.
- No orphaned `lesson_words`; `(course_id, number)` contiguous 1…N with no gaps/dupes.

---

## German Vocab #1 — resulting lessons (110)

| # | New title | Words |
|---|---|---|
| 1 | Important Words (1) | 9 |
| 2 | Important Words (2) | 9 |
| 3 | Important Words (3) | 9 |
| 4 | People (1) | 8 |
| 5 | People (2) | 9 |
| 6 | People (3) | 9 |
| 7 | Home - General (1) | 8 |
| 8 | Home - General (2) | 9 |
| 9 | Home - General (3) | 9 |
| 10 | Adjectives (1) | 12 |
| 11 | Adjectives (2) | 12 |
| 12 | Food - General (1) | 9 |
| 13 | Food - General (2) | 10 |
| 14 | Food - General (3) | 10 |
| 15 | Numbers List One (1) | 10 |
| 16 | Numbers List One (2) | 10 |
| 17 | Numbers List One (3) | 10 |
| 18 | Time (1) | 8 |
| 19 | Time (2) | 9 |
| 20 | Time (3) | 9 |
| 21 | Weather (1) | 9 |
| 22 | Weather (2) | 10 |
| 23 | Weather (3) | 9 |
| 24 | Health - General (1) | 9 |
| 25 | Health - General (2) | 10 |
| 26 | Health - General (3) | 10 |
| 27 | Restaurant, Café (1) | 9 |
| 28 | Restaurant, Café (2) | 10 |
| 29 | Restaurant, Café (3) | 9 |
| 30 | Important Words (4) | 9 |
| 31 | Important Words (5) | 9 |
| 32 | Important Words (6) | 9 |
| 33 | People - Family (1) | 9 |
| 34 | People - Family (2) | 9 |
| 35 | People - Family (3) | 9 |
| 36 | Days, Months, Seasons (1) | 10 |
| 37 | Days, Months, Seasons (2) | 10 |
| 38 | Days, Months, Seasons (3) | 10 |
| 39 | Home - Kitchen (1) | 12 |
| 40 | Home - Kitchen (2) | 11 |
| 41 | School - General (1) | 9 |
| 42 | School - General (2) | 10 |
| 43 | School - General (3) | 9 |
| 44 | Food - Fruit & Vegetables (1) | 9 |
| 45 | Food - Fruit & Vegetables (2) | 10 |
| 46 | Food - Fruit & Vegetables (3) | 10 |
| 47 | Colours (1) | 10 |
| 48 | Colours (2) | 11 |
| 49 | Town - General (1) | 9 |
| 50 | Town - General (2) | 9 |
| 51 | Town - General (3) | 9 |
| 52 | Adjectives (3) | 12 |
| 53 | Adjectives (4) | 11 |
| 54 | Important Words (7) | 8 |
| 55 | Important Words (8) | 9 |
| 56 | Important Words (9) | 9 |
| 57 | People - Friends (1) | 10 |
| 58 | People - Friends (2) | 11 |
| 59 | Food - Meat & Seafood & Drinks (1) | 9 |
| 60 | Food - Meat & Seafood & Drinks (2) | 10 |
| 61 | Food - Meat & Seafood & Drinks (3) | 10 |
| 62 | Bank, Post Office (1) | 9 |
| 63 | Bank, Post Office (2) | 9 |
| 64 | Bank, Post Office (3) | 9 |
| 65 | Home - Bathroom & Bedroom (1) | 9 |
| 66 | Home - Bathroom & Bedroom (2) | 10 |
| 67 | Home - Bathroom & Bedroom (3) | 10 |
| 68 | People - Body (1) | 10 |
| 69 | People - Body (2) | 10 |
| 70 | People - Body (3) | 10 |
| 71 | Transport & Travel (1) | 9 |
| 72 | Transport & Travel (2) | 10 |
| 73 | Transport & Travel (3) | 10 |
| 74 | Shopping (1) | 9 |
| 75 | Shopping (2) | 10 |
| 76 | Shopping (3) | 9 |
| 77 | Verbs (1) | 10 |
| 78 | Verbs (2) | 11 |
| 79 | Verbs (3) | 11 |
| 80 | People - Clothes (1) | 9 |
| 81 | People - Clothes (2) | 10 |
| 82 | People - Clothes (3) | 9 |
| 83 | Important Words (10) | 8 |
| 84 | Important Words (11) | 9 |
| 85 | Important Words (12) | 9 |
| 86 | Where (1) | 8 |
| 87 | Where (2) | 9 |
| 88 | Where (3) | 9 |
| 89 | Environment (1) | 8 |
| 90 | Environment (2) | 9 |
| 91 | Environment (3) | 8 |
| 92 | People - General (1) | 8 |
| 93 | People - General (2) | 9 |
| 94 | People - General (3) | 8 |
| 95 | Expressions (1) | 9 |
| 96 | Expressions (2) | 10 |
| 97 | Expressions (3) | 10 |
| 98 | Animals (1) | 8 |
| 99 | Animals (2) | 9 |
| 100 | Animals (3) | 9 |
| 101 | People - States (1) | 8 |
| 102 | People - States (2) | 9 |
| 103 | People - States (3) | 9 |
| 104 | Important Words (13) | 9 |
| 105 | Important Words (14) | 10 |
| 106 | Important Words (15) | 9 |
| 107 | Shapes, Forms, Quantities (1) | 11 |
| 108 | Shapes, Forms, Quantities (2) | 11 |
| 109 | Adjectives (5) | 9 |
| 110 | Adjectives (6) | 9 |

## German Vocab #2 — resulting lessons (101)

"Pooled" = theme combined across its parts then re-split (spacing collapsed to the earliest position).

| # | New title | Words | Pooled |
|---|---|---|---|
| 1 | Adjectives (7) | 10 | ✓ |
| 2 | Adjectives (8) | 11 | ✓ |
| 3 | Adjectives (9) | 10 | ✓ |
| 4 | Adjectives (10) | 10 | ✓ |
| 5 | Adjectives (11) | 10 | ✓ |
| 6 | Adjectives (12) | 10 | ✓ |
| 7 | People - States (4) | 8 | ✓ |
| 8 | People - States (5) | 9 | ✓ |
| 9 | People - States (6) | 8 | ✓ |
| 10 | Home - Bathroom | 14 | |
| 11 | Leisure (1) | 8 | ✓ |
| 12 | Leisure (2) | 9 | ✓ |
| 13 | Leisure (3) | 9 | ✓ |
| 14 | Food - General (4) | 8 | |
| 15 | Food - General (5) | 8 | |
| 16 | Health - General (4) | 10 | |
| 17 | Health - General (5) | 9 | |
| 18 | School - Subjects | 11 | |
| 19 | Verbs (4) | 10 | ✓ |
| 20 | Verbs (5) | 11 | ✓ |
| 21 | Verbs (6) | 10 | ✓ |
| 22 | Verbs (7) | 11 | ✓ |
| 23 | Verbs (8) | 10 | ✓ |
| 24 | Countries - Europe | 10 | |
| 25 | Shopping (4) | 10 | |
| 26 | Shopping (5) | 10 | |
| 27 | Cars (1) | 8 | |
| 28 | Cars (2) | 8 | |
| 29 | Railways | 9 | |
| 30 | Animals (4) | 8 | |
| 31 | Animals (5) | 8 | |
| 32 | Bank, Post Office (4) | 10 | |
| 33 | Bank, Post Office (5) | 9 | |
| 34 | People - Body (4) | 10 | |
| 35 | People - Body (5) | 11 | |
| 36 | Home - Bedroom | 14 | |
| 37 | Hotel | 11 | |
| 38 | Food - Fruit | 11 | |
| 39 | Expressions (4) | 8 | |
| 40 | Expressions (5) | 8 | |
| 41 | School - General (4) | 10 | ✓ |
| 42 | School - General (5) | 10 | ✓ |
| 43 | School - General (6) | 10 | ✓ |
| 44 | Adverbs (1) | 8 | |
| 45 | Adverbs (2) | 8 | |
| 46 | Environment (4) | 10 | |
| 47 | Environment (5) | 10 | |
| 48 | Home - Garden | 14 | |
| 49 | Leisure - Holidays (1) | 8 | |
| 50 | Leisure - Holidays (2) | 8 | |
| 51 | Road | 12 | |
| 52 | Health - Doctor | 11 | |
| 53 | Careers (1) | 10 | |
| 54 | Careers (2) | 9 | |
| 55 | People - Family (4) | 12 | |
| 56 | Shops | 15 | |
| 57 | Sports - General (1) | 9 | |
| 58 | Sports - General (2) | 10 | |
| 59 | Food - Meat & Seafood & Drinks (4) | 9 | |
| 60 | Food - Meat & Seafood & Drinks (5) | 8 | |
| 61 | Sundry | 11 | |
| 62 | Nationalities (1) | 8 | |
| 63 | Nationalities (2) | 9 | |
| 64 | Home - General (4) | 10 | |
| 65 | Home - General (5) | 9 | |
| 66 | Celebrations | 13 | |
| 67 | Town - General (4) | 9 | |
| 68 | Town - General (5) | 9 | |
| 69 | Time (4) | 9 | |
| 70 | Time (5) | 8 | |
| 71 | Materials (1) | 9 | |
| 72 | Materials (2) | 9 | |
| 73 | People - Friends (3) | 14 | |
| 74 | Home - Housework (1) | 9 | |
| 75 | Home - Housework (2) | 9 | |
| 76 | Clothes | 13 | |
| 77 | Food - Sweet | 11 | |
| 78 | Weather (4) | 13 | |
| 79 | Work (1) | 10 | |
| 80 | Work (2) | 10 | |
| 81 | Society (1) | 8 | |
| 82 | Society (2) | 8 | |
| 83 | TV | 11 | |
| 84 | Town - Buildings | 10 | |
| 85 | Health - Illnesses | 9 | |
| 86 | Numbers List Two | 12 | |
| 87 | Conjunctions, Prepositions & Negatives | 15 | |
| 88 | People (4) | 10 | |
| 89 | People (5) | 10 | |
| 90 | Home - Kitchen (3) | 12 | |
| 91 | Music (1) | 9 | |
| 92 | Music (2) | 8 | |
| 93 | Food - Vegetables (1) | 8 | |
| 94 | Food - Vegetables (2) | 8 | |
| 95 | Travel | 13 | |
| 96 | Work -Training | 12 | |
| 97 | Home - Living Room | 11 | |
| 98 | Sports - kinds | 12 | |
| 99 | Transport | 10 | |
| 100 | Where (4) | 10 | |
| 101 | Shapes, Forms, Quantities (3) | 13 | |

## Sentences rename

Separate from the Vocab split above, the **Sentences** courses were renamed to follow the same numeric convention (migration `rename_german_sentences_numeric_parts`). This is **title-only** — no rows, words, `lesson_words`, or progress were touched.

- **Courses:** German Sentences (`07b768cc-…`) + German Sentences 2 (`7fe13159-…`) — 287 lessons, treated as one continuous namespace (#1 then #2).
- **Why:** imported pre-split with legacy `A/B/C/D` part-suffixes that never matched the agreed `Theme (n)` numbering.
- **Rule applied:**
  - Strip the legacy trailing letter and the parenthesised group, then number continuously per base across #1→#2 (e.g. `Common Words (1) A/B/C` → `Common Words (1)/(2)/(3)`).
  - A generic parent that has named subtopics gets `- General`. Generalised here: `Food, Health, Leisure, School, Sports, Town`.
  - **Guard:** where a `- General` base was **already** imported (German has a pre-existing `People - General`), the plain parent (`People`) is left as its own series rather than merged in. Result: `People (1)…(6)` and `People - General (1)…(3)` coexist as distinct series.
  - `- List …` continuations fold into their base; a base with only one resulting lesson keeps its plain name.
- **Verified:** 0 still-lettered titles, 0 duplicate titles.

> The same rename was applied to **French**, **Spanish**, and **Italian** Sentences (Italian has no plan doc and used a "General + tidy only" variant). Grammar Slammer & Sentence Builder was left untouched.
