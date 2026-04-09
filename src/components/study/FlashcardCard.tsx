"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";

interface FlashcardCardProps {
  imageUrl: string | null;
  englishWord: string;
  /** For study mode: simple show/hide */
  isVisible: boolean;
  /** For test mode: clue level determines visibility
   * - 0: skeleton/hidden
   * - 1+: image visible
   * - undefined: use isVisible prop (study mode)
   */
  clueLevel?: 0 | 1 | 2;
}

/**
 * FlashcardCard displays a photograph depicting the English word.
 * Simpler than MemoryTriggerCard - just the image without trigger text.
 */
export function FlashcardCard({
  imageUrl,
  englishWord,
  isVisible,
  clueLevel,
}: FlashcardCardProps) {
  // Determine visibility based on clueLevel (test mode) or isVisible (study mode)
  const showImage = clueLevel !== undefined ? clueLevel >= 1 : isVisible;
  const showNothing = clueLevel !== undefined ? clueLevel === 0 : !isVisible;

  // Full skeleton when nothing visible
  if (showNothing) {
    return (
      <div className="w-full rounded-2xl bg-white shadow-card">
        <div className="p-6">
          <div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-white shadow-card">
      <div className="p-6">
        {showImage && imageUrl ? (
          <div className="relative h-[400px] w-full overflow-hidden rounded-lg">
            <Image
              src={imageUrl}
              alt={englishWord}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 730px"
            />
          </div>
        ) : showImage && !imageUrl ? (
          // No flashcard image - show placeholder
          <div className="flex h-[400px] w-full flex-col items-center justify-center gap-3 rounded-lg bg-gray-50">
            <ImageOff className="h-16 w-16 text-gray-300" />
            <span className="text-sm text-muted-foreground">Flashcard coming soon</span>
          </div>
        ) : (
          // Skeleton
          <div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />
        )}
      </div>
    </div>
  );
}
