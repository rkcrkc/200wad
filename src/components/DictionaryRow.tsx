"use client";

import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { DictionaryWord } from "@/lib/queries/dictionary";
import { mapStatus } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils";

interface DictionaryRowProps {
  word: DictionaryWord;
  onClick?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  isHighlighted?: boolean;
  isSelected?: boolean;
  showScrollFade?: boolean;
}

export function DictionaryRow({ word, onClick, isFirst, isLast, isHighlighted, isSelected, showScrollFade }: DictionaryRowProps) {
  const statusType = mapStatus(word.status);
  const hasImage = !!word.imageUrl;

  return (
    <tr
      data-word-id={word.id}
      onClick={onClick}
      className={cn(
        "group cursor-pointer transition-colors hover:bg-bone-hover",
        !isFirst && "border-t border-bone-hover",
        isHighlighted && "ring-2 ring-primary ring-inset",
        isSelected && "bg-bone-hover"
      )}
    >
      {/* Thumbnail */}
      <td className={cn(
        "bg-white px-6 py-4 transition-colors group-hover:bg-bone-hover",
        isFirst && "rounded-tl-xl",
        isLast && "rounded-bl-xl"
      )}>
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
          {hasImage ? (
            <Image
              src={word.imageUrl!}
              alt={word.english}
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-50 text-lg">
              🗣️
            </div>
          )}
        </div>
      </td>

      {/* English */}
      <td className="bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
        <div className="truncate text-regular-semibold text-foreground" title={word.english}>{word.english}</div>
      </td>

      {/* Headword (foreign) */}
      <td className="bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
        <div className="truncate text-regular-medium text-foreground" title={word.headword}>{word.headword}</div>
      </td>

      {/* Word Type */}
      <td className="bg-white px-2 py-4 text-small-medium text-muted-foreground transition-colors group-hover:bg-bone-hover">
        {word.category === "word" ? (word.partOfSpeech || "—") : (word.category || "—")}
      </td>

      {/* Status */}
      <td className="whitespace-nowrap bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
        <StatusPill status={statusType} />
      </td>

      {/* Lesson */}
      <td className="bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
        {word.lessonNumber ? (
          <div
            className="truncate text-small-medium text-muted-foreground"
            title={word.lessonTitle ? `#${word.lessonNumber} · ${word.lessonTitle}` : undefined}
          >
            #{word.lessonNumber}{word.lessonTitle ? ` · ${word.lessonTitle}` : ""}
          </div>
        ) : (
          <span className="text-small-medium text-muted-foreground">—</span>
        )}
      </td>

      {/* Chevron - sticky on horizontal scroll */}
      <td className={cn(
        "sticky right-0 z-10 bg-white px-2 py-4 pr-6 transition-colors group-hover:bg-bone-hover",
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
