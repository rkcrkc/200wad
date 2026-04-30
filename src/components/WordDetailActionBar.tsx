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
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { ScoreIndicator } from "@/components/ui/score-indicator";
import { StatusPill, type StatusType } from "@/components/ui/status-pill";
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
  /** Word learning status */
  wordStatus?: "not-started" | "learning" | "learned" | "mastered";
  /** Whether accessed from dictionary (hides word navigation) */
  fromDictionary?: boolean;
  /** Layout variant: "page" uses fixed positioning, "sidebar" uses relative positioning */
  variant?: "page" | "sidebar";
  /** Collapse nav + image toggle into ellipsis menu */
  compact?: boolean;
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
  wordStatus,
  fromDictionary = false,
  variant = "page",
  compact = false,
}: WordDetailActionBarProps) {
  const { t, tt } = useText();
  const [isWordListOpen, setIsWordListOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWordListOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    }
    if (isWordListOpen || isMoreMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isWordListOpen, isMoreMenuOpen]);

  const posAbbrev = abbreviatePartOfSpeech(partOfSpeech);
  const genderAbbrev = gender && ["m", "f", "n", "mf"].includes(gender) ? gender : "";
  // Show POS abbreviation for words; show category name for facts/phrases/sentences/information
  const label = category === "word"
    ? posAbbrev
    : category
      ? category
      : posAbbrev;
  const posDisplay = label && genderAbbrev && category === "word"
    ? `${label} ${genderAbbrev}`
    : label;
  const posTooltipLabel = category === "word"
    ? (posAbbrev ? fullPartOfSpeech(partOfSpeech) : "")
    : category
      ? category.charAt(0).toUpperCase() + category.slice(1)
      : "";

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
            <ScoreIndicator
              testHistory={testHistory}
              scoreStats={scoreStats ?? { totalPointsEarned: 0, totalMaxPoints: 0, scorePercent: 0, timesTested: 0 }}
              wordStatus={wordStatus}
            />

            {/* Word status pill */}
            {wordStatus && (
              <Tooltip label={t(
                wordStatus === "not-started" ? "tip_status_not_started"
                  : wordStatus === "learning" ? "tip_status_learning"
                  : wordStatus === "learned" ? "tip_status_learned"
                  : "tip_status_mastered"
              )}>
                <StatusPill
                  status={wordStatus === "not-started" ? "notStarted" : wordStatus as StatusType}
                />
              </Tooltip>
            )}
          </div>

          {/* Right section - Navigation controls, divider, toggle icons */}
          <div className="flex items-center gap-4">
            {/* Replay audio - always visible */}
            <Tooltip label={t("tip_replay_audio")}>
              <button
                onClick={onReplay}
                className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </Tooltip>

            {/* Compact: ellipsis menu for nav + image toggle */}
            {compact && !fromDictionary && (
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center transition-opacity hover:opacity-70",
                    isMoreMenuOpen ? "text-primary" : "text-foreground"
                  )}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 rounded-xl bg-white p-2 shadow-panel">
                    <div className="flex items-center gap-2">
                      <Tooltip label={t("tip_first_word")}>
                        <button
                          onClick={() => { onJumpToWord(0); setIsMoreMenuOpen(false); }}
                          className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
                        >
                          <ChevronsLeft className="h-5 w-5" />
                        </button>
                      </Tooltip>
                      <Tooltip label={t("tip_previous_word")}>
                        <button
                          onClick={() => { onPreviousWord(); setIsMoreMenuOpen(false); }}
                          disabled={!hasPrevious}
                          className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                      </Tooltip>
                      <Tooltip label={t("tip_next_word")}>
                        <button
                          onClick={() => { onNextWord(); setIsMoreMenuOpen(false); }}
                          disabled={!hasNext}
                          className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </Tooltip>
                      <Tooltip label={t("tip_last_word")}>
                        <button
                          onClick={() => { onJumpToWord(totalWords - 1); setIsMoreMenuOpen(false); }}
                          className="flex h-6 w-6 items-center justify-center text-foreground transition-opacity hover:opacity-70"
                        >
                          <ChevronsRight className="h-5 w-5" />
                        </button>
                      </Tooltip>
                      <span className="text-foreground/25">|</span>
                      <Tooltip label={imageMode === "memory-trigger" ? t("tip_show_flashcard") : t("tip_show_memory_trigger")} align="right">
                        <button
                          onClick={() => {
                            const newMode = imageMode === "memory-trigger" ? "flashcard" : "memory-trigger";
                            onImageModeChange?.(newMode);
                            setIsMoreMenuOpen(false);
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
                )}
              </div>
            )}

            {/* Full: inline nav controls + image toggle */}
            {!compact && (
              <>
                {!fromDictionary && (
                  <>
                    <div className="flex items-center gap-2">
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

                {/* Toggle icons */}
                <div className="flex items-center gap-3">
                  <Tooltip label={imageMode === "memory-trigger" ? t("tip_show_flashcard") : t("tip_show_memory_trigger")} align="right">
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
