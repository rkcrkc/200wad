import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusPill } from "@/components/ui/status-pill";
import { LessonWithProgress } from "@/lib/queries";
import { mapStatus } from "@/lib/utils/helpers";

interface LessonRowProps {
  lesson: LessonWithProgress;
}

export function LessonRow({ lesson }: LessonRowProps) {
  const statusType = mapStatus(lesson.status);

  return (
    <Link
      href={`/lesson/${lesson.id}`}
      className="grid grid-cols-[50px_1fr_140px_90px_90px_110px_32px] items-center gap-4 px-6 py-4 transition-colors hover:bg-[#FAF8F3]"
    >
      {/* Lesson number */}
      <div className="text-regular-medium text-foreground">
        {lesson.number}
      </div>

      {/* Lesson: emoji + title */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 text-xl">
          {lesson.emoji || "📚"}
        </div>
        <div className="truncate text-regular-semibold text-foreground">
          {lesson.title}
        </div>
      </div>

      {/* Status */}
      <div>
        <StatusPill status={statusType} />
      </div>

      {/* # Words */}
      <div className="text-center text-regular-medium text-foreground">
        {lesson.word_count}
      </div>

      {/* # Mastered */}
      <div className="text-center text-regular-medium text-foreground">
        {lesson.wordsMastered}
      </div>

      {/* Completion */}
      <div className="flex items-center justify-center gap-2">
        <ProgressRing value={lesson.completionPercent} size={24} />
        <span className="text-regular-medium text-foreground">
          {lesson.completionPercent}%
        </span>
      </div>

      {/* Chevron */}
      <div className="flex justify-end">
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    </Link>
  );
}
