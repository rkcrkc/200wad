"use client";

import { AudioType } from "@/hooks/useAudio";
import { AudioButton } from "@/components/ui/audio-button";

interface WordCardProps {
  partOfSpeech: string | null;
  englishWord: string;
  foreignWord: string;
  showForeign: boolean;
  playingAudioType: AudioType | null;
  onPlayEnglishAudio: () => void;
  onPlayForeignAudio: () => void;
  /** Mode: "study" uses green while playing, "test" uses blue for English before answering */
  mode?: "study" | "test";
  /** For test mode: whether the user has submitted their answer */
  hasSubmitted?: boolean;
}

export function WordCard({
  partOfSpeech,
  englishWord,
  foreignWord,
  showForeign,
  playingAudioType,
  onPlayEnglishAudio,
  onPlayForeignAudio,
  mode = "study",
  hasSubmitted = false,
}: WordCardProps) {
  const isPlayingEnglish = playingAudioType === "english";
  const isPlayingForeign = playingAudioType === "foreign";
  
  // In test mode before submission, English word is blue; otherwise normal colors
  const getEnglishWordColor = () => {
    if (isPlayingEnglish) return "#00C950"; // Green when playing
    if (mode === "test" && !hasSubmitted) return "#0B6CFF"; // Blue in test mode before answer
    return "#141515"; // Default black
  };

  return (
    <div className="w-full rounded-2xl bg-white p-6 shadow-[0px_5px_40px_-10px_rgba(0,0,0,0.15)]">
      {/* Part of speech */}
      {partOfSpeech && (
        <div className="mb-4">
          <span className="study-card-label uppercase tracking-wide text-foreground/50">
            {partOfSpeech}
          </span>
        </div>
      )}

      {/* Words container */}
      <div className="flex flex-col gap-4">
        {/* English word row */}
        <div className="flex items-center gap-4 rounded-lg">
          <div className="flex items-center gap-2.5">
            <AudioButton
              onClick={onPlayEnglishAudio}
              isPlaying={isPlayingEnglish}
            />
          </div>
          <span
            className="text-[32px] font-semibold leading-tight tracking-tight"
            style={{ color: getEnglishWordColor() }}
          >
            {englishWord}
          </span>
        </div>

        {/* Divider */}
        {showForeign && (
          <div className="h-px w-full bg-black/10" />
        )}

        {/* Foreign word row or skeleton */}
        {showForeign ? (
          <div className="flex items-center gap-4 rounded-lg">
            <div className="flex items-center gap-2.5">
              <AudioButton
                onClick={onPlayForeignAudio}
                isPlaying={isPlayingForeign}
              />
            </div>
            <span
              className="text-[32px] font-semibold leading-tight tracking-tight"
              style={{ color: isPlayingForeign ? "#00C950" : "#141515" }}
            >
              {foreignWord}
            </span>
          </div>
        ) : (
          <div className="h-[42px] w-full animate-pulse rounded-lg bg-gray-100" />
        )}
      </div>
    </div>
  );
}
