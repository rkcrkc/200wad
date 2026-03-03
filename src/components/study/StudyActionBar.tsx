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
  Languages,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Accented characters for European languages */
const ACCENTED_CHARACTERS: Record<string, string[]> = {
  fr: ["à", "â", "æ", "ç", "é", "è", "ê", "ë", "î", "ï", "ô", "œ", "ù", "û", "ü", "ÿ"],
  de: ["ä", "ö", "ü", "ß"],
  it: ["à", "è", "é", "ì", "ò", "ó", "ù"],
  es: ["á", "é", "í", "ó", "ú", "ü", "ñ", "¿", "¡"],
  cy: ["â", "ê", "î", "ô", "û", "ŵ", "ŷ"],
};

/** Keyboard shortcuts for each accented character (Mac) */
const MAC_SHORTCUTS: Record<string, string> = {
  // Acute (Option + e, then vowel)
  "á": "Option+e a", "é": "Option+e e", "í": "Option+e i", "ó": "Option+e o", "ú": "Option+e u",
  // Grave (Option + `, then vowel)
  "à": "Option+` a", "è": "Option+` e", "ì": "Option+` i", "ò": "Option+` o", "ù": "Option+` u",
  // Umlaut (Option + u, then vowel)
  "ä": "Option+u a", "ë": "Option+u e", "ï": "Option+u i", "ö": "Option+u o", "ü": "Option+u u", "ÿ": "Option+u y",
  // Circumflex (Option + i, then vowel)
  "â": "Option+i a", "ê": "Option+i e", "î": "Option+i i", "ô": "Option+i o", "û": "Option+i u",
  // Welsh circumflex (same pattern)
  "ŵ": "Option+i w", "ŷ": "Option+i y",
  // Special characters
  "ñ": "Option+n n", "ç": "Option+c", "ß": "Option+s",
  "æ": "Option+'", "œ": "Option+q",
  "¿": "Option+?", "¡": "Option+1",
};

/** Keyboard shortcuts for each accented character (Windows - US International) */
const WIN_SHORTCUTS: Record<string, string> = {
  // Acute (' then vowel)
  "á": "' a", "é": "' e", "í": "' i", "ó": "' o", "ú": "' u",
  // Grave (` then vowel)
  "à": "` a", "è": "` e", "ì": "` i", "ò": "` o", "ù": "` u",
  // Umlaut (" then vowel)
  "ä": "\" a", "ë": "\" e", "ï": "\" i", "ö": "\" o", "ü": "\" u", "ÿ": "\" y",
  // Circumflex (^ then vowel)
  "â": "^ a", "ê": "^ e", "î": "^ i", "ô": "^ o", "û": "^ u",
  // Welsh circumflex
  "ŵ": "^ w", "ŷ": "^ y",
  // Special characters
  "ñ": "~ n", "ç": "' c",
  "ß": "Ctrl+Alt+s",
  "æ": "Ctrl+Alt+z", "œ": "",
  "¿": "Alt+?", "¡": "Alt+1",
};

/** Check if a language has accented characters */
function hasAccentedCharacters(languageCode?: string | null): boolean {
  return !!languageCode && languageCode in ACCENTED_CHARACTERS;
}

