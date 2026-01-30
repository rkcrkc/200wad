"use client";

interface WordTrackerDotsProps {
  totalWords: number;
  currentIndex: number;
  completedIndices: number[];
  onDotClick: (index: number) => void;
  /** Maximum number of dots to show (will show first N) */
  maxDots?: number;
}

export function WordTrackerDots({
  totalWords,
  currentIndex,
  completedIndices,
  onDotClick,
  maxDots = 12,
}: WordTrackerDotsProps) {
  const dotsToShow = Math.min(totalWords, maxDots);
  const completedSet = new Set(completedIndices);

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: dotsToShow }).map((_, index) => {
        const isCurrent = index === currentIndex;
        const isCompleted = completedSet.has(index);
        
        // Color: blue for current, green for completed, light gray for upcoming
        let fillColor = "#E5F2FF"; // Light gray/blue for upcoming
        if (isCurrent) {
          fillColor = "#0B6CFF"; // Blue for current
        } else if (isCompleted) {
          fillColor = "#00C950"; // Green for completed
        }

        return (
          <button
            key={index}
            onClick={() => onDotClick(index)}
            className="flex h-3 w-3 items-center justify-center transition-opacity hover:opacity-80"
            title={`Word ${index + 1}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="6" fill={fillColor} />
            </svg>
          </button>
        );
      })}
      {totalWords > maxDots && (
        <span className="text-xs text-muted-foreground">+{totalWords - maxDots}</span>
      )}
    </div>
  );
}
