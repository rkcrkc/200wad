"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface WordListItem {
  id: string;
  english: string;
  foreign: string;
}

interface StudyWordListSidebarProps {
  wordList: WordListItem[];
  currentWordIndex: number;
  completedWordIndices: number[];
  onJumpToWord: (index: number) => void;
  mode?: "study" | "test";
  /** For test mode: map of word index -> grade */
  testResults?: Map<number, "correct" | "half-correct" | "incorrect">;
  /** Which word to show first: "foreign" (default) or "english" */
  primaryField?: "foreign" | "english";
  /** Category per word index — information pages get no number */
  categories?: (string | null)[];
}

export function StudyWordListSidebar({
  wordList,
  currentWordIndex,
  completedWordIndices,
  onJumpToWord,
  mode = "study",
  testResults,
  primaryField = "foreign",
  categories,
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
              const isInfoPage = categories?.[index] === "information";
              const primaryText = primaryField === "english" ? word.english : word.foreign;
              const secondaryText = primaryField === "english" ? word.foreign : word.english;

              // In test mode, disable words not yet reached
              const isDisabled = isTestMode && index > maxReachedIndex;

              return (
                <button
                  key={`${word.id}-${index}`}
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
                    ) : isTestMode && !testResult ? (
                      /* Current word in test mode (not yet answered): show only primary (prompt) */
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
