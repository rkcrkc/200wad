"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { WordWithDetails } from "@/lib/queries/words";
import { StatusPill, type StatusType } from "@/components/ui/status-pill";

export type WordGridImageMode = "memory-trigger" | "flashcard";
export type WordGridColumns = 4 | 5;

export interface WordGridResult {
  grade: "correct" | "half-correct" | "incorrect";
  pointsEarned: number;
  maxPoints: number;
}

interface WordGridProps {
  words: WordWithDetails[];
  imageMode: WordGridImageMode;
  /** When false, hides the foreign headword so users can self-test. Defaults to true. */
  showForeign?: boolean;
  /** Number of grid columns. Defaults to 5. */
  columns?: WordGridColumns;
  /** Optional test results keyed by word ID — shows score badge on each card. */
  wordResults?: Map<string, WordGridResult>;
  /** Show learning status pill on each card. */
  showStatus?: boolean;
  /** Called when a word tile is clicked. */
  onWordClick?: (wordId: string) => void;
}

/**
 * Grid of word tiles with headword, image, and optional English.
 * Used by the lesson and test "completed" modals.
 */
export function WordGrid({
  words,
  imageMode,
  showForeign = true,
  columns = 5,
  wordResults,
  showStatus = false,
  onWordClick,
}: WordGridProps) {
  // Explicit classes so Tailwind's scanner picks them up
  const gridColsClass = columns === 4 ? "grid-cols-4" : "grid-cols-5";
  // 4-col tiles are wider, so give the image ~20% more height to balance proportions
  const imageHeightClass = columns === 4 ? "h-[134px]" : "h-28";

  return (
    <div className={`grid ${gridColsClass} gap-4`}>
      {words.map((word) => {
        const imageUrl =
          imageMode === "memory-trigger"
            ? word.memory_trigger_image_url
            : word.flashcard_image_url;
        const hasImage = !!imageUrl;
        const result = wordResults?.get(word.id);

        return (
          <div
            key={word.id}
            className={`relative overflow-hidden rounded-xl bg-white px-3 pt-2 pb-3 shadow-[0_2px_8px_rgba(0,0,0,0.08)]${onWordClick ? " cursor-pointer transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.14)]" : ""}`}
            onClick={onWordClick ? () => onWordClick(word.id) : undefined}
          >
            {/* Image */}
            <div className={`relative ${imageHeightClass} w-full`}>
              {hasImage ? (
                <Image
                  src={imageUrl!}
                  alt={word.english}
                  fill
                  className="object-contain"
                  sizes="200px"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                  {imageMode === "flashcard" ? (
                    <>
                      <ImageOff className="h-8 w-8 text-gray-300" />
                      <span className="text-xs text-muted-foreground">Coming soon</span>
                    </>
                  ) : (
                    <span className="text-3xl">🗣️</span>
                  )}
                </div>
              )}
            </div>

            {/* Word Info - Foreign first, English beneath, then score */}
            <div className="mt-3">
              {showForeign && (
                <p className="truncate text-sm font-medium text-foreground">
                  {word.headword}
                </p>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {word.english}
              </p>
              {result && (
                <div
                  className={`mt-1.5 text-[11px] font-medium ${
                    result.grade === "correct"
                      ? "text-success"
                      : result.grade === "half-correct"
                        ? "text-warning"
                        : "text-destructive"
                  }`}
                >
                  {result.pointsEarned} {result.pointsEarned === 1 ? "point" : "points"}
                </div>
              )}
              {showStatus && (
                <div className="mt-2.5">
                  <StatusPill
                    status={word.status === "not-started" ? "notStarted" : word.status as StatusType}
                    variant="pill"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
