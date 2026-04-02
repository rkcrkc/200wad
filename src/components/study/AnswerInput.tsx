"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getBestMatch,
  getAnswerGrade,
  getCharacterDiff,
  languageRequiresCase,
  type AnswerGrade,
  type NormalizeOptions,
} from "@/lib/utils/scoring";
import { useDeadKeyComposition } from "@/lib/utils/deadKeys";

interface FeedbackState {
  grade: AnswerGrade;
  userAnswer: string;
  correctAnswer: string;
  mistakeCount: number;
}

export interface AnswerInputHandle {
  insertCharacter: (char: string) => void;
}

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
  /** Language code (e.g., "de" for German) - used for case sensitivity */
  languageCode?: string | null;
}

export const AnswerInput = forwardRef<AnswerInputHandle, AnswerInputProps>(function AnswerInput({
  wordId,
  languageName,
  validAnswers,
  isVisible,
  isLastWord,
  onSubmit,
  onNextWord,
  strictMode = false,
  languageCode,
}, ref) {
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // Dead key composition for accented characters (Windows support)
  const { handleDeadKey, clearPending } = useDeadKeyComposition(languageCode, inputRef, setInput);

  // Normalization options based on language
  const preserveCase = languageRequiresCase(languageCode);
  const normalizeOptions: NormalizeOptions = {
    strictPunctuation: false,
    preserveCase,
  };

  // Check if any valid answer contains a gender marker (m) or (f)
  const hasGender = validAnswers.some((a) => /\((m|f)\)\s*$/.test(a));

  // Expose insertCharacter method to parent
  useImperativeHandle(ref, () => ({
    insertCharacter: (char: string) => {
      if (!inputRef.current) return;
      // Don't insert if showing diff (locked display)
      if (showDiff) return;
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
  }), [showDiff, clearPending]);

  // Focus input when it becomes visible
  useEffect(() => {
    if (isVisible && !showDiff && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible, showDiff]);

  // Reset state when word changes
  useEffect(() => {
    setInput("");
    setFeedback(null);
    setShowDiff(false);
    setShowWarning(false);
    clearPending();
  }, [wordId, clearPending]);

  const handleSubmit = () => {
    if (!input.trim()) return;

    const { answer: bestMatchAnswer, mistakeCount } = getBestMatch(input, validAnswers, normalizeOptions);
    const grade = getAnswerGrade(mistakeCount);
    const isCorrect = grade === "correct";

    const newFeedback: FeedbackState = {
      grade,
      userAnswer: input,
      correctAnswer: bestMatchAnswer,
      mistakeCount,
    };

    setFeedback(newFeedback);
    setShowDiff(true);
    onSubmit(isCorrect, input);

    // Focus the Next button so Enter advances (only if can proceed)
    if (isCorrect || !strictMode) {
      setTimeout(() => {
        nextButtonRef.current?.focus();
      }, 50);
    }
  };

  // Switch back to editable input (for retry)
  const handleRetry = () => {
    setShowDiff(false);
    setInput("");
    setFeedback(null);
    // Re-focus input after switching back
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (showWarning) setShowWarning(false);
  };

  // Check if user can proceed to next word
  const canProceed = !strictMode || (feedback?.grade === "correct");

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Dead key composition (accented characters on Windows)
    if (handleDeadKey(e)) return;

    if (e.key === "Enter") {
      if (showDiff) {
        // If showing diff and can proceed, go next
        if (canProceed) {
          onNextWord();
        } else {
          // In strict mode with non-correct answer, retry
          handleRetry();
        }
      } else if (input.trim()) {
        handleSubmit();
      }
    }
  };

  const handleNextClick = () => {
    if (!canProceed) {
      setShowWarning(true);
    } else {
      onNextWord();
    }
  };

  // Keep input focused - refocus after blur (with small delay to allow button clicks)
  // But don't steal focus from other inputs/textareas (e.g. developer notes, user notes)
  const handleBlur = () => {
    if (!showDiff) {
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

  // Get border and feedback styling based on grade
  const getBorderColor = () => {
    if (!feedback) return "border-primary";
    if (feedback.grade === "correct") return "border-green-200";
    if (feedback.grade === "half-correct") return "border-amber-200";
    return "border-red-200";
  };

  const getFeedbackDisplay = () => {
    if (!feedback) return null;
    if (feedback.grade === "correct") {
      return { icon: "✅", text: "Correct!", emoji: "🙌", textColor: "text-green-600" };
    }
    if (feedback.grade === "half-correct") {
      // Check if gender was missing
      const genderMatch = feedback.correctAnswer.match(/\((m|f)\)\s*$/);
      const userHasGender = genderMatch ? /\(?(m|f)\)?\s*$/.test(feedback.userAnswer.trim()) : true;
      const text = !userHasGender ? "Half-correct! Don\u2019t forget the gender" : "Half-correct!";
      return { icon: "✅", text, emoji: "", textColor: "text-amber-600" };
    }
    return { icon: "❌", text: "Incorrect!", emoji: "", textColor: "text-red-500" };
  };

  const feedbackDisplay = getFeedbackDisplay();

  return (
    <div className="px-6 pt-3 pb-0">
      <div
        className={cn(
          "flex items-center gap-4 rounded-2xl border-2 bg-white px-5 py-3 transition-colors",
          getBorderColor()
        )}
      >
        {/* Input field or diff display */}
        {showDiff && feedback ? (
          <div
            className="flex-1 cursor-text text-xl font-medium"
            onClick={handleRetry}
          >
            {feedback.grade === "correct" ? (
              // Fully correct - show in normal color
              <span className="text-foreground">{feedback.userAnswer}</span>
            ) : feedback.grade === "incorrect" ? (
              // Fully incorrect - show entire answer in red
              <span className="text-destructive">{feedback.userAnswer}</span>
            ) : (
              // Half-correct - show character-level highlighting
              <>
                {getCharacterDiff(feedback.userAnswer, feedback.correctAnswer, normalizeOptions).map(
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
                  const genderMatch = feedback.correctAnswer.match(/\((m|f)\)\s*$/);
                  if (!genderMatch) return null;
                  const userHasGender = /\(?(m|f)\)?\s*$/.test(feedback.userAnswer.trim());
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
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            onBlur={handleBlur}
            placeholder={`Type the word in ${languageName}${hasGender ? " + (m/f)" : ""}...`}
            className="flex-1 bg-transparent text-xl font-medium text-foreground outline-none placeholder:text-black/50"
          />
        )}

        {/* Feedback and button */}
        <div className="flex items-center gap-4">
          {feedbackDisplay && (
            <span className={cn("text-regular-semibold", feedbackDisplay.textColor)}>
              {feedbackDisplay.icon} {feedbackDisplay.text} {feedbackDisplay.emoji}
            </span>
          )}
          {showWarning && (
            <span className="text-regular-semibold text-orange-500">
              Type the correct answer first
            </span>
          )}

          {/* Submit or Next button */}
          {showDiff ? (
            canProceed ? (
              <Button ref={nextButtonRef} onClick={handleNextClick} className="gap-1.5">
                {isLastWord ? "Finish lesson" : "Next word"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleRetry} className="gap-1.5">
                Try again
                <ChevronRight className="h-4 w-4" />
              </Button>
            )
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!input.trim()}
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
