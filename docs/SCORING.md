# Test Mode Scoring

Source: `src/lib/utils/scoring.ts`

## Answer Comparison

Answers are compared using **Levenshtein distance** (minimum single-character edits: insertions, deletions, substitutions).

### Normalization (before comparison)

- Trim whitespace
- Lowercase (unless German or Nerves of Steel mode)
- Strip trailing `!` and `?` (not penalized)
- Gender marker `(m)` / `(f)` is stripped and scored separately (see below)
- Internal punctuation (apostrophes, hyphens, etc.) is **preserved and scored**

### Multiple valid answers

If a word has alternate answers, the system picks the best match (lowest mistake count) across all valid answers.

## Mistake Counting

### Standard words

Mistakes = Levenshtein distance between normalized user answer and normalized correct answer.

### Gendered words

Words where the correct answer ends with ` (m)` or ` (f)` are scored in two parts:

1. **Word part** — Levenshtein distance on the word only (gender stripped)
2. **Gender part** — 0 if correct gender provided, 1 if missing or wrong

Gender input is flexible: `m`, `(m)`, `(m`, `f`, `(f)`, `(f` are all accepted.

Total mistakes = word mistakes + gender mistake.

## Grading

| Mistakes | Grade |
|----------|-------|
| 0 | Correct |
| 1-2 | Half-correct |
| 3+ | Incorrect |

## Points

Points depend on both mistakes and clues used:

| | 0 clues | 1 clue | 2 clues |
|---|---------|--------|---------|
| **Correct (0 mistakes)** | 3 | 2 | 1 |
| **1 mistake** | 2 | 1 | 0 |
| **2 mistakes** | 1 | 0 | 0 |
| **3+ mistakes (incorrect)** | 0 | 0 | 0 |

Formula: `points = max(0, (3 - clueLevel) - mistakeCount)`

Max points per word: **always 3**. Clues reduce `points_earned` only — they do **not**
reduce the available maximum. A clued perfect answer is therefore 2/3, not 2/2.

## Score Letters (A-L)

Each word result gets a letter for analytics:

| | 0 clues | 1 clue | 2 clues |
|---|---------|--------|---------|
| **Correct** | A | B | C |
| **1 mistake** | D | E | F |
| **2 mistakes** | G | H | I |
| **3+ (wrong)** | J | K | L |

## Clues

- 2 clues available per word
- Each clue reveals letters in the answer
- Each clue used reduces `points_earned` by 1; max remains 3

## Word Mastery & Streaks

Source: `src/lib/mutations/test.ts`

### Correct streak

- Correct answer (0 mistakes) increments the streak
- Any mistakes reset the streak to 0

### Status progression

| Condition | New Status |
|-----------|-----------|
| 3+ correct in a row | Mastered |
| Correct answer on a not-started word | Learning |
| Wrong answer on a not-started word | Not-started (no promotion) |
| Any attempt on a learning/mastered word | At least Learning |
| Wrong answer on a mastered word | Learning (streak reset demotes) |

### Timestamps

- `learning_at` — set once when word first moves out of not-started (never overwritten)
- `mastered_at` — set once when word first reaches mastered (never overwritten)

## Test Settings

### Nerves of Steel mode

When enabled:
- Punctuation must be correct (not stripped during normalization)
- Case must be correct (not lowercased)
- Gender marker must be typed exactly as `(m)` or `(f)`

### Test Twice mode

- Tests all words, then tests them all again (double pass)
- Set before starting the test (cannot change mid-test)
- Each attempt is scored independently
- Results are combined per word for the final summary

## Feedback Display

| Grade | Icon | Emoji | Border |
|-------|------|-------|--------|
| Correct (with points) | ✅ | 🙌 | Green |
| Correct (0 points) | ✅ | — | Green |
| Half-correct (with points) | ✅ | 🙌 | Amber |
| Half-correct (0 points) | ✅ | — | Amber |
| Incorrect | ❌ | — | Red |

## Traffic Light Dots (Score History)

Per-word historical display showing last 3 test results (oldest left, newest right):

- Green: full points (`pointsEarned === 3` — no clues, no mistakes)
- Yellow: partial points (`pointsEarned > 0`)
- Red: zero points
- Gray: not yet tested

## Study Mode

Study mode does **not** affect mastery or streaks. It only:
- Transitions not-started words to learning status (with `learning_at` timestamp)
- Saves user notes
- Tracks session duration and words viewed
