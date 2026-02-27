"use client";

interface WordTrackerDotsProps {
  totalWords: number;
  currentIndex: number;
  completedIndices: number[];
  onDotClick: (index: number) => void;
}

export function WordTrackerDots({
  totalWords,
  currentIndex,
  completedIndices,
  onDotClick,
}: WordTrackerDotsProps) {
  const completedSet = new Set(completedIndices);

  return (
    <div className="flex min-w-0 max-w-full items-center overflow-x-auto">
      <div className="flex shrink-0 items-center gap-1 py-0.5">
        {Array.from({ length: totalWords }).map((_, index) => {
          const isCurrent = index === currentIndex;
          const isViewed = completedSet.has(index);

          // Three states: current (darker blue), viewed (primary blue), not viewed (light blue)
          let fillColor = "#E5F2FF"; // Not viewed - lightest
          if (isCurrent) {
            fillColor = "#0954C4"; // Current - darker than primary
          } else if (isViewed) {
            fillColor = "#0B6CFF"; // Viewed - primary blue
          }

          return (
            <button
              key={index}
              onClick={() => onDotClick(index)}
              className="flex h-2 w-2 shrink-0 cursor-pointer items-center justify-center transition-opacity hover:opacity-80"
              title={`Word ${index + 1}`}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <circle cx="4" cy="4" r="4" fill={fillColor} />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
