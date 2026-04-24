/**
 * Scoring utilities for Test Mode
 * Handles answer grading, point calculation, and score letters (A-L)
 */

// ============================================================================
// LEVENSHTEIN DISTANCE
// ============================================================================

/**
 * Calculate Levenshtein (edit) distance between two strings
 * Returns the minimum number of single-character edits required to transform a into b
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

// ============================================================================
// ANSWER NORMALIZATION
// ============================================================================

export interface NormalizeOptions {
  /** Preserve punctuation (nerves of steel mode) */
  strictPunctuation?: boolean;
  /** Preserve case - true for nerves of steel mode or German language */
  preserveCase?: boolean;
}

/** Gender marker pattern including preceding space: " (m)" or " (f)" at end of string */
const GENDER_MARKER = /\s+\((?:m|f)\)\s*$/;

/** Flexible gender marker for user input: space + optional ( + m/f + optional ) */
const FLEXIBLE_GENDER_MARKER = /\s+\(?([mf])\)?\s*$/i;

/**
 * Decorative punctuation that isn't pedagogically meaningful for vocab learning.
 * Stripped anywhere in the answer in non-strict mode.
 * Preserves apostrophes (structural, e.g. Italian "l'aeroporto") and hyphens
 * (structural in compound words). Parentheses are handled by the gender marker.
 */
