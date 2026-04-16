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
  /** Category per word index — "information" dots render black and are grouped separately */
  categories?: (string | null)[];
}

/** A single dot element */
function Dot({
  index,
  fillColor,
  isInfoPage,
  disabled,
  onDotClick,
}: {
  index: number;
  fillColor: string;
  isInfoPage: boolean;
  disabled: boolean;
  onDotClick: (index: number) => void;
}) {
  return (
    <div
      onClick={disabled ? undefined : () => onDotClick(index)}
      className={`flex h-2 w-2 shrink-0 items-center justify-center ${
        disabled ? "cursor-default" : "cursor-pointer transition-opacity hover:opacity-80"
      }`}
      title={isInfoPage ? "Info page" : `Word ${index + 1}`}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <circle cx="4" cy="4" r="4" fill={fillColor} />
      </svg>
    </div>
  );
}

export function WordTrackerDots({
  totalWords,
  currentIndex,
  completedIndices,
  onDotClick,
  disabled = false,
  testResults,
  categories,
}: WordTrackerDotsProps) {
  const completedSet = new Set(completedIndices);

  // Build dot data
  const dots = Array.from({ length: totalWords }).map((_, index) => {
    const isCurrent = index === currentIndex;
    const isViewed = completedSet.has(index);
    const testResult = testResults?.get(index);
    const isInfoPage = categories?.[index] === "information";

    let fillColor = "#E5F2FF"; // Not viewed/answered - lightest

    if (isInfoPage) {
      fillColor = "#000000";
    } else if (isCurrent) {
      fillColor = "#0B6CFF";
    } else if (testResults) {
      if (testResult === "correct") {
        fillColor = "#00C950";
      } else if (testResult === "half-correct") {
        fillColor = "#FF9224";
      } else if (testResult === "incorrect") {
        fillColor = "#FB2C36";
      }
    } else {
      if (isViewed) {
        fillColor = "#0B6CFF";
      }
    }

    return { index, fillColor, isInfoPage };
  });

  // Group consecutive dots by type (info vs word)
  const groups: { isInfo: boolean; items: typeof dots }[] = [];
  for (const dot of dots) {
    const last = groups[groups.length - 1];
    if (last && last.isInfo === dot.isInfoPage) {
      last.items.push(dot);
    } else {
      groups.push({ isInfo: dot.isInfoPage, items: [dot] });
    }
  }

  return (
    <div className="flex min-w-0 max-w-full items-center overflow-x-auto">
      <div className="flex shrink-0 items-center gap-1 py-0.5">
        {groups.map((group) => {
          if (group.isInfo) {
            // Info group: wrap in its own element with horizontal padding
            return (
              <div
                key={`info-${group.items[0].index}`}
                className="flex items-center gap-1 px-1"
              >
                {group.items.map((dot) => (
                  <Dot
                    key={dot.index}
                    index={dot.index}
                    fillColor={dot.fillColor}
                    isInfoPage
                    disabled={disabled}
                    onDotClick={onDotClick}
                  />
                ))}
              </div>
            );
          }

          // Word dots: render directly (no wrapper needed)
          return group.items.map((dot) => (
            <Dot
              key={dot.index}
              index={dot.index}
              fillColor={dot.fillColor}
              isInfoPage={false}
              disabled={disabled}
              onDotClick={onDotClick}
            />
          ));
        })}
      </div>
    </div>
  );
}
