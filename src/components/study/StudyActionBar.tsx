"use client";

import { useState, useRef, useEffect } from "react";
import {
  RefreshCw,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Puzzle,
  Image as ImageIcon,
  Music,
  SlidersHorizontal,
  Languages,
  Zap,
  Play,
  Pause,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { Popover } from "@/components/ui/popover";
import { BreathingIndicator, type BreathingPhase } from "./BreathingIndicator";
import { useText } from "@/context/TextContext";

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

import type { StudyMusicTrack } from "@/hooks/useStudyMusic";

/** Animated audiowave icon for playing state */
function AudioWaveIcon({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-[2px]", className)}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-primary animate-audiowave"
          style={{
            animationDelay: `${(i - 1) * 0.15}s`,
            height: i === 2 ? "12px" : "8px",
          }}
        />
      ))}
    </div>
  );
}

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
  timesTested: number;
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
  /** Gender: m, f, n, mf */
  gender?: string | null;
  /** Word category (fact, phrase, sentence, word, information) */
  category?: string | null;
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
  /** Whether background music is enabled */
  musicEnabled?: boolean;
  /** Available music tracks */
  musicTracks?: StudyMusicTrack[];
  /** Currently selected music track */
  selectedTrack?: string;
  /** Callback when a track is toggled (play/pause) */
  onToggleTrack?: (trackId: string) => void;
  /** Whether music playback has an error */
  musicHasError?: boolean;
  /** Current music volume (0-1) */
  musicVolume?: number;
  /** Callback when music volume changes */
  onMusicVolumeChange?: (volume: number) => void;
  /** Current word audio volume (0-1) */
  wordVolume?: number;
  /** Callback when word volume changes */
  onWordVolumeChange?: (volume: number) => void;
  /** Whether user is an admin */
  isAdmin?: boolean;
  /** Whether admin edit mode is active */
  isEditMode?: boolean;
  /** Callback when edit mode is toggled */
  onEditModeToggle?: () => void;
  /** Whether breathing mode is enabled */
  breathingModeEnabled?: boolean;
  /** Callback when breathing mode changes */
  onBreathingModeChange?: (enabled: boolean) => void;
  /** Current breathing phase (only set when breathing mode is active) */
  breathingPhase?: BreathingPhase | null;
  /** Current second within breathing phase (0-3) */
  breathingSecond?: number;
  /** Whether breathing indicator should be visible */
  breathingActive?: boolean;
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

