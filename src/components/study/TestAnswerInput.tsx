"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getMistakeCount,
  calculatePoints,
  getMaxPoints,
  getAnswerGrade,
  getScoreLetter,
  calculateScorePercent,
  type AnswerGrade,
  type ScoreLetter,
} from "@/lib/utils/scoring";

export interface TestAnswerResult {
  isCorrect: boolean;
  userAnswer: string;
  mistakeCount: number;
  pointsEarned: number;
  maxPoints: number;
  scorePercent: number;
  grade: AnswerGrade;
  scoreLetter: ScoreLetter;
}

interface TestAnswerInputProps {
  languageName: string;
  languageFlag: string;
  correctAnswer: string;
  isVisible: boolean;
  isLastWord: boolean;
  clueLevel: 0 | 1 | 2;
  existingResult?: TestAnswerResult | null; // If provided, word is already answered (locked)
  onSubmit: (result: TestAnswerResult) => void;
  onNextWord: () => void;
}

export function TestAnswerInput({
  languageName,
  languageFlag,
  correctAnswer,
  isVisible,
  isLastWord,
  clueLevel,
  existingResult,
  onSubmit,
  onNextWord,
}: TestAnswerInputProps) {
  const [input, setInput] = useState("");
  const [localResult, setLocalResult] = useState<TestAnswerResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use existing result if provided (word already answered), otherwise use local result
  const result = existingResult ?? localResult;
  const isLocked = !!existingResult;

  // Focus input when it becomes visible and not locked
  useEffect(() => {
    if (isVisible && !result && !isLocked && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible, result, isLocked]);

  // Reset local state when word changes (correctAnswer changes)
  // Only reset if there's no existing result (word not already answered)
  useEffect(() => {
    if (isVisible && !existingResult) {
      setInput("");
      setLocalResult(null);
    }
  }, [isVisible, correctAnswer, existingResult]);

  const handleSubmit = () => {
    if (!input.trim()) return;

    const mistakeCount = getMistakeCount(input, correctAnswer);
    const pointsEarned = calculatePoints(clueLevel, mistakeCount);
    const maxPoints = getMaxPoints(clueLevel);
    const grade = getAnswerGrade(mistakeCount);
    const scoreLetter = getScoreLetter(clueLevel, mistakeCount);
    const scorePercent = calculateScorePercent(pointsEarned, maxPoints);
    const isCorrect = mistakeCount === 0;

    const testResult: TestAnswerResult = {
      isCorrect,
      userAnswer: input,
      mistakeCount,
      pointsEarned,
      maxPoints,
      scorePercent,
      grade,
      scoreLetter,
    };

    setLocalResult(testResult);
    onSubmit(testResult);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (result) {
        onNextWord();
      } else if (input.trim() && !isLocked) {
        handleSubmit();
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  // Get feedback styling and text based on grade
  const getFeedback = () => {
    if (!result) return null;

    const { grade, pointsEarned, scorePercent } = result;

    if (grade === "correct") {
      return {
        icon: "✅",
        text: `Correct! You scored ${pointsEarned} points (${scorePercent}%)`,
        emoji: "🙌",
        borderColor: "border-green-200",
        textColor: "text-green-600",
        inputTextColor: "text-foreground",
      };
    } else if (grade === "half-correct") {
      return {
        icon: "✅",
        text: `Half correct! You scored ${pointsEarned} point${pointsEarned !== 1 ? "s" : ""} (${scorePercent}%)`,
        emoji: "🙌",
        borderColor: "border-amber-200",
        textColor: "text-amber-600",
        inputTextColor: "text-amber-600",
      };
    } else {
      return {
        icon: "❌",
        text: `Incorrect! You scored 0 points`,
        emoji: "",
        borderColor: "border-red-200",
        textColor: "text-red-500",
        inputTextColor: "text-red-500",
      };
    }
  };

  const feedback = getFeedback();

  return (
    <div className="px-6 py-3">
      <div
        className={cn(
          "flex items-center gap-4 rounded-2xl border-2 bg-white px-6 py-4 transition-colors",
          feedback?.borderColor || "border-gray-200"
        )}
      >
        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={result ? result.userAnswer : input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={`Type the word in ${languageName} ${languageFlag}...`}
          disabled={!!result}
          className={cn(
            "flex-1 bg-transparent text-xl font-medium outline-none placeholder:text-warning/60",
            feedback?.inputTextColor || "text-foreground"
          )}
        />

        {/* Feedback and button */}
        <div className="flex items-center gap-4">
          {feedback && (
            <span className={cn("text-regular-semibold", feedback.textColor)}>
              {feedback.icon} {feedback.text} {feedback.emoji}
            </span>
          )}

          {/* Submit or Next button */}
          {result ? (
            <Button onClick={onNextWord} className="gap-1.5">
              {isLastWord ? "Finish test" : "Next word"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : input.trim() && !isLocked ? (
            <Button onClick={handleSubmit} className="gap-1.5">
              Submit
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
