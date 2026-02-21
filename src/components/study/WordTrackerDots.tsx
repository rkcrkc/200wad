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
      <div className="flex shrink-0 items-center gap-1.5 py-0.5">
        {Array.from({ length: totalWords }).map((_, index) => {
          const isCurrent = index === currentIndex;
          const isCompleted = completedSet.has(index);

          let fillColor = "#E5F2FF";
          if (isCurrent) {
            fillColor = "#0B6CFF";
          } else if (isCompleted) {
            fillColor = "#00C950";
          }

          return (
            <button
              key={index}
              onClick={() => onDotClick(index)}
              className="flex h-3 w-3 shrink-0 items-center justify-center transition-opacity hover:opacity-80"
              title={`Word ${index + 1}`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="6" fill={fillColor} />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
