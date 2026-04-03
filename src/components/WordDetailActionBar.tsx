"use client";

import { useState, useRef, useEffect } from "react";
import {
  Menu,
  X,
  Check,
  Image as ImageIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TestAttempt {
  pointsEarned: number;
  maxPoints: number;
}

interface WordScoreStats {
  totalPointsEarned: number;
  totalMaxPoints: number;
  scorePercent: number;
}

interface WordListItem {
  id: string;
  english: string;
  foreign: string;
}

interface WordDetailActionBarProps {
  currentWordIndex: number;
  totalWords: number;
  englishWord: string;
  foreignWord: string;
  partOfSpeech?: string | null;
  gender?: string | null;
  wordList: WordListItem[];
  /** Last 3 test attempts for current word - "traffic lights" (most recent first) */
  testHistory?: TestAttempt[];
  /** Historical score stats for current word */
  scoreStats?: WordScoreStats;
  onJumpToWord: (index: number) => void;
  onPreviousWord: () => void;
  onNextWord: () => void;
  onReplay: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  /** Current image display mode */
  imageMode?: "memory-trigger" | "flashcard";
  /** Callback when image mode changes */
  onImageModeChange?: (mode: "memory-trigger" | "flashcard") => void;
  /** Whether accessed from dictionary (hides word navigation) */
  fromDictionary?: boolean;
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
  return pos.slice(0, 4).toLowerCase() + ".";
}

export function WordDetailActionBar({
  currentWordIndex,
  totalWords,
  englishWord,
  foreignWord,
  partOfSpeech,
  gender,
  wordList,
  testHistory = [],
  scoreStats,
  onJumpToWord,
  onPreviousWord,
  onNextWord,
  onReplay,
  hasPrevious = false,
  hasNext = false,
  imageMode = "memory-trigger",
  onImageModeChange,
  fromDictionary = false,
}: WordDetailActionBarProps) {
  const [isWordListOpen, setIsWordListOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const wordScorePercent = scoreStats?.scorePercent ?? 0;
  const posAbbrev = abbreviatePartOfSpeech(partOfSpeech);
  const genderAbbrev = gender && ["m", "f", "n", "mf"].includes(gender) ? gender : "";
  const posDisplay = posAbbrev && genderAbbrev ? `${posAbbrev} ${genderAbbrev}` : posAbbrev;

  const handleWordSelect = (index: number) => {
    onJumpToWord(index);
    setIsWordListOpen(false);
  };

  return (
    <div className="fixed bottom-0 left-[240px] right-0 z-10 bg-white shadow-[0px_-8px_30px_-15px_rgba(0,0,0,0.1)]">
      <div className="border-t border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left section - Menu, word info, score */}
          <div className="flex items-center gap-4">
            {/* Menu button with word list dropdown - hidden when from dictionary */}
            {!fromDictionary && (
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
                            {isCurrent && (
                              <Check className="h-4 w-4 shrink-0 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Word text: english · foreign + part of speech */}
            <div className="flex items-center gap-2">
              <span className="text-regular-semibold text-foreground">
                {englishWord} · {foreignWord}
              </span>
              {posDisplay && (
                <span className="text-small-medium text-foreground/50">
                  {posDisplay}
                </span>
              )}
            </div>

            {/* Divider */}
            <span className="text-foreground/25">|</span>

            {/* Traffic lights (last 3 test attempts) + historical score percentage */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => {
                  const attempt = testHistory[i];
                  // Green = got points, Red = 0 points, Gray = no attempt yet
                  let bgColor = "bg-gray-300"; // No attempt
                  if (attempt) {
                    bgColor = attempt.pointsEarned > 0 ? "bg-success" : "bg-destructive";
                  }
                  return (
                    <div
                      key={i}
                      className={cn("h-3 w-3 rounded-full", bgColor)}
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
            {/* Navigation controls - hidden when from dictionary */}
            {!fromDictionary && (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onReplay}
                    className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
                    title="Replay audio"
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
                    disabled={!hasPrevious}
                    className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous word"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={onNextWord}
                    disabled={!hasNext}
                    className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
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
              </>
            )}

            {/* Replay button - always show */}
            {fromDictionary && (
              <button
                onClick={onReplay}
                className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
                title="Replay audio"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            )}

            {/* Toggle icons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const newMode = imageMode === "memory-trigger" ? "flashcard" : "memory-trigger";
                  onImageModeChange?.(newMode);
                }}
                className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
                title={imageMode === "memory-trigger" ? "Switch to flashcard" : "Switch to memory trigger"}
              >
                {imageMode === "memory-trigger" ? (
                  <Zap className="h-5 w-5" />
                ) : (
                  <ImageIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