/** Get accented characters for a language */
function getAccentedCharacters(languageCode?: string | null): string[] {
  if (!languageCode) return [];
  return ACCENTED_CHARACTERS[languageCode] || [];
}

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
  /** Last 3 test attempts for current word - "traffic lights" (most recent first) */
  testHistory?: TestAttempt[];
  /** Historical score stats for current word */
  scoreStats?: WordScoreStats;
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
  /** Whether strict study mode is enabled */
  strictMode?: boolean;
  /** Callback when strict mode changes */
  onStrictModeChange?: (enabled: boolean) => void;
  /** For test mode: whether user has submitted answer (enables replay) */
  hasSubmittedAnswer?: boolean;
  /** For test mode: whether nerves of steel mode is enabled (punctuation counts) */
  nervesOfSteelMode?: boolean;
  /** Callback when nerves of steel mode changes */
  onNervesOfSteelModeChange?: (enabled: boolean) => void;
  /** For test mode: whether test twice mode is enabled (read-only display) */
  testTwice?: boolean;
  /** Language code for accented characters (e.g., "fr", "de", "it") */
  languageCode?: string | null;
  /** Callback to insert an accented character into the answer input */
  onInsertCharacter?: (char: string) => void;
  /** Image display mode: "memory-trigger" (default) or "flashcard" */
  imageMode?: "memory-trigger" | "flashcard";
  /** Callback when image mode changes */
  onImageModeChange?: (mode: "memory-trigger" | "flashcard") => void;
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
  scoreStats,
  onJumpToWord,
  onPreviousWord,
  onNextWord,
  onRestart,
  mode = "study",
  clueLevel = 0,
  onRevealClue,
  strictMode = false,
  onStrictModeChange,
  hasSubmittedAnswer = false,
  nervesOfSteelMode = false,
  onNervesOfSteelModeChange,
  testTwice = false,
  languageCode,
  onInsertCharacter,
  imageMode = "memory-trigger",
  onImageModeChange,
}: StudyActionBarProps) {
  const [isWordListOpen, setIsWordListOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccentsOpen, setIsAccentsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const accentsRef = useRef<HTMLDivElement>(null);

  // Detect platform for keyboard shortcuts
  const isMac = typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac");
  const shortcuts = isMac ? MAC_SHORTCUTS : WIN_SHORTCUTS;

  const accentedChars = getAccentedCharacters(languageCode);
  const showAccentsButton = hasAccentedCharacters(languageCode) && onInsertCharacter;

  const isTestMode = mode === "test";

  // In test mode, can only navigate to words that have been reached
  const maxReachedIndex = completedWordIndices.length > 0
    ? Math.max(...completedWordIndices)
    : 0;

  const canGoPrevious = isTestMode
    ? currentWordIndex > 0
    : currentWordIndex > 0;
  const canGoNext = isTestMode
    ? currentWordIndex < maxReachedIndex
    : currentWordIndex < totalWords - 1;

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWordListOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
      if (accentsRef.current && !accentsRef.current.contains(event.target as Node)) {
        setIsAccentsOpen(false);
      }
    }
    if (isWordListOpen || isSettingsOpen || isAccentsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isWordListOpen, isSettingsOpen, isAccentsOpen]);

  // Use historical score percentage from scoreStats
  const wordScorePercent = scoreStats?.scorePercent ?? 0;

  // For test mode: can reveal clue if not at max level (2) and answer not yet submitted
  const canRevealClue = isTestMode && clueLevel < 2 && !hasSubmittedAnswer;

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
          {/* Menu button with word list dropdown - hidden in test mode */}
          {!isTestMode && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsWordListOpen(!isWordListOpen)}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                  isWordListOpen ? "bg-primary/10 text-primary" : "text-foreground"
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
          )}

          {/* Word text: english · foreign + part of speech */}
          {/* In test mode, hide foreign word until answer submitted */}
          <div className="flex items-center gap-2">
            <span className="text-regular-semibold text-foreground">
              {isTestMode && !hasSubmittedAnswer ? englishWord : `${englishWord} · ${foreignWord}`}
            </span>
            {posAbbrev && (
              <span className="text-small-medium text-foreground/50">
                {posAbbrev}
              </span>
            )}
          </div>

          {/* Divider */}
          <span className="text-foreground/25">|</span>

          {/* Traffic lights (last 3 test attempts) + historical score percentage */}
          {/* Display order: oldest on left, newest on right, empty slots on right */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => {
                // testHistory is ordered newest-first, so reverse for display
                // Position 0 (left) = oldest, Position 2 (right) = newest
                const historyLength = testHistory.length;
                const reversedIndex = historyLength - 1 - i;
                const attempt = reversedIndex >= 0 ? testHistory[reversedIndex] : undefined;

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

        {/* Right section - Accents + Clue button (grouped), Navigation controls, divider, toggle icons */}
        <div className="flex items-center gap-4">
          {/* Accents + Clue button group */}
          {(showAccentsButton || isTestMode) && (
            <>
              <div className="flex items-center gap-2">
                {/* Accented characters button */}
                {showAccentsButton && (
                  <div className="relative" ref={accentsRef}>
                    <button
                      onClick={() => setIsAccentsOpen(!isAccentsOpen)}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                        isAccentsOpen ? "bg-primary/10 text-primary" : "text-foreground"
                      )}
                      title="Accented characters"
                    >
                      <Languages className="h-5 w-5" />
                    </button>

                    {/* Accented characters panel */}
                    {isAccentsOpen && (
                      <div className="absolute bottom-full left-0 mb-2 -translate-x-1/2">
                        <div className="w-[340px] rounded-xl bg-white p-3 shadow-[0px_5px_40px_-10px_rgba(0,0,0,0.25)]">
                          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                            Accented characters
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            {accentedChars.map((char) => (
                              <button
                                key={char}
                                onClick={() => {
                                  onInsertCharacter?.(char);
                                  setIsAccentsOpen(false);
                                }}
                                className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-left"
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-base font-medium text-foreground transition-colors group-hover:bg-primary group-hover:text-white">
                                  {char}
                                </span>
                                {shortcuts[char] && (
                                  <span className="truncate text-xs text-foreground/50">
                                    {shortcuts[char]}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Test mode clue button */}
                {isTestMode && (
                  <button
                    onClick={onRevealClue}
                    disabled={!canRevealClue}
                    className={cn(
                      "relative flex h-6 w-6 items-center justify-center",
                      canRevealClue
                        ? "text-foreground"
                        : "text-foreground opacity-30 cursor-not-allowed"
                    )}
                    title={canRevealClue ? `Reveal clue (${2 - clueLevel} remaining)` : "0 clues remaining"}
                  >
                    <Puzzle className="h-5 w-5" />
                    {canRevealClue && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                        {2 - clueLevel}
                      </span>
                    )}
                  </button>
                )}
              </div>
              <span className="text-foreground/25">|</span>
            </>
          )}

          {/* Navigation controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRestart}
              disabled={isTestMode && !hasSubmittedAnswer}
              className="flex h-6 w-6 items-center justify-center text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Replay"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            {/* Skip to first - study mode only */}
            {!isTestMode && (
              <button
                onClick={() => onJumpToWord(0)}
                className="flex h-6 w-6 items-center justify-center text-foreground transition-colors"
                title="Go to first word"
              >
                <SkipBack className="h-5 w-5" />
              </button>
            )}
            {/* Previous word */}
            <button
              onClick={onPreviousWord}
              disabled={!canGoPrevious}
              className="flex h-6 w-6 items-center justify-center text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous word"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            {/* Next word */}
            <button
              onClick={onNextWord}
              disabled={!canGoNext}
              className="flex h-6 w-6 items-center justify-center text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next word"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            {/* Skip to last - study mode only */}
            {!isTestMode && (
              <button
                onClick={() => onJumpToWord(totalWords - 1)}
                className="flex h-6 w-6 items-center justify-center text-foreground transition-colors"
                title="Go to last word"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Divider */}
          <span className="text-foreground/25">|</span>

          {/* Toggle icons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onImageModeChange?.(imageMode === "memory-trigger" ? "flashcard" : "memory-trigger")}
              className="flex h-6 w-6 items-center justify-center text-foreground transition-colors hover:text-primary"
              title={imageMode === "memory-trigger" ? "Switch to flashcard" : "Switch to memory trigger"}
            >
              {imageMode === "memory-trigger" ? (
                <Zap className="h-5 w-5" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </button>
            <button
              className="flex h-6 w-6 items-center justify-center text-foreground transition-colors"
              title="Toggle audio"
            >
              <Music className="h-5 w-5" />
            </button>
            {/* Settings button with dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                  isSettingsOpen ? "bg-primary/10 text-primary" : "text-foreground"
                )}
                title="Settings"
              >
                <SlidersHorizontal className="h-5 w-5" />
              </button>

              {/* Settings dropdown */}
              {isSettingsOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-[280px] rounded-xl bg-white p-4 shadow-[0px_5px_40px_-10px_rgba(0,0,0,0.25)]">
                  <div className="mb-3 text-xs font-medium uppercase tracking-wide text-foreground/50">
                    {isTestMode ? "Test Settings" : "Lesson Settings"}
                  </div>

                  {isTestMode ? (
                    <div className="space-y-4">
                      {/* Nerves of Steel Mode Toggle */}
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={nervesOfSteelMode}
                          onChange={(e) => onNervesOfSteelModeChange?.(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">
                            Nerves of steel mode
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Punctuation and capitalization must be correct for full points
                          </div>
                        </div>
                      </label>

                      {/* Test Twice Display (locked) */}
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 opacity-60",
                            testTwice ? "border-primary bg-primary" : "border-gray-300 bg-white"
                          )}
                        >
                          {testTwice && (
                            <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 opacity-60">
                          <div className="text-sm font-medium text-foreground">
                            Test twice
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {testTwice ? "Enabled" : "Disabled"} · Set before starting test
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Strict Study Mode Toggle - Study mode */
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={strictMode}
                        onChange={(e) => onStrictModeChange?.(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">
                          Strict study mode
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Requires typing the correct answer before moving to the next word
                        </div>
                      </div>
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
