"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusPill } from "@/components/ui/status-pill";
import { LessonWithProgress } from "@/lib/queries";
import { mapStatus } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils";

interface LessonRowProps {
  lesson: LessonWithProgress;
  isFirst?: boolean;
  isLast?: boolean;
}

export function LessonRow({ lesson, isFirst, isLast }: LessonRowProps) {
  const router = useRouter();
  const statusType = mapStatus(lesson.status);

  const handleClick = () => {
    router.push(`/lesson/${lesson.id}`);
  };

  return (
    <tr
      onClick={handleClick}
      className={cn(
        "group cursor-pointer transition-colors hover:bg-bone-hover",
        !isFirst && "border-t border-gray-200"
      )}
    >
      {/* Lesson number */}
      <td className={cn(
        "bg-white px-6 py-4 text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover",
        isFirst && "rounded-tl-xl",
        isLast && "rounded-bl-xl"
      )}>
        {lesson.number}
      </td>

      {/* Lesson: emoji + title */}
      <td className="bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 text-xl">
            {lesson.emoji || "📚"}
          </div>
          <div className="truncate text-regular-semibold text-foreground">
            {lesson.title}
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="whitespace-nowrap bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
        <StatusPill status={statusType} />
      </td>

      {/* # Words */}
      <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
        {lesson.word_count}
      </td>

      {/* # Mastered */}
      <td className="bg-white px-2 py-4 text-center text-regular-medium text-foreground transition-colors group-hover:bg-bone-hover">
        {lesson.wordsMastered}
      </td>

      {/* Completion */}
      <td className="bg-white px-2 py-4 transition-colors group-hover:bg-bone-hover">
        <div className="flex items-center justify-center gap-2">
          <ProgressRing value={lesson.completionPercent} size={24} />
          <span className="text-regular-medium text-foreground">
            {lesson.completionPercent}%
          </span>
        </div>
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
