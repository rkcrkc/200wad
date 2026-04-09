import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { WordWithDetails } from "@/lib/queries/words";
import { mapStatus } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils";

interface WordRowProps {
  word: WordWithDetails;
  index: number;
  languageFlag?: string;
  onClick?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  isSelected?: boolean;
}

export function WordRow({ word, index, languageFlag = "🇮🇹", onClick, isFirst, isLast, isSelected }: WordRowProps) {
  const hasImage = !!word.memory_trigger_image_url;

  return (
    <tr
      className={cn(
        "group cursor-pointer transition-colors hover:bg-bone-hover",
        !isFirst && "border-t border-bone-hover",
              )}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Word number */}
      <td className={cn(
        "px-6 py-4 text-regular-medium transition-colors group-hover:bg-bone-hover",
        "bg-white",
        isFirst && "rounded-tl-xl",
        isLast && "rounded-bl-xl"
      )}>
        {index + 1}
      </td>

      {/* Thumbnail */}
      <td className={cn("px-2 py-4 transition-colors group-hover:bg-bone-hover", "bg-white")}>
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
      </td>

      {/* Translation (English) */}
      <td className={cn("px-2 py-4 text-medium-medium transition-colors group-hover:bg-bone-hover", "bg-white")}>
        <span className="block truncate" title={word.english}>{word.english}</span>
      </td>

      {/* Headword (foreign) */}
      <td className={cn("px-2 py-4 text-medium-medium transition-colors group-hover:bg-bone-hover", "bg-white")}>
        <span className="block truncate" title={word.headword}>{word.headword}</span>
      </td>

      {/* Status pill */}
      <td className={cn("whitespace-nowrap px-2 py-4 transition-colors group-hover:bg-bone-hover", "bg-white")}>
        <StatusPill status={mapStatus(word.status)} />
      </td>

      {/* Chevron - sticky on horizontal scroll */}
      <td className={cn(
        "sticky right-0 px-2 py-4 pr-6 transition-colors group-hover:bg-bone-hover",
        "bg-white",
        isFirst && "rounded-tr-xl",
        isLast && "rounded-br-xl"
      )}>
        <div className="flex justify-end">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </td>
    </tr>
  );
}