export function StudyActionBar({
  currentWordIndex,
  totalWords,
  englishWord,
  foreignWord,
  partOfSpeech,
  gender,
  category,
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
  musicEnabled = false,
  musicTracks = [],
  selectedTrack = "",
  onToggleTrack,
  musicHasError = false,
  musicVolume = 0.5,
  onMusicVolumeChange,
  wordVolume = 1,
  onWordVolumeChange,
  isAdmin = false,
  isEditMode = false,
  onEditModeToggle,
  breathingModeEnabled = false,
  onBreathingModeChange,
  breathingPhase = null,
  breathingSecond = 0,
  breathingActive = false,
}: StudyActionBarProps) {
  const { t, tt } = useText();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccentsOpen, setIsAccentsOpen] = useState(false);
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const accentsRef = useRef<HTMLDivElement>(null);
  const musicRef = useRef<HTMLDivElement>(null);

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
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
      if (accentsRef.current && !accentsRef.current.contains(event.target as Node)) {
        setIsAccentsOpen(false);
      }
      if (musicRef.current && !musicRef.current.contains(event.target as Node)) {
        setIsMusicOpen(false);
      }
    }
    if (isSettingsOpen || isAccentsOpen || isMusicOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isSettingsOpen, isAccentsOpen, isMusicOpen]);

  // Use historical score percentage from scoreStats
  const wordScorePercent = scoreStats?.scorePercent ?? 0;

  // For test mode: can reveal clue if not at max level (2) and answer not yet submitted
  const canRevealClue = isTestMode && clueLevel < 2 && !hasSubmittedAnswer;

  const posAbbrev = abbreviatePartOfSpeech(partOfSpeech);
  const genderAbbrev = gender && ["m", "f", "n", "mf"].includes(gender) ? gender : "";
  // In test mode, hide gender until answer submitted (same as foreign word)
  const showGender = !isTestMode || hasSubmittedAnswer;
  const label = category === "word" || posAbbrev ? posAbbrev : "";
  const posDisplay = label && genderAbbrev && showGender
    ? `${label} ${genderAbbrev}`
    : label;
  const fullGenderName = gender === "m" ? "masculine" : gender === "f" ? "feminine" : gender === "n" ? "neuter" : gender === "mf" ? "mixed" : null;
  const isNoun = partOfSpeech?.toLowerCase().includes("noun");
  const posTooltipLabel = posAbbrev
    ? isNoun && fullGenderName && showGender
      ? `${fullPartOfSpeech(partOfSpeech)} (${fullGenderName})`
      : fullPartOfSpeech(partOfSpeech)
    : "";
  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        {/* Left section - word info, score */}
        <div className="flex items-center gap-4">
          {/* Word text: english · foreign + part of speech */}
          {/* In test mode, hide foreign word until answer submitted */}
          <div className="flex items-center gap-2">
            <span className="text-regular-semibold text-foreground">
              {isTestMode && !hasSubmittedAnswer ? englishWord : `${englishWord} · ${foreignWord}`}
            </span>
            {posDisplay && (
              <Tooltip label={posTooltipLabel}>
                <span className="text-small-medium text-foreground/50 cursor-default">
                  {posDisplay}
                </span>
              </Tooltip>
            )}
          </div>

          {/* Traffic lights (last 3 test attempts) + historical score percentage — hidden for info pages */}
          {category !== "information" && (
            <>
              {/* Divider */}
              <span className="text-foreground/25">|</span>

              {/* Display order: oldest on left, newest on right, empty slots on right */}
              <Popover
                position="above"
                align="left"
                className="flex items-center cursor-default"
                content={
                  <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{t("pop_score_history")}</span>
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
                      // testHistory is ordered newest-first; take most recent 3 and
                      // reverse so left=oldest, right=newest
                      const recent = testHistory.slice(0, 3);
                      const reversedIndex = recent.length - 1 - i;
                      const attempt = reversedIndex >= 0 ? recent[reversedIndex] : undefined;

                      // Green = full points, Orange = partial, Red = 0 points, Gray = no attempt
                      let bgColor = "bg-gray-300"; // No attempt
                      if (attempt) {
                        if (attempt.pointsEarned >= attempt.maxPoints) {
                          bgColor = "bg-success";
                        } else if (attempt.pointsEarned > 0) {
                          bgColor = "bg-[#F5D245]";
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
            </>
          )}
        </div>

        {/* Right section - Breathing indicator, Accents + Clue button (grouped), Navigation controls, divider, toggle icons */}
        <div className="flex items-center gap-4">
          {/* Breathing indicator (study mode only) */}
          {!isTestMode && breathingActive && breathingPhase && (
            <>
              <BreathingIndicator
                phase={breathingPhase}
                second={breathingSecond}
                isActive={true}
              />
              <span className="text-foreground/25">|</span>
            </>
          )}

          {/* Test mode clue button */}
          {isTestMode && (
            <>
              <button
                onClick={onRevealClue}
                disabled={!canRevealClue}
                className={cn(
                  "relative flex h-6 w-6 items-center justify-center",
                  canRevealClue
                    ? "text-foreground"
                    : "text-foreground opacity-30 cursor-not-allowed"
                )}
                title={canRevealClue ? tt("msg_reveal_clue", { remaining: 2 - clueLevel }) : t("msg_no_clues")}
              >
                <Puzzle className="h-5 w-5" />
                {canRevealClue && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {2 - clueLevel}
                  </span>
                )}
              </button>
              <span className="text-foreground/25">|</span>
            </>
          )}

          {/* Navigation controls */}
          <div className="flex items-center gap-2">
            <Tooltip label={t("tip_replay_audio")}>
              <button
                onClick={onRestart}
                disabled={isTestMode && !hasSubmittedAnswer}
                className="flex h-6 w-6 items-center justify-center text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </Tooltip>
            {/* Skip to first - study mode only */}
            {!isTestMode && (
              <Tooltip label={t("tip_first_word")}>
                <button
                  onClick={() => onJumpToWord(0)}
                  className="flex h-6 w-6 items-center justify-center text-foreground transition-colors"
                >
                  <ChevronsLeft className="h-5 w-5" />
                </button>
              </Tooltip>
            )}
            {/* Previous word */}
            <Tooltip label={t("tip_previous_word")}>
              <button
                onClick={onPreviousWord}
                disabled={!canGoPrevious}
                className="flex h-6 w-6 items-center justify-center text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </Tooltip>
            {/* Next word */}
            <Tooltip label={t("tip_next_word")}>
              <button
                onClick={onNextWord}
                disabled={!canGoNext}
                className="flex h-6 w-6 items-center justify-center text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </Tooltip>
            {/* Skip to last - study mode only */}
            {!isTestMode && (
              <Tooltip label={t("tip_last_word")}>
                <button
                  onClick={() => onJumpToWord(totalWords - 1)}
                  className="flex h-6 w-6 items-center justify-center text-foreground transition-colors"
                >
                  <ChevronsRight className="h-5 w-5" />
                </button>
              </Tooltip>
            )}
          </div>

          {/* Divider */}
          <span className="text-foreground/25">|</span>

          {/* Toggle icons */}
          <div className="flex items-center gap-3">
            {/* Admin edit mode toggle */}
            {isAdmin && onEditModeToggle && (
              <Tooltip label={isEditMode ? t("tip_exit_edit") : t("tip_edit_word")}>
                <button
                  onClick={onEditModeToggle}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                    isEditMode
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:text-primary"
                  )}
                >
                  <Pencil className="h-5 w-5" />
                </button>
              </Tooltip>
            )}
            {/* Accented characters button */}
            {showAccentsButton && (
              <div className="relative" ref={accentsRef}>
                <Tooltip label={t("tip_accents")}>
                  <button
                    onClick={() => setIsAccentsOpen(!isAccentsOpen)}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                      isAccentsOpen ? "bg-primary/10 text-primary" : "text-foreground"
                    )}
                  >
                    <Languages className="h-5 w-5" />
                  </button>
                </Tooltip>

                {/* Accented characters panel */}
                {isAccentsOpen && (
                  <div className="absolute bottom-full right-0 mb-2">
                    <div className="w-[340px] rounded-xl bg-white p-3 shadow-panel">
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                        {t("label_accented_chars")}
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
            <Tooltip label={imageMode === "memory-trigger" ? t("tip_show_flashcard") : t("tip_show_memory_trigger")}>
              <button
                onClick={() => onImageModeChange?.(imageMode === "memory-trigger" ? "flashcard" : "memory-trigger")}
                className="flex h-6 w-6 items-center justify-center text-foreground transition-colors hover:text-primary"
              >
                {imageMode === "memory-trigger" ? (
                  <Zap className="h-5 w-5" />
                ) : (
                  <ImageIcon className="h-5 w-5" />
                )}
              </button>
            </Tooltip>
            {/* Music button with dropdown */}
            <div className="relative" ref={musicRef}>
              <button
                onClick={() => setIsMusicOpen(!isMusicOpen)}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                  isMusicOpen || musicEnabled ? "text-primary" : "text-foreground"
                )}
                title={t("label_background_music")}
              >
                {musicEnabled && !musicHasError ? (
                  <AudioWaveIcon />
                ) : (
                  <Music className="h-5 w-5" />
                )}
              </button>

              {/* Music dropdown */}
              {isMusicOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-[320px] rounded-xl bg-white p-4 shadow-panel">
                  <div className="mb-3 text-xs font-medium uppercase tracking-wide text-foreground/50">
                    {t("label_study_music")}
                  </div>

                  {/* Track list */}
                  <div className="mb-4 space-y-1">
                    {musicTracks.map((track) => {
                      const isSelected = selectedTrack === track.id;
                      const isPlayingTrack = isSelected && musicEnabled && !musicHasError;
                      const isHovered = hoveredTrack === track.id;
                      const mins = Math.floor(track.duration_seconds / 60);
                      const durationLabel = mins >= 60
                        ? `${Math.floor(mins / 60)}h ${mins % 60}m`
                        : `${mins} min`;
                      return (
                        <button
                          key={track.id}
                          onClick={() => onToggleTrack?.(track.id)}
                          onMouseEnter={() => setHoveredTrack(track.id)}
                          onMouseLeave={() => setHoveredTrack(null)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors",
                            isPlayingTrack
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-gray-50"
                          )}
                        >
                          {/* Play / Pause / Audiowave icon */}
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                            {isPlayingTrack && isHovered ? (
                              <Pause className="h-4 w-4 text-primary" />
                            ) : isPlayingTrack ? (
                              <AudioWaveIcon />
                            ) : (
                              <Play
                                className={cn(
                                  "h-4 w-4",
                                  isSelected ? "text-primary" : "text-muted-foreground"
                                )}
                              />
                            )}
                          </div>
                          <span className="flex-1 text-sm font-medium">{track.name}</span>
                          <span className="text-xs text-muted-foreground">{durationLabel}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Volume sliders */}
                  <div className="mb-4 space-y-3">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{t("label_music_volume")}</span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(musicVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(musicVolume * 100)}
                        onChange={(e) => onMusicVolumeChange?.(Number(e.target.value) / 100)}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary"
                      />
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{t("label_word_volume")}</span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(wordVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(wordVolume * 100)}
                        onChange={(e) => onWordVolumeChange?.(Number(e.target.value) / 100)}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary"
                      />
                    </div>
                  </div>

                  {/* Error message */}
                  {musicHasError && (
                    <div className="mb-4 rounded-lg bg-destructive/10 p-3">
                      <p className="text-xs leading-relaxed text-destructive">
                        {t("msg_music_error")}
                      </p>
                    </div>
                  )}

                  {/* Explainer */}
                  <div className="rounded-lg bg-bone p-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">{t("msg_alpha_wave_title")}</span> {t("msg_alpha_wave_desc")}
                    </p>
                  </div>
                </div>
              )}
            </div>
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
                <div className="absolute bottom-full right-0 mb-2 w-[280px] rounded-xl bg-white p-4 shadow-panel">
                  <div className="mb-3 text-xs font-medium uppercase tracking-wide text-foreground/50">
                    {isTestMode ? t("label_test_settings") : t("label_lesson_settings")}
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
                            {t("msg_nerves_of_steel")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("msg_nerves_of_steel_desc")}
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
                            {t("btn_test_twice")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {testTwice ? t("label_enabled") : t("label_disabled")} · {t("msg_set_before_test")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Study mode settings */
                    <div className="space-y-4">
                      {/* Strict Study Mode Toggle */}
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={strictMode}
                          onChange={(e) => onStrictModeChange?.(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">
                            {t("label_strict_study_mode")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("msg_strict_study_desc")}
                          </div>
                        </div>
                      </label>

                      {/* Breathing Mode Toggle */}
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={breathingModeEnabled}
                          onChange={(e) => onBreathingModeChange?.(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">
                            {t("msg_breathing_mode")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("msg_breathing_mode_desc")}
                          </div>
                        </div>
                      </label>
                    </div>
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
