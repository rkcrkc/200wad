"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isExactMatch } from "@/lib/utils/scoring";

type FeedbackType = "correct" | "incorrect" | null;

interface AnswerInputProps {
  languageName: string;
  languageFlag: string;
  validAnswers: string[];
  isVisible: boolean;
  isLastWord: boolean;
  onSubmit: (isCorrect: boolean, userAnswer: string) => void;
  onNextWord: () => void;
}

export function AnswerInput({
  languageName,
  languageFlag,
  validAnswers,
  isVisible,
  isLastWord,
  onSubmit,
  onNextWord,
}: AnswerInputProps) {
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when it becomes visible
  useEffect(() => {
    if (isVisible && !feedback && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible, feedback]);

  // Reset state when word changes (isVisible becomes true again)
  useEffect(() => {
    if (isVisible) {
      setInput("");
      setFeedback(null);
      setSubmittedAnswer("");
    }
  }, [isVisible, validAnswers]);

  // Global keydown listener for Enter when feedback is shown
  // (input is disabled so it can't receive key events directly)
  useEffect(() => {
    if (!feedback) return;

    let handler: ((e: KeyboardEvent) => void) | null = null;

    // Small delay to prevent the same Enter keypress from triggering next word
    const timeoutId = setTimeout(() => {
      handler = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          onNextWord();
        }
      };
      window.addEventListener("keydown", handler);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (handler) {
        window.removeEventListener("keydown", handler);
      }
    };
  }, [feedback, onNextWord]);

  const handleSubmit = () => {
    if (!input.trim()) return;

    const isCorrect = isExactMatch(input, validAnswers);
    setFeedback(isCorrect ? "correct" : "incorrect");
    setSubmittedAnswer(input);
    onSubmit(isCorrect, input);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (feedback) {
        onNextWord();
      } else if (input.trim()) {
        handleSubmit();
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="px-6 pt-3 pb-0">
      <div
        className={cn(
          "flex items-center gap-4 rounded-2xl border-2 bg-white px-6 py-4 transition-colors",
          feedback === "correct" && "border-green-200",
          feedback === "incorrect" && "border-red-200",
          !feedback && "border-gray-200"
        )}
      >
          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={feedback ? submittedAnswer : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Type the word in ${languageName} ${languageFlag}...`}
            disabled={!!feedback}
            className={cn(
              "flex-1 bg-transparent text-xl font-medium outline-none placeholder:text-primary/60",
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

            {/* Submit or Next button */}
            {feedback ? (
              <Button onClick={onNextWord} className="gap-1.5">
                {isLastWord ? "Finish lesson" : "Next word"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : input.trim() ? (
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
