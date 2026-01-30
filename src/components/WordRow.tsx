import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { WordWithDetails } from "@/lib/queries/words";
import { mapStatus } from "@/lib/utils/helpers";

interface WordRowProps {
  word: WordWithDetails;
  index: number;
  languageFlag?: string;
}

export function WordRow({ word, index, languageFlag = "🇮🇹" }: WordRowProps) {
  const hasImage = !!word.memory_trigger_image_url;

  return (
    <div className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md">
      <div className="flex flex-1 items-center gap-4">
        {/* Word number */}
        <span className="w-8 text-center text-regular-medium text-muted-foreground">
          {index + 1}
        </span>

        {/* Thumbnail */}
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-purple-400 to-pink-400">
          {hasImage ? (
            <Image
              src={word.memory_trigger_image_url!}
              alt={word.english}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">
              🗣️
            </div>
          )}
        </div>

        {/* English word */}
        <div className="flex-1">
          <p className="text-regular-medium text-foreground/70">{word.english}</p>
        </div>

        {/* Foreign word with flag */}
        <div className="flex flex-1 items-center gap-2">
          <span className="text-lg">{languageFlag}</span>
          <p className="text-regular-semibold text-foreground">{word.foreign_word}</p>
        </div>

        {/* Status pill */}
        <div className="flex flex-1 justify-end">
          <StatusPill status={mapStatus(word.status)} />
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="ml-4 h-5 w-5 text-gray-400" />
    </div>
  );
}
