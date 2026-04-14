"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { WordWithDetails } from "@/lib/queries/words";

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
  /** When false, hides the English translation beneath the headword. Defaults to true. */
  showEnglish?: boolean;
  /** Number of grid columns. Defaults to 5. */
  columns?: WordGridColumns;
  /** Optional test results keyed by word ID — shows score badge on each card. */
  wordResults?: Map<string, WordGridResult>;
}

/**
 * Grid of word tiles with headword, image, and optional English.
 * Used by the lesson and test "completed" modals.
 */
export function WordGrid({
  words,
  imageMode,
  showEnglish = true,
  columns = 5,
  wordResults,
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
            className="relative overflow-hidden rounded-xl bg-white px-3 pt-2 pb-3 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
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
              <p className="truncate text-sm font-medium text-foreground">
                {word.headword}
              </p>
              {showEnglish && (
                <p className="truncate text-xs text-muted-foreground">
                  {word.english}
                </p>
              )}
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
