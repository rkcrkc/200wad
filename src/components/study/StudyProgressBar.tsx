"use client";

interface StudyProgressBarProps {
  /** Zero-based index of the current word in the full sequence. */
  currentWordIndex: number;
  /** Total number of items in the sequence (including information pages). */
  totalWords: number;
  /** Category per index — information pages are excluded from the count. */
  categories?: (string | null)[];
}

/**
 * Thin full-width progress strip pinned directly under StudyNavbar on mobile.
 * Below md the inline WordTrackerDots are hidden (they don't fit), so this bar
 * gives a lightweight sense of position. The fill tracks the learner's place in
 * the testable words, matching the navbar's "Word X of Y" copy. Mobile-only
 * (`md:hidden`); it pins directly under the 72px navbar.
 */
export function StudyProgressBar({
  currentWordIndex,
  totalWords,
  categories,
}: StudyProgressBarProps) {
  const nonInfoCount = categories
    ? categories.filter((c) => c !== "information").length
    : totalWords;

  let wordNumber = 0;
  for (let i = 0; i <= currentWordIndex; i++) {
    if (categories?.[i] !== "information") wordNumber++;
  }
  const isCurrentInfo = categories?.[currentWordIndex] === "information";
  const percent =
    nonInfoCount > 0
      ? Math.min(100, Math.round((wordNumber / nonInfoCount) * 100))
      : 0;

  return (
    <div
      className="fixed left-0 right-0 top-[72px] z-20 h-1 bg-bone-hover md:hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={nonInfoCount}
      aria-valuenow={isCurrentInfo ? 0 : wordNumber}
      aria-label={`Word ${isCurrentInfo ? "–" : wordNumber} of ${nonInfoCount}`}
    >
      <div
        className="h-full bg-primary transition-[width] duration-300 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
