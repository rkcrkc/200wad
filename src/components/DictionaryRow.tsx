"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { DictionaryWord } from "@/lib/queries/dictionary";
import { mapStatus } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils";

interface DictionaryRowProps {
  word: DictionaryWord;
  isFirst?: boolean;
  isLast?: boolean;
  isHighlighted?: boolean;
}

export function DictionaryRow({ word, isFirst, isLast, isHighlighted }: DictionaryRowProps) {
  const router = useRouter();
  const statusType = mapStatus(word.status);

  const handleClick = () => {
    // Navigate to the word page via the lesson route
    if (word.lessonId) {
      router.push(`/lesson/${word.lessonId}?word=${word.id}&from=dictionary`);
    }
  };

  const hasImage = !!word.imageUrl;

  return (
    <tr
      data-word-id={word.id}
      onClick={handleClick}
      className={cn(
        "group cursor-pointer transition-colors hover:bg-bone-hover",
        !isFirst && "border-t border-bone-hover",
        isHighlighted && "ring-2 ring-primary ring-inset"
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
      <td className="bg-white px-2 py-4 text-regular-semibold text-foreground transition-colors group-hover:bg-bone-hover">
        {word.english}
      </td>

      {/* Headword (foreign) */}
      <td className="bg-white px-2 py-4 text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
        {word.headword}
      </td>

      {/* Word Type */}
      <td className="bg-white px-2 py-4 text-regular-medium text-muted-foreground transition-colors group-hover:bg-bone-hover">
        {word.category === "word" ? (word.partOfSpeech || "—") : (word.category || "—")}
      </td>

      {/* Status */}
      <td className="whitespace-nowrap bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
        <StatusPill status={statusType} />
      </td>

      {/* Lesson */}
      <td className="bg-white px-2 py-4 text-regular-medium text-muted-foreground transition-colors group-hover:bg-bone-hover">
        {word.lessonNumber ? `#${word.lessonNumber}` : "—"}
      </td>

      {/* Chevron - sticky on horizontal scroll */}
      <td className={cn(
        "sticky right-0 bg-white px-2 py-4 pr-6 transition-colors group-hover:bg-bone-hover",
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
