"use client";

import { BookOpen, ClipboardPen, Clock, Pause, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { XpIcon } from "@/components/ui/xp-icon";
import { formatDuration } from "@/lib/utils/helpers";
import { WordTrackerDots, type WordTrackerResult } from "./WordTrackerDots";

interface StudyNavbarProps {
  courseName?: string;
  elapsedSeconds: number;
  onExitLesson: () => void;
  /** Mode: "study" or "test" - affects badge styling and exit button text */
  mode?: "study" | "test";
  /** Lesson number and title shown in header */
  lessonNumber?: number;
  lessonTitle?: string;
  /** Word progress - current index */
  currentWordIndex?: number;
  /** Word progress - total words */
  totalWords?: number;
  /** Word progress - completed word indices */
  completedWordIndices?: number[];
  /** Word progress - callback when dot is clicked */
  onJumpToWord?: (index: number) => void;
  /** Whether the timer is paused due to inactivity */
  isTimerPaused?: boolean;
  /** Test mode results: map of word index to points earned / max */
  testResults?: Map<number, WordTrackerResult>;
  /** Test mode: running score - points earned so far */
  testPointsEarned?: number;
  /** Test mode: running score - max possible points so far */
  testMaxPoints?: number;
  /** Category per word index — for tracker dots and word count */
  categories?: (string | null)[];
  /** When true, this session only contains the user's previously incorrect words. */
  incorrectWords?: boolean;
}

export function StudyNavbar({
  courseName,
  elapsedSeconds,
  onExitLesson,
  mode = "study",
  lessonNumber,
  lessonTitle,
  currentWordIndex = 0,
  totalWords = 0,
  completedWordIndices = [],
  onJumpToWord,
  isTimerPaused = false,
  testResults,
  testPointsEarned = 0,
  testMaxPoints = 0,
  categories,
  incorrectWords = false,
}: StudyNavbarProps) {
  const isTestMode = mode === "test";
  const testScorePercent = testMaxPoints > 0 ? Math.round((testPointsEarned / testMaxPoints) * 100) : 0;

  // Badge styling differs by mode
  const badgeBgColor = isTestMode ? "bg-[rgba(255,149,0,0.3)]" : "bg-[rgba(65,207,30,0.3)]";
  const badgeTextColor = isTestMode ? "text-[#E67E00]" : "text-[#22ac00]";
  const badgeText = `${isTestMode ? "Test mode" : "Study mode"}${incorrectWords ? " · Incorrect Words" : ""}`;
  // Mobile drops the word "mode" to save room in the top row.
  const badgeTextMobile = `${isTestMode ? "Test" : "Study"}${incorrectWords ? " · Incorrect Words" : ""}`;
  const BadgeIcon = isTestMode ? ClipboardPen : BookOpen;
  const exitButtonText = isTestMode ? "Exit test" : "Exit lesson";

  const showWordProgress = totalWords > 0 && onJumpToWord;

  // Word count (excluding information pages) — shared by both layouts.
  const nonInfoCount = categories
    ? categories.filter((c) => c !== "information").length
    : totalWords;
  let currentWordNumber = 0;
  for (let i = 0; i <= currentWordIndex; i++) {
    if (categories?.[i] !== "information") currentWordNumber++;
  }
  const isCurrentInfo = categories?.[currentWordIndex] === "information";
  const wordCountLabel = isCurrentInfo
    ? `Word – of ${nonInfoCount}`
    : `Word ${currentWordNumber} of ${nonInfoCount}`;

  return (
    <div className="fixed top-0 left-0 right-0 z-20 h-[72px] bg-white">
      {/* Desktop layout — single row */}
      <div className="hidden h-full items-center justify-between gap-4 px-6 pr-8 md:flex">
        {/* Left side - Mode badge, lesson, word progress, score */}
        <div className="flex min-w-0 items-center gap-4">
          {/* Mode badge */}
          <div className={`flex items-center gap-1.5 rounded-lg ${badgeBgColor} px-3 py-1.5`}>
            <BadgeIcon className={`h-4 w-4 shrink-0 ${badgeTextColor}`} />
            <span className={`text-regular-semibold ${badgeTextColor}`}>{badgeText}</span>
          </div>

          {/* Lesson name and number */}
          {lessonNumber != null && lessonTitle && (
            <span
              className="min-w-0 shrink truncate text-small-semibold text-foreground"
              title={`#${lessonNumber} · ${lessonTitle}`}
            >
              #{lessonNumber} · {lessonTitle}
            </span>
          )}

          {/* Divider between lesson title and word progress */}
          {lessonNumber != null && lessonTitle && showWordProgress && (
            <span className="shrink-0 text-small-semibold text-foreground/25">|</span>
          )}

          {/* Word progress with dots */}
          {showWordProgress && (
            <div className="flex min-w-0 shrink-[5] items-center gap-1.5">
              <span className="w-[100px] shrink-0 text-small-semibold text-foreground">
                {wordCountLabel}
              </span>
              <div className="min-w-0">
                <WordTrackerDots
                  totalWords={totalWords}
                  currentIndex={currentWordIndex}
                  completedIndices={completedWordIndices}
                  onDotClick={onJumpToWord}
                  disabled={isTestMode}
                  testResults={testResults}
                  categories={categories}
                />
              </div>
            </div>
          )}

          {/* Test score (test mode only) */}
          {isTestMode && (
            <>
              <span className="shrink-0 text-small-semibold text-foreground/25">|</span>
              <span className="inline-flex shrink-0 items-center gap-1 text-small-semibold text-foreground">
                Test score
                <XpIcon className="size-3.5" />
                {testPointsEarned}/{testMaxPoints} XP ({testScorePercent}%)
              </span>
            </>
          )}
        </div>

        {/* Right side - Timer and Exit button */}
        <div className="flex items-center gap-4">
          <div className="flex cursor-default items-center gap-1.5 text-foreground">
            {isTimerPaused ? (
              <Pause className="h-4 w-4" fill="currentColor" strokeWidth={0} />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            <span className="text-regular-semibold tabular-nums">
              {formatDuration(elapsedSeconds, { style: "timer" })}
              {isTimerPaused && " (paused)"}
            </span>
          </div>

          <Button variant="outline" onClick={onExitLesson} className="gap-1.5">
            {exitButtonText}
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile layout — badge + lesson + X on top row, stats on a second row */}
      <div className="flex h-full flex-col justify-center gap-1 px-4 md:hidden">
        {/* Row 1: mode badge (compact) + lesson name + exit X */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className={`flex shrink-0 items-center gap-1 rounded-md ${badgeBgColor} px-2 py-1`}>
              <BadgeIcon className={`h-3.5 w-3.5 shrink-0 ${badgeTextColor}`} />
              <span className={`text-small-semibold ${badgeTextColor}`}>{badgeTextMobile}</span>
            </div>
            {lessonNumber != null && lessonTitle && (
              <span
                className="min-w-0 truncate text-small-semibold text-foreground"
                title={`#${lessonNumber} · ${lessonTitle}`}
              >
                #{lessonNumber} · {lessonTitle}
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label={exitButtonText}
            onClick={onExitLesson}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-bone-hover"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Row 2: word count · score · timer — smaller and recessed */}
        <div className="flex min-w-0 items-center gap-2 text-xs-medium text-foreground/60">
          {showWordProgress && <span className="shrink-0">{wordCountLabel}</span>}

          {isTestMode && (
            <>
              <span className="shrink-0 text-foreground/25">|</span>
              <span className="inline-flex shrink-0 items-center gap-1">
                <XpIcon className="size-3" />
                {testPointsEarned}/{testMaxPoints} ({testScorePercent}%)
              </span>
            </>
          )}

          <span className="shrink-0 text-foreground/25">|</span>
          <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
            {isTimerPaused ? (
              <Pause className="h-3 w-3" fill="currentColor" strokeWidth={0} />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            {formatDuration(elapsedSeconds, { style: "timer" })}
          </span>
        </div>
      </div>
    </div>
  );
}
