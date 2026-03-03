"use client";

export type TestResultGrade = "correct" | "half-correct" | "incorrect";

interface WordTrackerDotsProps {
  totalWords: number;
  currentIndex: number;
  completedIndices: number[];
  onDotClick: (index: number) => void;
  /** Disable clicking on dots (for test mode) */
  disabled?: boolean;
  /** Test mode results: map of word index to grade */
  testResults?: Map<number, TestResultGrade>;
}

export function WordTrackerDots({
  totalWords,
  currentIndex,
  completedIndices,
  onDotClick,
  disabled = false,
  testResults,
}: WordTrackerDotsProps) {
  const completedSet = new Set(completedIndices);

  return (
    <div className="flex min-w-0 max-w-full items-center overflow-x-auto">
      <div className="flex shrink-0 items-center gap-1 py-0.5">
        {Array.from({ length: totalWords }).map((_, index) => {
          const isCurrent = index === currentIndex;
          const isViewed = completedSet.has(index);
          const testResult = testResults?.get(index);

          let fillColor = "#E5F2FF"; // Not viewed/answered - lightest

          if (isCurrent) {
            // Current word is always blue
            fillColor = "#0B6CFF"; // Primary blue
          } else if (testResults) {
            // Test mode: green for any points (1-3), red for 0 points
            if (testResult === "correct" || testResult === "half-correct") {
              fillColor = "#00C950"; // Green - got points
            } else if (testResult === "incorrect") {
              fillColor = "#FB2C36"; // Red - 0 points
            }
            // If no result yet, stays light blue
          } else {
            // Study mode: viewed (primary blue), not viewed (light blue)
            if (isViewed) {
              fillColor = "#0B6CFF"; // Viewed - primary blue
            }
          }

          return (
            <div
              key={index}
              onClick={disabled ? undefined : () => onDotClick(index)}
              className={`flex h-2 w-2 shrink-0 items-center justify-center ${
                disabled ? "cursor-default" : "cursor-pointer transition-opacity hover:opacity-80"
              }`}
              title={`Word ${index + 1}`}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <circle cx="4" cy="4" r="4" fill={fillColor} />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}
