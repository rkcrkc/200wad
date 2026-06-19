"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface WordListItem {
  id: string;
  english: string;
  foreign: string;
  /** Effective thumbnail image for the word (already resolved at the call site) */
  imageUrl?: string | null;
}

interface StudyWordListSidebarProps {
  wordList: WordListItem[];
  currentWordIndex: number;
  completedWordIndices: number[];
  onJumpToWord: (index: number) => void;
  mode?: "study" | "test";
  /** For test mode: map of word index -> per-word score (presence indicates answered) */
  testResults?: Map<number, { pointsEarned: number; maxPoints: number }>;
  /**
   * For test mode: indices whose secondary text (foreign answer) must be
   * hidden even when the word has a testResult. Used in testTwice mode so
   * an already-answered round-1 entry doesn't reveal the answer for the
   * upcoming round-2 occurrence of the same word.
   */
  hideSecondaryIndices?: Set<number>;
  /** Which word to show first: "foreign" (default) or "english" */
  primaryField?: "foreign" | "english";
  /** Category per word index — information pages get no number */
  categories?: (string | null)[];
  /**
   * Optional caption headers to render above specific indices. Used in
   * testTwice mode to mark the start of each round (e.g. 0 → "Round 1",
   * midpoint → "Round 2").
   */
  roundLabels?: Map<number, string>;
}

export function StudyWordListSidebar({
  wordList,
  currentWordIndex,
  completedWordIndices,
  onJumpToWord,
  mode = "study",
  testResults,
  hideSecondaryIndices,
  primaryField = "foreign",
  categories,
  roundLabels,
}: StudyWordListSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentItemRef = useRef<HTMLButtonElement>(null);
  const [showFade, setShowFade] = useState(false);
  const [showTopFade, setShowTopFade] = useState(false);

  const isTestMode = mode === "test";
  const completedSet = new Set(completedWordIndices);

  // Build word number mapping (info pages get null, words get sequential numbers)
  const wordNumbers: (number | null)[] = [];
  let wordCount = 0;
  wordList.forEach((_, i) => {
    if (categories?.[i] === "information") {
      wordNumbers.push(null);
    } else {
      wordCount++;
      wordNumbers.push(wordCount);
    }
  });

  // In test mode, can only navigate to words that have been reached
  const maxReachedIndex = completedWordIndices.length > 0
    ? Math.max(...completedWordIndices)
    : 0;

  // Check if scroll container needs top/bottom fades
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
    const atTop = el.scrollTop < 4;
    setShowFade(hasOverflow && !atBottom);
    setShowTopFade(hasOverflow && !atTop);
  }, []);

  // Auto-scroll current word into view
  useEffect(() => {
    if (currentItemRef.current) {
      currentItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [currentWordIndex]);

  // Check scroll on mount and when word list changes
  useEffect(() => {
    requestAnimationFrame(checkScroll);
  }, [wordList, checkScroll]);

  return (
    <div className="fixed top-[72px] bottom-0 left-0 z-10 flex w-[240px] flex-col bg-white">
      {/* Scrollable word list */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto pt-2 pb-4"
          onScroll={checkScroll}
        >
          <div className="flex flex-col gap-1 px-2">
            {wordList.map((word, index) => {
              const isCurrent = index === currentWordIndex;
              const isCompleted = completedSet.has(index);
              const testResult = testResults?.get(index);
              const hideSecondary = hideSecondaryIndices?.has(index) ?? false;
              const isInfoPage = categories?.[index] === "information";
              const primaryText = primaryField === "english" ? word.english : word.foreign;
              const secondaryText = primaryField === "english" ? word.foreign : word.english;

              // In test mode, disable words not yet reached
              const isDisabled = isTestMode && index > maxReachedIndex;

              // The thumbnail follows the same reveal rule as the secondary
              // text: always shown in study, but in test mode only once the
              // word's answer is revealed (answered, and not suppressed for an
              // upcoming Test-Twice occurrence). Otherwise it would leak a clue.
              const revealThumb =
                !isDisabled && (!isTestMode || (!!testResult && !hideSecondary));

              const roundLabel = roundLabels?.get(index);

              return (
                <div key={`${word.id}-${index}`} className="contents">
                  {roundLabel && (
                    <span
                      className={cn(
                        "block px-2 text-xs font-medium uppercase tracking-wide text-foreground/50",
                        index === 0 ? "pt-1 pb-1.5" : "pt-3 pb-1.5"
                      )}
                    >
                      {roundLabel}
                    </span>
                  )}
                  <button
                  ref={isCurrent ? currentItemRef : undefined}
                  onClick={() => !isDisabled && onJumpToWord(index)}
                  disabled={isDisabled}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                    isCurrent
                      ? "bg-bone-hover"
                      : isDisabled
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-[#FAF8F3]"
                  )}
                >
                  {/* Number (info pages get no number) */}
                  <span className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center text-xs font-medium",
                    isCurrent ? "text-foreground" : "text-foreground/40"
                  )}>
                    {wordNumbers[index] ?? ""}
                  </span>

                  {/* Thumbnail – revealed per the same rule as secondary text.
                      Dimmed to match the recessed text for not-yet-done words. */}
                  <div className={cn(
                    "relative h-7 w-7 shrink-0 overflow-hidden rounded-md transition-opacity",
                    isCurrent || isCompleted || isTestMode ? "opacity-100" : "opacity-40"
                  )}>
                    {revealThumb ? (
                      word.imageUrl ? (
                        <Image
                          src={word.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="28px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm">
                          🗣️
                        </div>
                      )
                    ) : (
                      <div className="h-full w-full bg-foreground/5" />
                    )}
                  </div>

                  {/* Word text – all states share the same fixed height */}
                  <div className="min-w-0 flex-1 h-[36px] flex flex-col justify-center">
                    {isDisabled ? (
                      /* Upcoming words: skeleton placeholders */
                      <>
                        <div className="h-3.5 w-3/4 rounded bg-foreground/10" />
                        <div className="h-2.5 w-1/2 rounded bg-foreground/10 mt-1" />
                      </>
                    ) : isInfoPage ? (
                      /* Information pages: show only english title */
                      <div className={cn(
                        "truncate text-sm font-medium",
                        isCurrent || isCompleted
                          ? "text-foreground"
                          : "text-foreground/40"
                      )}>
                        {word.english}
                      </div>
                    ) : isTestMode && (!testResult || hideSecondary) ? (
                      /*
                       * Test mode, secondary text suppressed:
                       *   - !testResult → word not yet answered (current word)
                       *   - hideSecondary → testTwice mode, this word still has an
                       *     unanswered later occurrence; don't spoil the answer
                       */
                      <div className="truncate text-sm font-medium text-foreground">
                        {primaryText}
                      </div>
                    ) : (
                      <>
                        <div className={cn(
                          "truncate text-sm font-medium",
                          isCurrent || isCompleted || isTestMode
                            ? "text-foreground"
                            : "text-foreground/40"
                        )}>
                          {primaryText}
                        </div>
                        <div className={cn(
                          "truncate text-xs",
                          isCurrent || isCompleted || isTestMode
                            ? "text-muted-foreground"
                            : "text-foreground/30"
                        )}>
                          {secondaryText}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Status indicator (test mode only) */}
                </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top fade gradient */}
        {showTopFade && (
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white to-transparent" />
        )}

        {/* Bottom fade gradient */}
        {showFade && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent" />
        )}
      </div>
    </div>
  );
}
