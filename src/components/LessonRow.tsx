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
      className="grid cursor-pointer grid-cols-[80px_minmax(300px,1fr)_160px_100px_100px_140px_60px] items-center gap-6 px-6 py-4 text-left transition-colors hover:bg-[#FAF8F3]"
    >
      {/* # */}
      <div className="text-small-regular text-muted-foreground">
        {lesson.number}
      </div>

      {/* Lesson */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex-shrink-0 text-2xl">{lesson.emoji || "📚"}</div>
        <div className="truncate text-regular-semibold text-foreground">
          {lesson.title}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center">
        <StatusPill status={statusType} />
      </div>

      {/* # Words */}
      <div className="text-center text-small-regular text-foreground">
        {lesson.word_count}
      </div>

      {/* # Mastered */}
      <div className="text-center text-small-regular text-foreground">
        {lesson.wordsMastered}
      </div>

      {/* Completion */}
      <div className="flex items-center justify-center gap-2">
        <ProgressRing value={lesson.completionPercent} size={32} />
        <span className="text-small-regular text-foreground">
          {lesson.completionPercent}%
        </span>
      </div>

      {/* Arrow */}
      <div className="flex justify-end">
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    </Link>
  );
}
