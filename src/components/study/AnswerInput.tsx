"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isExactMatch } from "@/lib/utils/scoring";

type FeedbackType = "correct" | "incorrect" | null;

interface AnswerInputProps {
  wordId: string;
  languageName: string;
  validAnswers: string[];
  isVisible: boolean;
  isLastWord: boolean;
  onSubmit: (isCorrect: boolean, userAnswer: string) => void;
  onNextWord: () => void;
  /** Strict mode requires correct answer before proceeding */
  strictMode?: boolean;
}

export function AnswerInput({
  wordId,
  languageName,
  validAnswers,
  isVisible,
  isLastWord,
  onSubmit,
  onNextWord,
  strictMode = false,
}: AnswerInputProps) {
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [lastSubmitted, setLastSubmitted] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when it becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  // Reset state when word changes
  useEffect(() => {
    setInput("");
    setFeedback(null);
    setLastSubmitted("");
    setShowWarning(false);
  }, [wordId]);

  const handleSubmit = () => {
    if (!input.trim()) return;

    const isCorrect = isExactMatch(input, validAnswers);
    setFeedback(isCorrect ? "correct" : "incorrect");
    setLastSubmitted(input);
    onSubmit(isCorrect, input);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (showWarning) setShowWarning(false);
  };

  // Check if user can proceed to next word
  const canProceed = !strictMode || feedback === "correct";

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (input.trim() && input !== lastSubmitted) {
        handleSubmit();
      } else if (strictMode && feedback !== "correct") {
        // In strict mode, must have correct answer to proceed
        setShowWarning(true);
      } else {
        onNextWord();
      }
    }
  };

  const handleNextClick = () => {
    if (strictMode && feedback !== "correct") {
      setShowWarning(true);
    } else {
      onNextWord();
    }
  };

  // Keep input focused - refocus after blur (with small delay to allow button clicks)
  const handleBlur = () => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 10);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="px-6 pt-3 pb-0">
      <div
        className={cn(
          "flex items-center gap-4 rounded-2xl border-2 bg-white px-5 py-3 transition-colors",
          feedback === "correct" && "border-green-200",
          feedback === "incorrect" && "border-red-200",
          !feedback && "border-gray-200"
        )}
      >
          {/* Input field - always editable in study mode */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            onBlur={handleBlur}
            placeholder={`Type the word in ${languageName}...`}
            className={cn(
              "flex-1 bg-transparent text-xl font-medium outline-none placeholder:text-black/50",
              feedback === "incorrect" && "text-red-500",
              feedback === "correct" && "text-foreground"
            )}
          />

          {/* Feedback and button */}
          <div className="flex items-center gap-4">
            {feedback === "correct" && (
              <span className="text-regular-semibold text-green-600">
                ✅ Correct! 🙌
              </span>
            )}
            {feedback === "incorrect" && (
              <span className="text-regular-semibold text-red-500">
                ❌ Incorrect!
              </span>
            )}
            {showWarning && (
              <span className="text-regular-semibold text-orange-500">
                Type your answer first
              </span>
            )}

            {/* Submit if text changed, otherwise Next */}
            {input.trim() && input !== lastSubmitted ? (
              <Button onClick={handleSubmit} className="gap-1.5">
                Submit
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleNextClick} className="gap-1.5">
                {isLastWord ? "Finish lesson" : "Next word"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
    </div>
  );
}
