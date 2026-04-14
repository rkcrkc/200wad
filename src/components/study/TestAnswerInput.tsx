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
  getCharacterDiff,
  canonicalizeUserGender,
  languageRequiresCase,
  type AnswerGrade,
  type ScoreLetter,
  type NormalizeOptions,
} from "@/lib/utils/scoring";
import { useDeadKeyComposition } from "@/lib/utils/deadKeys";

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

  // Dead key composition for accented characters (Windows support)
  const { handleDeadKey, clearPending } = useDeadKeyComposition(languageCode, inputRef, setInput);

  // Expose insertCharacter method to parent
  useImperativeHandle(ref, () => ({
    insertCharacter: (char: string) => {
      if (!inputRef.current) return;
      // Don't insert if already answered
      if (existingResult || localResult) return;
      clearPending();

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
  }), [existingResult, localResult, clearPending]);

  // Determine if case should be preserved (German language or nerves of steel mode)
  const preserveCase = nervesOfSteelMode || languageRequiresCase(languageCode);
  const normalizeOptions: NormalizeOptions = {
    strictPunctuation: nervesOfSteelMode,
    preserveCase,
  };

  // Check if any valid answer contains a gender marker (m) or (f)
  const hasGender = validAnswers.some((a) => /\((m|f)\)\s*$/.test(a));

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
      clearPending();
    }
  }, [wordId, existingResult, clearPending]);

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Dead key composition (accented characters on Windows)
    if (handleDeadKey(e)) return;

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
        emoji: pointsEarned > 0 ? "🙌" : "",
        borderColor: "border-green-200",
        textColor: "text-green-600",
        inputTextColor: "text-foreground",
      };
    } else if (grade === "half-correct") {
      // Check if gender was missing
      const genderMatch = result.correctAnswer.match(/\(([mf])\)\s*$/);
      const userHasGender = genderMatch
        ? /\s+\(?[mf]\)?\s*$/i.test(result.userAnswer.trim())
        : true;
      const text = !userHasGender
        ? `Half correct! Don\u2019t forget the gender. ${pointsText}`
        : `Half correct! ${pointsText}`;
      return {
        icon: "✅",
        text,
        emoji: pointsEarned > 0 ? "🙌" : "",
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
              <>
                {getCharacterDiff(
                  canonicalizeUserGender(result.userAnswer, result.correctAnswer, normalizeOptions),
                  result.correctAnswer,
                  normalizeOptions,
                ).map(
                  ({ char, isCorrect }, index) => (
                    <span
                      key={index}
                      className={isCorrect ? "text-foreground" : "text-destructive"}
                    >
                      {char}
                    </span>
                  )
                )}
                {/* Show missing gender marker hint when word is correct but gender was omitted */}
                {(() => {
                  const genderMatch = result.correctAnswer.match(/\((m|f)\)\s*$/);
                  if (!genderMatch) return null;
                  const userHasGender = /\s+\(?[mf]\)?\s*$/i.test(result.userAnswer.trim());
                  if (userHasGender) return null;
                  return <span className="text-destructive"> ({genderMatch[1]})</span>;
                })()}
              </>
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
            placeholder={`Type the word in ${languageName}${hasGender ? " + (m/f)" : ""}...`}
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
