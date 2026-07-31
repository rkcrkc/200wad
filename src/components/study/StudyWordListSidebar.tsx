"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { X } from "lucide-react";
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
  /**
   * For test mode: indices whose thumbnail image should be revealed. Kept
   * separate from `hideSecondaryIndices` because the thumbnail (a soft memory
   * clue) follows a different rule from the literal text answer. In testTwice
   * mode a word's thumbnail is revealed on answering in round 1, hidden again
   * when round 2 starts, and revealed once it's answered in round 2. When
   * omitted (e.g. study mode) the thumbnail falls back to "reveal when answered".
   */
  revealThumbnailIndices?: Set<number>;
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
  /** Mobile only: whether the slide-over drawer is open. Desktop ignores this. */
  isOpen?: boolean;
  /** Mobile only: called to close the drawer (scrim tap, close button, Esc, word jump). */
  onClose?: () => void;
}

/**
 * The scrollable word list itself. Rendered twice by StudyWordListSidebar — once
 * in the fixed desktop rail and once inside the mobile slide-over drawer — so each
 * instance owns its own scroll/fade refs (both are mounted at all times via CSS).
 */
function WordListPanel({
  wordList,
  currentWordIndex,
  completedWordIndices,
  onJumpToWord,
  mode = "study",
  testResults,
  hideSecondaryIndices,
  revealThumbnailIndices,
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

            // The thumbnail has its own reveal rule (see revealThumbnailIndices):
            // always shown in study, and in test mode driven by the caller's
            // set — which handles the Test-Twice reward/re-hide cadence — with
            // a fallback of "reveal when answered" when no set is supplied.
            const revealThumb =
              !isDisabled &&
              (!isTestMode ||
                (revealThumbnailIndices
                  ? revealThumbnailIndices.has(index)
                  : !!testResult));

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
  );
}

export function StudyWordListSidebar(props: StudyWordListSidebarProps) {
  const { isOpen = false, onClose, onJumpToWord } = props;

  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Desktop: fixed rail under the navbar */}
      <div className="fixed top-[72px] bottom-0 left-0 z-10 hidden w-[240px] flex-col bg-white md:flex">
        <WordListPanel {...props} />
      </div>

      {/* Mobile: left slide-over drawer with scrim */}
      <div
        className={cn(
          "fixed inset-0 z-30 md:hidden",
          isOpen ? "" : "pointer-events-none"
        )}
        aria-hidden={!isOpen}
      >
        {/* Scrim */}
        <div
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={onClose}
        />
        {/* Panel */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex w-[85%] max-w-[320px] flex-col bg-white shadow-panel transition-transform duration-300 ease-out",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between px-4 py-3">
            <span className="text-regular-semibold text-foreground">Words</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground hover:bg-bone-hover"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Jumping to a word also closes the drawer */}
          <WordListPanel
            {...props}
            onJumpToWord={(index) => {
              onJumpToWord(index);
              onClose?.();
            }}
          />
        </div>
      </div>
    </>
  );
}
