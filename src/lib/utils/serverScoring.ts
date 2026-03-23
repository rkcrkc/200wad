import { getBestMatch, calculatePoints, type NormalizeOptions } from "./scoring";

export interface ServerScoringResult {
  wordId: string;
  serverMistakeCount: number;
  serverPointsEarned: number;
  serverMaxPoints: number;
  clientMatchesServer: boolean;
}

/**
 * Re-score a single question server-side
 */
export function serverScoreQuestion(
  userAnswer: string,
  validAnswers: string[],
  clueLevel: 0 | 1 | 2,
  clientPointsEarned: number,
  options: NormalizeOptions = {}
): { pointsEarned: number; mistakeCount: number; matches: boolean } {
  const { mistakeCount } = getBestMatch(userAnswer, validAnswers, options);
  const pointsEarned = calculatePoints(clueLevel, mistakeCount);
  return {
    pointsEarned,
    mistakeCount,
    matches: pointsEarned === clientPointsEarned,
  };
}

/**
 * Re-score all questions server-side and return corrections
 */
export function serverScoreAllQuestions(
  questions: Array<{
    wordId: string;
    userAnswer: string;
    correctAnswers: string[]; // headword + alternate_answers
    clueLevel: 0 | 1 | 2;
    clientPointsEarned: number;
    clientMaxPoints: number;
  }>,
  options: NormalizeOptions = {}
): {
  results: ServerScoringResult[];
  totalPointsEarned: number;
  totalMaxPoints: number;
  hasMismatches: boolean;
} {
  let totalPointsEarned = 0;
  let totalMaxPoints = 0;
  let hasMismatches = false;

  const results = questions.map((q) => {
    const { pointsEarned, mistakeCount, matches } = serverScoreQuestion(
      q.userAnswer,
      q.correctAnswers,
      q.clueLevel,
      q.clientPointsEarned,
      options
    );
    const maxPoints = 3 - q.clueLevel;
    totalPointsEarned += pointsEarned;
    totalMaxPoints += maxPoints;
    if (!matches) hasMismatches = true;

    return {
      wordId: q.wordId,
      serverMistakeCount: mistakeCount,
      serverPointsEarned: pointsEarned,
      serverMaxPoints: maxPoints,
      clientMatchesServer: matches,
    };
  });

  return { results, totalPointsEarned, totalMaxPoints, hasMismatches };
}
