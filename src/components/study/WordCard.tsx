"use client";

import { AudioType } from "@/hooks/useAudio";
import { AudioButton } from "@/components/ui/audio-button";

interface WordCardProps {
  englishWord: string;
  foreignWord: string;
  /** Whether to show the foreign word (or skeleton) */
  showForeign: boolean;
  /** Whether to show the English word (defaults to true) */
  showEnglish?: boolean;
  playingAudioType: AudioType | null;
  onPlayEnglishAudio: () => void;
  onPlayForeignAudio: () => void;
  /** Mode: "study" uses green while playing, "test" uses blue for the "question" word */
  mode?: "study" | "test";
  /** For test mode: whether the user has submitted their answer */
  hasSubmitted?: boolean;
}

export function WordCard({
  englishWord,
  foreignWord,
  showForeign,
  showEnglish = true,
  playingAudioType,
  onPlayEnglishAudio,
  onPlayForeignAudio,
  mode = "study",
  hasSubmitted = false,
}: WordCardProps) {
  const isPlayingEnglish = playingAudioType === "english";
  const isPlayingForeign = playingAudioType === "foreign";

  // Determine which word is the "question" (shown in blue in test mode before answer)
  // If English is hidden, foreign is the question; otherwise English is the question
  const englishIsQuestion = showEnglish && !showForeign;
  const foreignIsQuestion = showForeign && !showEnglish;

  // Get color for English word
  const getEnglishWordColor = () => {
    if (isPlayingEnglish) return "#00C950"; // Green when playing
    if (mode === "test" && !hasSubmitted && englishIsQuestion) return "#0B6CFF"; // Blue when it's the question
    return "#141515"; // Default black
  };

  // Get color for Foreign word
  const getForeignWordColor = () => {
    if (isPlayingForeign) return "#00C950"; // Green when playing
    if (mode === "test" && !hasSubmitted && foreignIsQuestion) return "#0B6CFF"; // Blue when it's the question
    return "#141515"; // Default black
  };

  // If neither word should be shown, show nothing (picture-only mode)
  if (!showEnglish && !showForeign) {
    return null;
  }

  return (
    <div className="w-full rounded-2xl bg-white p-6 shadow-[0px_5px_40px_-10px_rgba(0,0,0,0.15)]">
      {/* Words container */}
      <div className="flex flex-col gap-4">
        {/* English word row */}
        {showEnglish ? (
          <button
            onClick={onPlayEnglishAudio}
            className="flex cursor-pointer items-center gap-4 rounded-lg text-left"
          >
            <AudioButton isPlaying={isPlayingEnglish} />
            <span
              className="text-[32px] font-semibold leading-tight tracking-tight"
              style={{ color: getEnglishWordColor() }}
            >
              {englishWord}
            </span>
          </button>
        ) : (
          <div className="h-[42px] w-full animate-pulse rounded-lg bg-gray-100" />
        )}

        {/* Divider - show when both words are visible or will be visible */}
        <div
          className={`h-px w-full bg-black/10 transition-opacity ${
            (showEnglish && showForeign) ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Foreign word row or skeleton */}
        {showForeign ? (
          <button
            onClick={onPlayForeignAudio}
            className="flex cursor-pointer items-center gap-4 rounded-lg text-left"
          >
            <AudioButton isPlaying={isPlayingForeign} />
            <span
              className="text-[32px] font-semibold leading-tight tracking-tight"
              style={{ color: getForeignWordColor() }}
            >
              {foreignWord}
            </span>
          </button>
        ) : (
          <div className="h-[42px] w-full animate-pulse rounded-lg bg-gray-100" />
        )}
      </div>
    </div>
  );
}
