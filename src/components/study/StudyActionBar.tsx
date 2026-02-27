"use client";

import { useState, useRef, useEffect } from "react";
import {
  RefreshCw,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Menu,
  Puzzle,
  X,
  Check,
  Image as ImageIcon,
  Music,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TestAttempt {
  isCorrect: boolean;
}

interface WordListItem {
  id: string;
  english: string;
  foreign: string;
}

interface StudyActionBarProps {
  currentWordIndex: number;
  totalWords: number;
  /** English word to display */
  englishWord: string;
  /** Foreign word to display */
  foreignWord: string;
  /** Part of speech / category */
  partOfSpeech?: string | null;
  /** List of all words for the word list dropdown */
  wordList: WordListItem[];
  /** Indices of completed words */
  completedWordIndices?: number[];
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

/** Abbreviate part of speech for compact display */
function abbreviatePartOfSpeech(pos: string | null | undefined): string {
  if (!pos) return "";
  const lower = pos.toLowerCase();
  if (lower.includes("noun")) return "n.";
  if (lower.includes("verb")) return "v.";
  if (lower.includes("adjective")) return "adj.";
  if (lower.includes("adverb")) return "adv.";
  if (lower.includes("pronoun")) return "pron.";
  if (lower.includes("preposition")) return "prep.";
  if (lower.includes("conjunction")) return "conj.";
  if (lower.includes("interjection") || lower.includes("exclamation")) return "exc.";
  if (lower.includes("article")) return "art.";
  // Return first 4 chars if no match
  return pos.slice(0, 4).toLowerCase() + ".";
}

export function StudyActionBar({
  currentWordIndex,
  totalWords,
  englishWord,
  foreignWord,
  partOfSpeech,
  wordList,
  completedWordIndices = [],
  testHistory = [],
  onJumpToWord,
  onPreviousWord,
  onNextWord,
  onRestart,
  mode = "study",
  clueLevel = 0,
  onRevealClue,
}: StudyActionBarProps) {
  const [isWordListOpen, setIsWordListOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canGoPrevious = currentWordIndex > 0;
  const canGoNext = currentWordIndex < totalWords - 1;
  const isTestMode = mode === "test";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWordListOpen(false);
      }
    }
    if (isWordListOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isWordListOpen]);

  // Compute word score from last 3 attempts
  const correctCount = testHistory.filter((t) => t.isCorrect).length;
  const wordScorePercent = testHistory.length > 0
    ? Math.round((correctCount / testHistory.length) * 100)
    : 100; // Default to 100% if no history

  // For test mode: can reveal clue if not at max level (2)
  const canRevealClue = isTestMode && clueLevel < 2;

  const posAbbrev = abbreviatePartOfSpeech(partOfSpeech);
  const completedSet = new Set(completedWordIndices);

  const handleWordSelect = (index: number) => {
    onJumpToWord(index);
    setIsWordListOpen(false);
  };

  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        {/* Left section - Menu, word info, score */}
        <div className="flex items-center gap-4">
          {/* Menu button with word list dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsWordListOpen(!isWordListOpen)}
              className={cn(
                "flex h-6 w-6 items-center justify-center transition-opacity hover:opacity-70",
                isWordListOpen ? "text-primary" : "text-foreground"
              )}
              title="Word list"
            >
              {isWordListOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Word list dropdown */}
            {isWordListOpen && (
              <div className="absolute bottom-full left-0 mb-2 max-h-[400px] w-[300px] overflow-y-auto rounded-xl bg-white shadow-[0px_5px_40px_-10px_rgba(0,0,0,0.25)]">
                <div className="p-2">
                  <div className="mb-2 px-3 py-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                    Words in lesson ({wordList.length})
                  </div>
                  {wordList.map((word, index) => {
                    const isCurrent = index === currentWordIndex;
                    const isCompleted = completedSet.has(index);
                    return (
                      <button
                        key={word.id}
                        onClick={() => handleWordSelect(index)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                          isCurrent
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-gray-50"
                        )}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-xs font-medium text-foreground/50">
                          {index + 1}
                        </span>
                        <span className={cn(
                          "flex-1 text-sm font-medium",
                          isCurrent ? "text-primary" : "text-foreground"
                        )}>
                          {word.english} · {word.foreign}
                        </span>
                        {isCompleted && (
                          <Check className="h-4 w-4 shrink-0 text-success" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Word text: english · foreign + part of speech */}
          <div className="flex items-center gap-2">
            <span className="text-regular-semibold text-foreground">
              {englishWord} · {foreignWord}
            </span>
            {posAbbrev && (
              <span className="text-small-medium text-foreground/50">
                {posAbbrev}
              </span>
            )}
          </div>

          {/* Divider */}
          <span className="text-foreground/25">|</span>

          {/* Word score dots + percentage */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => {
                const attempt = testHistory[i];
                return (
                  <div
                    key={i}
                    className={cn(
                      "h-3 w-3 rounded-full",
                      attempt?.isCorrect ? "bg-success" : "bg-gray-300"
                    )}
                  />
                );
              })}
            </div>
            <span className="text-regular-semibold text-foreground">
              {wordScorePercent}%
            </span>
          </div>
        </div>

        {/* Right section - Navigation controls, divider, toggle icons */}
        <div className="flex items-center gap-4">
          {/* Navigation controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRestart}
              className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
              title="Restart"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={() => onJumpToWord(0)}
              className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
              title="Go to first word"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={onPreviousWord}
              disabled={!canGoPrevious}
              className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70 disabled:opacity-30"
              title="Previous word"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={onNextWord}
              disabled={!canGoNext}
              className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70 disabled:opacity-30"
              title="Next word"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => onJumpToWord(totalWords - 1)}
              className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
              title="Go to last word"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          {/* Divider */}
          <span className="text-foreground/25">|</span>

          {/* Toggle icons */}
          <div className="flex items-center gap-3">
            <button
              className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
              title="Toggle images"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <button
              className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
              title="Toggle audio"
            >
              <Music className="h-5 w-5" />
            </button>
            <button
              className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
              title="Settings"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>

            {/* Test mode clue button */}
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
                {canRevealClue && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {2 - clueLevel}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
