"use client";

import Image from "next/image";
import { AudioType } from "@/hooks/useAudio";
import { AudioButton } from "@/components/ui/audio-button";

interface MemoryTriggerCardProps {
  imageUrl: string | null;
  triggerText: string | null;
  englishWord: string;
  foreignWord: string;
  /** For study mode: simple show/hide */
  isVisible: boolean;
  playingAudioType: AudioType | null;
  onPlayTriggerAudio: () => void;
  /** For test mode: clue level determines what's visible
   * - 0: nothing visible (both image and trigger hidden)
   * - 1: image visible, trigger hidden
   * - 2: both visible
   * - undefined: use isVisible prop (study mode)
   */
  clueLevel?: 0 | 1 | 2;
}

/**
 * Parse trigger text and highlight:
 * - English word: italic blue (always)
 * - Foreign word or ALL CAPS phonetic match: green bold (always)
 * - Rest of text: blue when playing, black otherwise
 */
function parseAndHighlightText(
  text: string,
  englishWord: string,
  foreignWord: string,
  isPlaying: boolean
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const words = text.split(/(\s+)/);
  
  // Clean words for comparison
  const cleanEnglish = englishWord.toLowerCase().replace(/[!?.,'"]/g, "");
  const cleanForeign = foreignWord.toLowerCase().replace(/[!?.,'"]/g, "");

  words.forEach((word, index) => {
    const cleanWord = word.toLowerCase().replace(/[!?.,'"]/g, "");
    
    // Check if this word matches the foreign word (green bold - always green)
    if (cleanWord === cleanForeign || cleanWord.includes(cleanForeign)) {
      parts.push(
        <span
          key={index}
          className="font-bold"
          style={{ color: "#00C950" }}
        >
          {word}
        </span>
      );
    }
    // Check if word is in ALL CAPS (phonetic hint - green bold, always green)
    else if (word.match(/^[A-Z]{2,}[!?.,'"]*$/) && word.trim().length > 1) {
      parts.push(
        <span
          key={index}
          className="font-bold"
          style={{ color: "#00C950" }}
        >
          {word}
        </span>
      );
    }
    // Check if this word is the English word (italic blue - always blue)
    else if (cleanWord === cleanEnglish || cleanWord.includes(cleanEnglish)) {
      parts.push(
        <span
          key={index}
          className="font-semibold italic"
          style={{ color: "#0B6CFF" }}
        >
          {word}
        </span>
      );
    }
    // Regular text: blue when playing, black otherwise
    else {
      parts.push(
        <span key={index} style={{ color: isPlaying ? "#0B6CFF" : "#141515" }}>
          {word}
        </span>
      );
    }
  });

  return parts;
}

export function MemoryTriggerCard({
  imageUrl,
  triggerText,
  englishWord,
  foreignWord,
  isVisible,
  playingAudioType,
  onPlayTriggerAudio,
  clueLevel,
}: MemoryTriggerCardProps) {
  const isPlayingTrigger = playingAudioType === "trigger";

  // If there's no memory trigger content at all, hide the entire card
  const hasNoContent = !triggerText && !imageUrl;
  if (hasNoContent) {
    return null;
  }

  // Determine visibility based on clueLevel (test mode) or isVisible (study mode)
  const showImage = clueLevel !== undefined ? clueLevel >= 1 : isVisible;
  const showTrigger = clueLevel !== undefined ? clueLevel >= 2 : isVisible;
  const showNothing = clueLevel !== undefined ? clueLevel === 0 : !isVisible;

  // Full skeleton when nothing visible
  if (showNothing) {
    return (
      <div className="w-full rounded-2xl bg-white shadow-[0px_5px_40px_-10px_rgba(0,0,0,0.15)]">
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
            <div className="h-8 flex-1 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-white shadow-[0px_5px_40px_-10px_rgba(0,0,0,0.15)]">
      <div className="flex flex-col gap-5 p-6">
        {/* Trigger text row - audio button on left, matching word card layout */}
        {showTrigger && triggerText ? (
          <button
            onClick={onPlayTriggerAudio}
            className="flex cursor-pointer items-center gap-4 text-left"
          >
            <AudioButton isPlaying={isPlayingTrigger} />
            <p className="text-2xl font-medium leading-relaxed">
              {parseAndHighlightText(triggerText, englishWord, foreignWord, isPlayingTrigger)}
            </p>
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
            <div className="h-8 flex-1 animate-pulse rounded bg-gray-100" />
          </div>
        )}

        {/* Trigger Image - visible at clueLevel 1+ */}
        {showImage && imageUrl ? (
          <button
            onClick={onPlayTriggerAudio}
            className="relative h-[400px] w-full cursor-pointer overflow-hidden rounded-lg"
          >
            <Image
              src={imageUrl}
              alt="Memory trigger"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 730px"
            />
          </button>
        ) : showImage && !imageUrl ? (
          // No image but should show - show placeholder
          <div className="flex h-[400px] w-full items-center justify-center rounded-lg bg-gray-50">
            <span className="text-6xl">🖼️</span>
          </div>
        ) : (
          // Image skeleton when clueLevel=0 but should show card
          <div className="h-[400px] w-full animate-pulse rounded-lg bg-gray-100" />
        )}
      </div>
    </div>
  );
}
