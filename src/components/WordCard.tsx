import Image from "next/image";
import { StatusPill } from "@/components/ui/status-pill";
import { WordWithDetails } from "@/lib/queries/words";
import { mapStatus } from "@/lib/utils/helpers";

interface WordCardProps {
  word: WordWithDetails;
  index?: number;
  languageFlag?: string;
}

export function WordCard({ word, index, languageFlag = "🇮🇹" }: WordCardProps) {
  const hasImage = !!word.memory_trigger_image_url;

  return (
    <div className="flex cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md">
      {/* Thumbnail */}
      <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg bg-transparent">
        {hasImage ? (
          <Image
            src={word.memory_trigger_image_url!}
            alt={word.english}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">
            🗣️
          </div>
        )}
      </div>

      {/* English */}
      <p className="mb-1 text-regular-medium text-foreground/70">{word.english}</p>

      {/* Headword */}
      <p className="mb-3 text-regular-semibold text-foreground">{word.headword}</p>

      {/* Status */}
      <div className="mt-auto">
        <StatusPill status={mapStatus(word.status)} />
      </div>
    </div>
  );
}
