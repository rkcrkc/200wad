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

/**
 * Normalize an answer for comparison
 * - Lowercase
 * - Remove punctuation
 * - Trim whitespace
 */
export function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .replace(/[!?.,'"¡¿]/g, "")
    .trim();
}

// ============================================================================
// MISTAKE CALCULATION
// ============================================================================

/**
 * Calculate the number of mistakes in an answer
 * Returns 0 for correct, 1-2 for partial, 3+ for incorrect
 */
export function getMistakeCount(userAnswer: string, correctAnswer: string): number {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);

  if (normalizedUser === normalizedCorrect) {
    return 0;
  }

  return levenshteinDistance(normalizedUser, normalizedCorrect);
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
 */
export function getBestMatch(
  userAnswer: string,
  validAnswers: string[]
): { answer: string; mistakeCount: number } {
  let bestAnswer = validAnswers[0];
  let lowestMistakeCount = getMistakeCount(userAnswer, validAnswers[0]);

  for (let i = 1; i < validAnswers.length; i++) {
    const mistakeCount = getMistakeCount(userAnswer, validAnswers[i]);
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
