"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface QaLessonRowProps {
  /** 1-based position, shown in the "#" column. */
  index: number;
  emoji: string;
  title: string;
  /** Number of flagged words in this QA lesson. */
  count: number;
  /** QA lesson id; omitted (and the row disabled) when `count` is 0. */
  lessonId?: string;
  isFirst?: boolean;
  isLast?: boolean;
  showScrollFade?: boolean;
}

/**
 * A single admin-only QA lesson rendered as a row in the lessons table
 * (shown when the "Developer notes" filter pill is active). QA lessons are
 * study-only and ephemeral, so the row omits status/XP/progress. Clicking the
 * row opens the lesson detail view (words list + preview sidebar); the Study
 * action starts an ephemeral study session directly. Zero-count rows render
 * greyed and non-interactive.
 */
export function QaLessonRow({
  index,
  emoji,
  title,
  count,
  lessonId,
  isFirst,
  isLast,
  showScrollFade,
}: QaLessonRowProps) {
  const router = useRouter();
  const disabled = count === 0 || !lessonId;
  const detailHref = lessonId ? `/lesson/${lessonId}` : undefined;
  const studyHref = lessonId ? `/lesson/${lessonId}/study` : undefined;

  const handleClick = () => {
    if (disabled || !detailHref) return;
    router.push(detailHref);
  };

  return (
    <tr
      onClick={handleClick}
      className={cn(
        "group transition-colors",
        disabled ? "opacity-50" : "cursor-pointer hover:bg-bone-hover",
        !isFirst && "border-t border-bone-hover"
      )}
    >
      {/* # */}
      <td
        className={cn(
          "bg-white px-4 py-3 text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover md:px-6 md:py-4",
          isFirst && "rounded-tl-xl",
          isLast && "rounded-bl-xl"
        )}
      >
        {index}
      </td>

      {/* Lesson: emoji + title */}
      <td className="bg-white px-2 py-3 transition-colors group-hover:bg-bone-hover md:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 text-xl">
            {emoji}
          </div>
          <div className="truncate text-medium-semibold text-foreground">
            {title}
          </div>
        </div>
      </td>

      {/* # Words */}
      <td className="hidden bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover md:table-cell">
        {count}
      </td>

      {/* Study action - sticky on horizontal scroll */}
      <td
        className={cn(
          "sticky right-0 z-10 bg-white px-2 py-3 pr-6 transition-colors group-hover:bg-bone-hover md:py-4",
          isFirst && "rounded-tr-xl",
          isLast && "rounded-br-xl",
          showScrollFade &&
            "before:pointer-events-none before:absolute before:right-full before:top-0 before:bottom-0 before:w-10 before:bg-gradient-to-r before:from-transparent before:to-white before:transition-colors group-hover:before:to-bone-hover"
        )}
      >
        <div className="flex justify-end">
          {disabled || !studyHref ? (
            <span className="text-xs-medium text-muted-foreground">No words</span>
          ) : (
            <Link
              href={studyHref}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <BookOpen className="h-4 w-4" />
              Study
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}
