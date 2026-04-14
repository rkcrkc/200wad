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
  ChevronsLeft,
  ChevronsRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { Popover } from "@/components/ui/popover";
import { useText } from "@/context/TextContext";

interface TestAttempt {
  pointsEarned: number;
  maxPoints: number;
}

interface WordScoreStats {
  totalPointsEarned: number;
  totalMaxPoints: number;
  scorePercent: number;
  timesTested: number;
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
  /** Word category (fact, phrase, sentence, word, information) */
  category?: string | null;
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
  /** Layout variant: "page" uses fixed positioning, "sidebar" uses relative positioning */
  variant?: "page" | "sidebar";
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

/** Get full part of speech name from the original value */
function fullPartOfSpeech(pos: string | null | undefined): string {
  if (!pos) return "";
  const lower = pos.toLowerCase();
  if (lower.includes("noun")) return "Noun";
  if (lower.includes("verb")) return "Verb";
  if (lower.includes("adjective")) return "Adjective";
  if (lower.includes("adverb")) return "Adverb";
  if (lower.includes("pronoun")) return "Pronoun";
  if (lower.includes("preposition")) return "Preposition";
  if (lower.includes("conjunction")) return "Conjunction";
  if (lower.includes("interjection") || lower.includes("exclamation")) return "Exclamation";
  if (lower.includes("article")) return "Article";
  return pos;
}

export function WordDetailActionBar({
  currentWordIndex,
  totalWords,
  englishWord,
  foreignWord,
  partOfSpeech,
  gender,
  category,
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
  variant = "page",
}: WordDetailActionBarProps) {
  const { t, tt } = useText();
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
  const label = category === "word" || posAbbrev ? posAbbrev : "";
  const posDisplay = label && genderAbbrev ? `${label} ${genderAbbrev}` : label;
  const posTooltipLabel = posAbbrev ? `Word type: ${fullPartOfSpeech(partOfSpeech)}` : "Word type";

  const handleWordSelect = (index: number) => {
    onJumpToWord(index);
    setIsWordListOpen(false);
  };

  return (
    <div className={cn(
      "z-10 bg-white shadow-bar",
      variant === "sidebar"
        ? "absolute bottom-0 left-0 right-0"
        : "fixed bottom-0 left-[240px] right-0"
    )}>
      <div className="border-t border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left section - Menu, word info, score */}
          <div className="flex items-center gap-4">
            {/* Menu button with word list dropdown - hidden when from dictionary or sidebar */}
            {!fromDictionary && variant !== "sidebar" && (
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
                  <div className="absolute bottom-full left-0 mb-2 max-h-[400px] w-[300px] overflow-y-auto rounded-xl bg-white shadow-panel">
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

            {/* Word text: english · foreign + part of speech (hidden in sidebar) */}
            {variant !== "sidebar" && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-regular-semibold text-foreground">
                    {englishWord} · {foreignWord}
                  </span>
                  {posDisplay && (
                    <Tooltip label={posTooltipLabel}>
                      <span className="text-small-medium text-foreground/50 cursor-default">
                        {posDisplay}
                      </span>
                    </Tooltip>
                  )}
                </div>

                {/* Divider */}
                <span className="text-foreground/25">|</span>
              </>
            )}

            {/* Part of speech only (sidebar) */}
            {variant === "sidebar" && posDisplay && (
              <>
                <Tooltip label={posTooltipLabel}>
                  <span className="text-small-medium text-foreground/50 cursor-default">
                    {posDisplay}
                  </span>
                </Tooltip>
                <span className="text-foreground/25">|</span>
              </>
            )}

            {/* Traffic lights (last 3 test attempts) + historical score percentage */}
            <Popover
              position="above"
              align="left"
              className="flex items-center cursor-default"
              content={
                <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                  <span>
                    {tt("pop_score_breakdown", {
                      pts: scoreStats?.totalPointsEarned ?? 0,
                      total: scoreStats?.totalMaxPoints ?? 0,
                      pct: scoreStats && scoreStats.totalMaxPoints > 0
                        ? ((scoreStats.totalPointsEarned / scoreStats.totalMaxPoints) * 100).toFixed(1)
                        : "0.0",
                    })}
                  </span>
                  <span>{tt("pop_times_tested", { count: scoreStats?.timesTested ?? 0 })}</span>
                </div>
              }
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => {
                    const attempt = testHistory[i];
                    // Green = full points, Orange = partial, Red = 0 points, Gray = no attempt
                    let bgColor = "bg-gray-300"; // No attempt
                    if (attempt) {
                      if (attempt.pointsEarned >= attempt.maxPoints) {
                        bgColor = "bg-success";
                      } else if (attempt.pointsEarned > 0) {
                        bgColor = "bg-warning";
                      } else {
                        bgColor = "bg-destructive";
                      }
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
            </Popover>
          </div>

          {/* Right section - Navigation controls, divider, toggle icons */}
          <div className="flex items-center gap-4">
            {/* Navigation controls - hidden when from dictionary */}
            {!fromDictionary && (
              <>
                <div className="flex items-center gap-2">
                  <Tooltip label={t("tip_replay_audio")}>
                    <button
                      onClick={onReplay}
                      className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                  </Tooltip>
                  <Tooltip label={t("tip_first_word")}>
                    <button
                      onClick={() => onJumpToWord(0)}
                      className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
                    >
                      <ChevronsLeft className="h-5 w-5" />
                    </button>
                  </Tooltip>
                  <Tooltip label={t("tip_previous_word")}>
                    <button
                      onClick={onPreviousWord}
                      disabled={!hasPrevious}
                      className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  </Tooltip>
                  <Tooltip label={t("tip_next_word")}>
                    <button
                      onClick={onNextWord}
                      disabled={!hasNext}
                      className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </Tooltip>
                  <Tooltip label={t("tip_last_word")}>
                    <button
                      onClick={() => onJumpToWord(totalWords - 1)}
                      className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
                    >
                      <ChevronsRight className="h-5 w-5" />
                    </button>
                  </Tooltip>
                </div>

                {/* Divider */}
                <span className="text-foreground/25">|</span>
              </>
            )}

            {/* Replay button - show when nav controls are hidden */}
            {fromDictionary && (
              <Tooltip label={t("tip_replay_audio")}>
                <button
                  onClick={onReplay}
                  className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </Tooltip>
            )}

            {/* Toggle icons */}
            <div className="flex items-center gap-3">
              <Tooltip label={imageMode === "memory-trigger" ? t("tip_show_flashcard") : t("tip_show_memory_trigger")}>
                <button
                  onClick={() => {
                    const newMode = imageMode === "memory-trigger" ? "flashcard" : "memory-trigger";
                    onImageModeChange?.(newMode);
                  }}
                  className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
                >
                  {imageMode === "memory-trigger" ? (
                    <Zap className="h-5 w-5" />
                  ) : (
                    <ImageIcon className="h-5 w-5" />
                  )}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
