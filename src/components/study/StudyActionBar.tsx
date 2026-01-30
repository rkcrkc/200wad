"use client";

import {
  Menu,
  RefreshCw,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Music,
  SlidersHorizontal,
  Puzzle,
} from "lucide-react";
import { WordTrackerDots } from "./WordTrackerDots";
import { cn } from "@/lib/utils";

interface TestAttempt {
  isCorrect: boolean;
}

interface StudyActionBarProps {
  lessonNumber: number;
  lessonTitle: string;
  currentWordIndex: number;
  totalWords: number;
  completedWords: number[];
  /** Last 3 test attempts for current word (most recent first) */
  testHistory?: TestAttempt[];
  onJumpToWord: (index: number) => void;
  onPreviousWord: () => void;
  onNextWord: () => void;
  onRestart: () => void;
  /** Mode: "study" or "test" - affects which buttons are shown */
  mode?: "study" | "test";
  /** For test mode: current clue level (0-2) */
  clueLevel?: 0 | 1 | 2;
  /** For test mode: callback when puzzle button clicked to reveal next clue */
  onRevealClue?: () => void;
}

export function StudyActionBar({
  lessonNumber,
  lessonTitle,
  currentWordIndex,
  totalWords,
  completedWords,
  testHistory = [],
  onJumpToWord,
  onPreviousWord,
  onNextWord,
  onRestart,
  mode = "study",
  clueLevel = 0,
  onRevealClue,
}: StudyActionBarProps) {
  const canGoPrevious = currentWordIndex > 0;
  const canGoNext = currentWordIndex < totalWords - 1;
  const isTestMode = mode === "test";

  // Compute word score from last 3 attempts
  const correctCount = testHistory.filter((t) => t.isCorrect).length;
  const wordScorePercent = testHistory.length > 0 
    ? Math.round((correctCount / testHistory.length) * 100) 
    : 100; // Default to 100% if no history
  
  // For test mode: can reveal clue if not at max level (2)
  const canRevealClue = isTestMode && clueLevel < 2;

  return (
    <div className="border-t border-gray-100 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Leading section */}
        <div className="flex items-center gap-4">
          {/* Lesson Details */}
          <div className="flex items-center gap-1.5">
            <span className="text-regular-semibold text-foreground">
              Lesson #{lessonNumber}
            </span>
            <span className="text-regular-semibold text-foreground/25">·</span>
            <span className="text-regular-semibold text-foreground">
              {lessonTitle}
            </span>
            <Menu className="ml-1 h-5 w-5 text-foreground" />
          </div>

          <span className="text-regular-semibold text-foreground/25">|</span>

          {/* Word counter and tracker */}
          <div className="flex items-center gap-3">
            <span className="text-regular-medium text-foreground">
              Word #{currentWordIndex + 1}
            </span>
            <WordTrackerDots
              totalWords={totalWords}
              currentIndex={currentWordIndex}
              completedIndices={completedWords}
              onDotClick={onJumpToWord}
            />
          </div>

          <span className="text-regular-semibold text-foreground/25">|</span>

          {/* Navigation controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRestart}
              className="flex h-6 w-6 items-center justify-center transition-opacity hover:opacity-70"
              title="Restart"
            >
              <RefreshCw className="h-5 w-5 text-foreground" />
            </button>
            <button
              onClick={() => onJumpToWord(0)}
              className="flex h-6 w-6 items-center justify-center transition-opacity hover:opacity-70"
              title="Go to first word"
            >
              <SkipBack className="h-5 w-5 text-foreground" />
            </button>
            <button
              onClick={onPreviousWord}
              disabled={!canGoPrevious}
              className="flex h-6 w-6 items-center justify-center transition-opacity hover:opacity-70 disabled:opacity-30"
              title="Previous word"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <button
              onClick={onNextWord}
              disabled={!canGoNext}
              className="flex h-6 w-6 items-center justify-center transition-opacity hover:opacity-70 disabled:opacity-30"
              title="Next word"
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
            <button
              onClick={() => onJumpToWord(totalWords - 1)}
              className="flex h-6 w-6 items-center justify-center transition-opacity hover:opacity-70"
              title="Go to last word"
            >
              <SkipForward className="h-5 w-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Trailing section */}
        <div className="flex items-center gap-4">
          {/* Word score with dots */}
          <div className="flex items-center gap-2">
            <span className="text-regular-medium text-foreground">
              Word score: {wordScorePercent}%
            </span>
            {/* Test history dots - always show 3 */}
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => {
                const attempt = testHistory[i];
                return (
                  <div
                    key={i}
                    className={cn(
                      "h-2 w-2 rounded-full",
                      attempt?.isCorrect ? "bg-success" : "bg-gray-300"
                    )}
                  />
                );
              })}
            </div>
          </div>

          {/* Puzzle button for test mode - reveals clues */}
          {isTestMode && (
            <button
              onClick={onRevealClue}
              disabled={!canRevealClue}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                canRevealClue 
                  ? "bg-primary/10 text-primary hover:bg-primary/20" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
              title={canRevealClue ? `Reveal clue (${2 - clueLevel} remaining)` : "No more clues"}
            >
              <Puzzle className="h-5 w-5" />
              {/* Badge showing remaining clues */}
              {canRevealClue && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {2 - clueLevel}
                </span>
              )}
            </button>
          )}

          {/* Toggle icons */}
          <div className="flex items-center gap-4">
            <button className="flex h-6 w-6 items-center justify-center transition-opacity hover:opacity-70">
              <ImageIcon className="h-5 w-5 text-foreground" />
            </button>
            <button className="flex h-6 w-6 items-center justify-center transition-opacity hover:opacity-70">
              <Music className="h-5 w-5 text-foreground" />
            </button>
            <button className="flex h-6 w-6 items-center justify-center transition-opacity hover:opacity-70">
              <SlidersHorizontal className="h-5 w-5 text-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
