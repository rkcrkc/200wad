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
    <div className="grid cursor-pointer grid-cols-[40px_64px_1fr_1fr_140px_60px] items-center gap-4 px-6 py-4 transition-colors hover:bg-bone-50">
      {/* Word number */}
      <div className="text-regular-medium">
        {index + 1}
      </div>

      {/* Thumbnail */}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
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

      {/* Translation (English) */}
      <div className="text-medium-medium">{word.english}</div>

      {/* Headword (foreign) */}
      <div className="text-medium-medium">{word.headword}</div>

      {/* Status pill */}
      <div className="flex items-center">
        <StatusPill status={mapStatus(word.status)} />
      </div>

      {/* Chevron */}
      <div className="flex justify-end">
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  );
}
