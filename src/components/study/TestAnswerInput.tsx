"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getBestMatch,
  calculatePoints,
  getMaxPoints,
  getAnswerGrade,
  getScoreLetter,
  calculateScorePercent,
  normalizeAnswer,
  getNormalizedIndexMap,
  languageRequiresCase,
  type AnswerGrade,
  type ScoreLetter,
  type NormalizeOptions,
} from "@/lib/utils/scoring";

/**
 * Compute character-level diff between user answer and correct answer
 * Returns array of { char, isCorrect } for rendering
 */
function getCharacterDiff(
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

export interface TestAnswerInputHandle {
  insertCharacter: (char: string) => void;
}

export interface TestAnswerResult {
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  mistakeCount: number;
  pointsEarned: number;
  maxPoints: number;
  scorePercent: number;
  grade: AnswerGrade;
  scoreLetter: ScoreLetter;
}

interface TestAnswerInputProps {
  wordId: string;
  languageName: string;
  languageFlag: string;
  /** Language code (e.g., "de" for German) - used for case sensitivity */
  languageCode?: string | null;
  validAnswers: string[];
  isVisible: boolean;
  isLastWord: boolean;
  clueLevel: 0 | 1 | 2;
  existingResult?: TestAnswerResult | null; // If provided, word is already answered (locked)
  onSubmit: (result: TestAnswerResult) => void;
  onNextWord: () => void;
  /** Nerves of steel mode - punctuation and case must be correct */
  nervesOfSteelMode?: boolean;
}

export const TestAnswerInput = forwardRef<TestAnswerInputHandle, TestAnswerInputProps>(function TestAnswerInput({
  wordId,
  languageName,
  languageFlag,
  languageCode,
  validAnswers,
  isVisible,
  isLastWord,
  clueLevel,
  existingResult,
  onSubmit,
  onNextWord,
  nervesOfSteelMode = false,
}, ref) {
  const [input, setInput] = useState("");
  const [localResult, setLocalResult] = useState<TestAnswerResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // Expose insertCharacter method to parent
  useImperativeHandle(ref, () => ({
    insertCharacter: (char: string) => {
      if (!inputRef.current) return;
      // Don't insert if already answered
      if (existingResult || localResult) return;

      const inputEl = inputRef.current;
      const start = inputEl.selectionStart ?? inputEl.value.length;
      const end = inputEl.selectionEnd ?? inputEl.value.length;
      const newValue = inputEl.value.slice(0, start) + char + inputEl.value.slice(end);

      setInput(newValue);

      // Set cursor position after inserted character
      requestAnimationFrame(() => {
        inputEl.focus();
        inputEl.setSelectionRange(start + char.length, start + char.length);
      });
    },
  }), [existingResult, localResult]);

  // Determine if case should be preserved (German language or nerves of steel mode)
  const preserveCase = nervesOfSteelMode || languageRequiresCase(languageCode);
  const normalizeOptions: NormalizeOptions = {
    strictPunctuation: nervesOfSteelMode,
    preserveCase,
  };

  // Use existing result if provided (word already answered), otherwise use local result
  const result = existingResult ?? localResult;
  const isLocked = !!existingResult;

  // Focus input when it becomes visible and not locked
  useEffect(() => {
    if (isVisible && !result && !isLocked && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible, result, isLocked]);

  // Reset local state when word changes
  // Only reset if there's no existing result (word not already answered)
  useEffect(() => {
    if (!existingResult) {
      setInput("");
      setLocalResult(null);
    }
  }, [wordId, existingResult]);

  const handleSubmit = () => {
    if (!input.trim()) return;

    const { answer: bestMatchAnswer, mistakeCount } = getBestMatch(input, validAnswers, normalizeOptions);
    const pointsEarned = calculatePoints(clueLevel, mistakeCount);
    const maxPoints = getMaxPoints(clueLevel);
    const grade = getAnswerGrade(mistakeCount);
    const scoreLetter = getScoreLetter(clueLevel, mistakeCount);
    const scorePercent = calculateScorePercent(pointsEarned, maxPoints);
    const isCorrect = mistakeCount === 0;

    const testResult: TestAnswerResult = {
      isCorrect,
      userAnswer: input,
      correctAnswer: bestMatchAnswer,
      mistakeCount,
      pointsEarned,
      maxPoints,
      scorePercent,
      grade,
      scoreLetter,
    };

    setLocalResult(testResult);
    onSubmit(testResult);

    // Focus the Next button so Enter advances to next word
    setTimeout(() => {
      nextButtonRef.current?.focus();
    }, 50);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !result && input.trim() && !isLocked) {
      handleSubmit();
    }
  };

  // Keep input focused - refocus after blur (with small delay to allow button clicks)
  // But don't steal focus from other inputs/textareas (e.g. developer notes, user notes)
  const handleBlur = () => {
    if (!result && !isLocked) {
      setTimeout(() => {
        const active = document.activeElement;
        const isOtherInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
        if (inputRef.current && !isOtherInput) {
          inputRef.current.focus();
        }
      }, 50);
    }
  };

  if (!isVisible) {
    return null;
  }

  // Get feedback styling and text based on grade
  const getFeedback = () => {
    if (!result) return null;

    const { grade, pointsEarned } = result;
    const pointsText = `${pointsEarned} point${pointsEarned !== 1 ? "s" : ""}`;

    if (grade === "correct") {
      return {
        icon: "✅",
        text: `Correct! ${pointsText}`,
        emoji: "🙌",
        borderColor: "border-green-200",
        textColor: "text-green-600",
        inputTextColor: "text-foreground",
      };
    } else if (grade === "half-correct") {
      return {
        icon: "✅",
        text: `Half correct! ${pointsText}`,
        emoji: "🙌",
        borderColor: "border-amber-200",
        textColor: "text-amber-600",
        inputTextColor: "text-amber-600",
      };
    } else {
      return {
        icon: "❌",
        text: `Incorrect! 0 points`,
        emoji: "",
        borderColor: "border-red-200",
        textColor: "text-red-500",
        inputTextColor: "text-red-500",
      };
    }
  };

  const feedback = getFeedback();

  return (
    <div className="px-6 pt-3 pb-0">
      <div
        className={cn(
          "flex items-center gap-4 rounded-2xl border-2 bg-white px-5 py-3 transition-colors",
          feedback?.borderColor || "border-primary"
        )}
      >
        {/* Input field or result display */}
        {result ? (
          <div className="flex-1 text-xl font-medium">
            {result.grade === "correct" ? (
              // Fully correct - show in normal color
              <span className="text-foreground">{result.userAnswer}</span>
            ) : result.grade === "incorrect" ? (
              // Fully incorrect - show entire answer in red
              <span className="text-destructive">{result.userAnswer}</span>
            ) : (
              // Half-correct - show character-level highlighting
              getCharacterDiff(result.userAnswer, result.correctAnswer, normalizeOptions).map(
                ({ char, isCorrect }, index) => (
                  <span
                    key={index}
                    className={isCorrect ? "text-foreground" : "text-destructive"}
                  >
                    {char}
                  </span>
                )
              )
            )}
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={handleBlur}
            placeholder={`Type the word in ${languageName} ${languageFlag}...`}
            className="flex-1 bg-transparent text-xl font-medium text-foreground outline-none placeholder:text-black/50"
          />
        )}

        {/* Feedback and button */}
        <div className="flex items-center gap-4">
          {feedback && (
            <span className={cn("text-regular-semibold", feedback.textColor)}>
              {feedback.icon} {feedback.text} {feedback.emoji}
            </span>
          )}

          {/* Submit or Next button - must submit answer before proceeding */}
          {result ? (
            <Button ref={nextButtonRef} onClick={onNextWord} className="gap-1.5">
              {isLastWord ? "Finish test" : "Next word"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLocked}
              className="gap-1.5"
            >
              Submit
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
