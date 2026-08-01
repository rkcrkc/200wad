import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { ScoreIndicator } from "@/components/ui/score-indicator";
import { WordWithDetails } from "@/lib/queries/words";
import { mapStatus } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils";

interface WordRowProps {
  word: WordWithDetails;
  index: number;
  onClick?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  isSelected?: boolean;
  showScrollFade?: boolean;
}

export function WordRow({ word, index, onClick, isFirst, isLast, isSelected, showScrollFade }: WordRowProps) {
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
      {/* Word number — kept on mobile with smaller text and tighter padding
          (pr-1 closes the gap to the thumbnail); restored at md. */}
      <td className={cn(
        "w-10 py-4 pl-3 pr-1 text-xs-medium transition-colors group-hover:bg-bone-hover md:w-auto md:px-6 md:text-regular-medium",
        "bg-white",
        isFirst && "rounded-tl-xl",
        isLast && "rounded-bl-xl"
      )}>
        {index + 1}
      </td>

      {/* Thumbnail — kept on mobile; the tile shrinks below md. pl-1 tightens
          the gap to the number cell. */}
      <td className={cn("w-14 py-4 pl-1 pr-2 transition-colors group-hover:bg-bone-hover md:w-auto md:px-2", "bg-white")}>
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg md:h-12 md:w-12">
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

      {/* Translation (English) — the foreign headword stacks beneath it on
          mobile, where the dedicated headword column is hidden. */}
      <td className={cn("px-2 py-4 text-medium-medium transition-colors group-hover:bg-bone-hover", "bg-white")}>
        <span className="block truncate" title={word.english}>{word.english}</span>
        <span className="mt-0.5 block truncate text-small-medium text-muted-foreground md:hidden" title={word.headword}>{word.headword}</span>
      </td>

      {/* Headword (foreign) — desktop-only column; stacks under English on mobile. */}
      <td className={cn("hidden px-2 py-4 text-medium-medium transition-colors group-hover:bg-bone-hover md:table-cell", "bg-white")}>
        <span className="block truncate" title={word.headword}>{word.headword}</span>
      </td>

      {/* Status pill — the trailing cell on mobile (avg-score and chevron are
          hidden there), so it reclaims the row's right corners below md. */}
      <td className={cn(
        "w-[112px] whitespace-nowrap py-4 pl-2 pr-3 transition-colors group-hover:bg-bone-hover md:w-auto md:px-2 md:pr-2",
        "bg-white",
        isFirst && "rounded-tr-xl md:rounded-tr-none",
        isLast && "rounded-br-xl md:rounded-br-none"
      )}>
        {/* Smaller pill on mobile so the longest label ("Not started") can't
            bleed off the trailing cell; default size returns at md. */}
        <span className="md:hidden">
          <StatusPill status={mapStatus(word.status)} size="sm" />
        </span>
        <span className="hidden md:inline-flex">
          <StatusPill status={mapStatus(word.status)} />
        </span>
      </td>

      {/* Average score — desktop-only */}
      <td className={cn("hidden whitespace-nowrap px-2 py-4 transition-colors group-hover:bg-bone-hover md:table-cell", "bg-white")}>
        <ScoreIndicator
          testHistory={word.testHistory}
          scoreStats={word.scoreStats}
          wordStatus={word.status}
          correctStreak={word.progress?.correct_streak ?? undefined}
          size="sm"
          showPopover={true}
        />
      </td>

      {/* Chevron — desktop-only, sticky on horizontal scroll. */}
      <td className={cn(
        "sticky right-0 z-10 hidden px-2 py-4 pr-6 transition-colors group-hover:bg-bone-hover md:table-cell",
        "bg-white",
        isFirst && "rounded-tr-xl",
        isLast && "rounded-br-xl",
        showScrollFade && "before:pointer-events-none before:absolute before:right-full before:top-0 before:bottom-0 before:w-10 before:bg-gradient-to-r before:from-transparent before:to-white before:transition-colors group-hover:before:to-bone-hover"
      )}>
        <div className="flex justify-end">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </td>
    </tr>
  );
}