const DECORATIVE_PUNCT = /[,.;:!?"“”«»…]/g;

/**
 * Build a mapping from normalized string indices to original string indices.
 * Used by getCharacterDiff to correctly map DP results back to original characters.
 */
export function getNormalizedIndexMap(answer: string, options: NormalizeOptions | boolean = {}): number[] {
  if (typeof options === "boolean") {
    options = { strictPunctuation: options, preserveCase: options };
  }

  const trimmed = answer.trim();
  if (!trimmed) return [];
  const trimOffset = answer.length - answer.trimStart().length;

  const { strictPunctuation = false } = options;

  // Find gender marker to know which indices to skip
  const genderMatch = !strictPunctuation ? trimmed.match(GENDER_MARKER) : null;
  const genderStartIdx = genderMatch ? trimmed.length - genderMatch[0].length : -1;

  // Match the decorative punctuation stripped in normalizeAnswer (non-strict mode)
  const isDecorative = (ch: string) => !strictPunctuation && /[,.;:!?"“”«»…]/.test(ch);

  const indexMap: number[] = [];
  for (let i = 0; i < trimmed.length; i++) {
    // Skip gender marker chars (including preceding space)
    if (genderStartIdx >= 0 && i >= genderStartIdx) {
      continue;
    }
    // Skip decorative punctuation — it's stripped during normalization
    if (isDecorative(trimmed[i])) {
      continue;
    }
    indexMap.push(trimOffset + i);
  }
  return indexMap;
}

/** Languages that require case-sensitive comparison (e.g., German capitalizes nouns) */
const CASE_SENSITIVE_LANGUAGES = ["de", "german"];

/**
 * Check if a language requires case-sensitive comparison
 */
export function languageRequiresCase(languageCode?: string | null): boolean {
  if (!languageCode) return false;
  return CASE_SENSITIVE_LANGUAGES.includes(languageCode.toLowerCase());
}

/**
 * Normalize an answer for comparison
 * - Strip gender marker and its preceding space, e.g. " (m)" at end
 * - Strip decorative punctuation (, . ; : ! ? " “ ” « » …) anywhere in the answer
 *   so users aren't penalized for typographic slips
 * - Preserve apostrophes and hyphens (structurally meaningful in many languages)
 * - Lowercase (unless preserveCase is true - for German or "nerves of steel")
 * - Trim whitespace
 * - In nerves of steel mode (strictPunctuation), everything above is required exactly
 */
export function normalizeAnswer(answer: string, options: NormalizeOptions | boolean = {}): string {
  // Handle legacy boolean parameter (strictMode = both punctuation and case)
  if (typeof options === "boolean") {
    options = { strictPunctuation: options, preserveCase: options };
  }

  const { strictPunctuation = false, preserveCase = false } = options;

  let normalized = answer.trim();
  // Strip gender marker and decorative punctuation so they don't affect edit distance.
  // Use trimEnd only (not trim) so leading-whitespace cases stay aligned with
  // getNormalizedIndexMap, which emits indices for every non-stripped char.
  if (!strictPunctuation) {
    normalized = normalized
      .replace(GENDER_MARKER, "")
      .replace(DECORATIVE_PUNCT, "")
      .trimEnd();
  }
  if (!preserveCase) {
    normalized = normalized.toLowerCase();
  }
  return normalized;
}

// ============================================================================
// MISTAKE CALCULATION
// ============================================================================

/**
 * Calculate the number of mistakes in an answer
 * Returns 0 for correct, 1-2 for partial, 3+ for incorrect
 *
 * For gendered words (correct answer ends with " (m)" or " (f)"):
 * - Word part and gender are scored separately
 * - Gender accepts flexible formats: m, (m), (m, f, (f), (f — with or without brackets
 * - Missing or wrong gender = 1 extra mistake
 */
export function getMistakeCount(
  userAnswer: string,
  correctAnswer: string,
  options: NormalizeOptions | boolean = {}
): number {
  if (typeof options === "boolean") {
    options = { strictPunctuation: options, preserveCase: options };
  }

  const { strictPunctuation = false, preserveCase = false } = options;

  // Check if correct answer has a gender marker
  const correctTrimmed = correctAnswer.trim();
  const correctGenderMatch = !strictPunctuation
    ? correctTrimmed.match(/\s+\(([mf])\)\s*$/)
    : null;

  if (correctGenderMatch) {
    // GENDERED WORD: score word and gender separately
    const expectedGender = correctGenderMatch[1];

    // Strip gender from correct answer
    const correctWordOnly = correctTrimmed.replace(GENDER_MARKER, "");

    // Try to extract gender from user answer (flexible pattern)
    const userTrimmed = userAnswer.trim();
    const userFlexMatch = userTrimmed.match(FLEXIBLE_GENDER_MARKER);

    let userWordOnly: string;
    let userGender: string | null = null;

    if (userFlexMatch && userFlexMatch.index !== undefined) {
      userGender = userFlexMatch[1].toLowerCase();
      userWordOnly = userTrimmed.slice(0, userFlexMatch.index);
    } else {
      userWordOnly = userTrimmed;
    }

    // Normalize word parts
    let normalizedUserWord = userWordOnly;
    let normalizedCorrectWord = correctWordOnly;
    if (!preserveCase) {
      normalizedUserWord = normalizedUserWord.toLowerCase();
      normalizedCorrectWord = normalizedCorrectWord.toLowerCase();
    }

    // Word mistakes (edit distance on word part only)
    const wordMistakes =
      normalizedUserWord === normalizedCorrectWord
        ? 0
        : levenshteinDistance(normalizedUserWord, normalizedCorrectWord);

    // Gender mistake: missing or wrong = 1
    const genderMistake = !userGender || userGender !== expectedGender ? 1 : 0;

    return wordMistakes + genderMistake;
  }

  // NON-GENDERED: standard comparison
  const normalizedUser = normalizeAnswer(userAnswer, options);
  const normalizedCorrect = normalizeAnswer(correctAnswer, options);

  if (normalizedUser === normalizedCorrect) {
    return 0;
  }

  return levenshteinDistance(normalizedUser, normalizedCorrect);
}

/**
 * Canonicalize user gender format to match DB format: " (m)" or " (f)"
 * Only applies when the correct answer has a gender marker.
 * Used before passing to getCharacterDiff so the diff display is clean.
 */
export function canonicalizeUserGender(
  userAnswer: string,
  correctAnswer: string,
  options: NormalizeOptions | boolean = {}
): string {
  if (typeof options === "boolean") {
    options = { strictPunctuation: options, preserveCase: options };
  }
  if (options.strictPunctuation) return userAnswer;

  const correctTrimmed = correctAnswer.trim();
  if (!GENDER_MARKER.test(correctTrimmed)) return userAnswer;

  const userTrimmed = userAnswer.trim();
  const userFlexMatch = userTrimmed.match(FLEXIBLE_GENDER_MARKER);

  if (userFlexMatch && userFlexMatch.index !== undefined) {
    const gender = userFlexMatch[1].toLowerCase();
    return userTrimmed.slice(0, userFlexMatch.index) + ` (${gender})`;
  }

  return userAnswer;
}

// ============================================================================
// MULTIPLE VALID ANSWERS
// ============================================================================

/**
 * Check if the user's answer exactly matches any of the valid answers (for Study Mode)
 * Returns true if normalized answer matches any valid answer exactly
 */
export function isExactMatch(userAnswer: string, validAnswers: string[]): boolean {
  const normalizedUser = normalizeAnswer(userAnswer);
  return validAnswers.some(
    (validAnswer) => normalizeAnswer(validAnswer) === normalizedUser
  );
}

/**
 * Find the best matching answer from a list of valid answers (for Test Mode)
 * Returns the answer with the lowest mistake count
 * @param options - Normalization options (strictPunctuation, preserveCase)
 */
export function getBestMatch(
  userAnswer: string,
  validAnswers: string[],
  options: NormalizeOptions | boolean = {}
): { answer: string; mistakeCount: number } {
  let bestAnswer = validAnswers[0];
  let lowestMistakeCount = getMistakeCount(userAnswer, validAnswers[0], options);

  for (let i = 1; i < validAnswers.length; i++) {
    const mistakeCount = getMistakeCount(userAnswer, validAnswers[i], options);
    if (mistakeCount < lowestMistakeCount) {
      lowestMistakeCount = mistakeCount;
      bestAnswer = validAnswers[i];
    }
  }

  return { answer: bestAnswer, mistakeCount: lowestMistakeCount };
}

// ============================================================================
// ANSWER GRADING
// ============================================================================

export type AnswerGrade = "correct" | "half-correct" | "incorrect";

/**
 * Get the grade for an answer based on mistake count
 * - 0 mistakes = correct
 * - 1-2 mistakes = half-correct
 * - 3+ mistakes = incorrect
 */
export function getAnswerGrade(mistakeCount: number): AnswerGrade {
  if (mistakeCount === 0) return "correct";
  if (mistakeCount <= 2) return "half-correct";
  return "incorrect";
}

// ============================================================================
// POINT CALCULATION
// ============================================================================

/**
 * Calculate points earned based on clue level and mistake count
 * 
 * Scoring Matrix:
 * | Clues | Correct | 1 mistake | 2 mistakes | 3+ (incorrect) |
 * |-------|---------|-----------|------------|----------------|
 * | 0     | 3       | 2         | 1          | 0              |
 * | 1     | 2       | 1         | 0          | 0              |
 * | 2     | 1       | 0         | 0          | 0              |
 */
export function calculatePoints(clueLevel: 0 | 1 | 2, mistakeCount: number): number {
  // Max points based on clue level
  const maxPoints = 3 - clueLevel;

  // Points lost based on mistakes
  const pointsLost = Math.min(mistakeCount, maxPoints);

  return Math.max(0, maxPoints - pointsLost);
}

/**
 * Get max possible points for a given clue level
 */
export function getMaxPoints(clueLevel: 0 | 1 | 2): number {
  return 3 - clueLevel;
}

// ============================================================================
// SCORE LETTERS (A-L)
// ============================================================================

export type ScoreLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";

/**
 * Get the score letter (A-L) based on clue level and mistake count
 * 
 * Matrix:
 * |          | 0 clues | 1 clue | 2 clues |
 * |----------|---------|--------|---------|
 * | Correct  | A       | B      | C       |
 * | 1 error  | D       | E      | F       |
 * | 2 errors | G       | H      | I       |
 * | Wrong    | J       | K      | L       |
 */
export function getScoreLetter(clueLevel: 0 | 1 | 2, mistakeCount: number): ScoreLetter {
  // Clamp mistake count to 0-3+ range
  const mistakeRow = Math.min(mistakeCount, 3);
  
  // Calculate letter index (0-11)
  // Row: 0=correct, 1=1 mistake, 2=2 mistakes, 3=3+ mistakes (wrong)
  // Col: 0=0 clues, 1=1 clue, 2=2 clues
  const letterIndex = (mistakeRow === 0 ? 0 : mistakeRow) * 3 + clueLevel;
  
  // Map to letter A-L
  // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11
  const letters: ScoreLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  
  // Correct calculation:
  // Correct (0 mistakes): row 0 -> indices 0,1,2 -> A,B,C
  // 1 mistake: row 1 -> indices 3,4,5 -> D,E,F
  // 2 mistakes: row 2 -> indices 6,7,8 -> G,H,I
  // 3+ mistakes (wrong): row 3 -> indices 9,10,11 -> J,K,L
  
  let row: number;
  if (mistakeCount === 0) {
    row = 0;
  } else if (mistakeCount === 1) {
    row = 1;
  } else if (mistakeCount === 2) {
    row = 2;
  } else {
    row = 3;
  }
  
  const index = row * 3 + clueLevel;
  return letters[index];
}

/**
 * Get a human-readable description for a score letter
 */
export function getScoreLetterDescription(letter: ScoreLetter): string {
  const descriptions: Record<ScoreLetter, string> = {
    A: "Right first time",
    B: "Right with 1 clue",
    C: "Right with 2 clues",
    D: "1 mistake, no clues",
    E: "1 mistake, 1 clue",
    F: "1 mistake, 2 clues",
    G: "2 mistakes, no clues",
    H: "2 mistakes, 1 clue",
    I: "2 mistakes, 2 clues",
    J: "Wrong, no clues",
    K: "Wrong, 1 clue",
    L: "Wrong, 2 clues",
  };
  return descriptions[letter];
}

// ============================================================================
// SCORE PERCENTAGE
// ============================================================================

/**
 * Calculate score percentage from points earned and max points
 */
export function calculateScorePercent(pointsEarned: number, maxPoints: number): number {
  if (maxPoints === 0) return 0;
  return Math.round((pointsEarned / maxPoints) * 100);
}

// ============================================================================
// CHARACTER-LEVEL DIFF
// ============================================================================

/**
 * Compute character-level diff between user answer and correct answer
 * Returns array of { char, isCorrect } for rendering
 */
export function getCharacterDiff(
  userAnswer: string,
  correctAnswer: string,
  options: NormalizeOptions = {}
): Array<{ char: string; isCorrect: boolean }> {
  const normalizedUser = normalizeAnswer(userAnswer, options);
  const normalizedCorrect = normalizeAnswer(correctAnswer, options);

  // Map from normalized indices back to original string indices
  // This is needed because normalization can remove characters (e.g., punctuation),
  // causing a length mismatch between the normalized and original strings.
  const userIndexMap = getNormalizedIndexMap(userAnswer, options);

  // Use dynamic programming to find optimal alignment
  const m = normalizedUser.length;
  const n = normalizedCorrect.length;

  // dp[i][j] = edit distance between normalizedUser[0..i-1] and normalizedCorrect[0..j-1]
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (normalizedUser[i - 1] === normalizedCorrect[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find which characters in user answer are correct
  // Track which original indices were used and whether they're correct
  const diffByOrigIndex = new Map<number, boolean>();
  let i = m, j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normalizedUser[i - 1] === normalizedCorrect[j - 1]) {
      diffByOrigIndex.set(userIndexMap[i - 1], true);
      i--;
      j--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] <= dp[i][j - 1] && dp[i - 1][j] <= dp[i - 1][j - 1])) {
      diffByOrigIndex.set(userIndexMap[i - 1], false);
      i--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j])) {
      j--;
    } else {
      diffByOrigIndex.set(userIndexMap[i - 1], false);
      i--;
      j--;
    }
  }

  // Build final result: iterate the original (trimmed) string so stripped
  // characters (e.g., apostrophes) are shown and correctly positioned
  const trimmed = userAnswer.trim();
  const trimOffset = userAnswer.length - userAnswer.trimStart().length;
  const result: Array<{ char: string; isCorrect: boolean }> = [];

  for (let idx = 0; idx < trimmed.length; idx++) {
    const origIdx = trimOffset + idx;
    if (diffByOrigIndex.has(origIdx)) {
      result.push({ char: trimmed[idx], isCorrect: diffByOrigIndex.get(origIdx)! });
    } else {
      // Stripped character (e.g., punctuation) — show as correct since it was ignored
      result.push({ char: trimmed[idx], isCorrect: true });
    }
  }

  return result;
}

// ============================================================================
// TEST RESULT TYPES
// ============================================================================

export interface WordTestResult {
  wordId: string;
  userAnswer: string;
  correctAnswer: string;
  clueLevel: 0 | 1 | 2;
  mistakeCount: number;
  pointsEarned: number;
  maxPoints: number;
  scoreLetter: ScoreLetter;
  grade: AnswerGrade;
}

/**
 * Calculate full test result for a single word
 */
export function calculateWordTestResult(
  wordId: string,
  userAnswer: string,
  correctAnswer: string,
  clueLevel: 0 | 1 | 2
): WordTestResult {
  const mistakeCount = getMistakeCount(userAnswer, correctAnswer);
  const pointsEarned = calculatePoints(clueLevel, mistakeCount);
  const maxPoints = getMaxPoints(clueLevel);
  const scoreLetter = getScoreLetter(clueLevel, mistakeCount);
  const grade = getAnswerGrade(mistakeCount);

  return {
    wordId,
    userAnswer,
    correctAnswer,
    clueLevel,
    mistakeCount,
    pointsEarned,
    maxPoints,
    scoreLetter,
    grade,
  };
}
