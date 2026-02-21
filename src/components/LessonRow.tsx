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
      className="flex cursor-pointer flex-col gap-1 px-6 py-4 transition-colors hover:bg-bone-50"
    >
      {/* Top: Lesson number */}
      <div className="text-regular-medium text-black-50">
        Lesson {lesson.number}
      </div>

      {/* Bottom: Lesson name (left) + stats (right) */}
      <div className="flex items-center justify-between">
        {/* Left: emoji + title */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex-shrink-0 text-2xl">{lesson.emoji || "📚"}</div>
          <div className="truncate text-medium-medium">
            {lesson.title}
          </div>
        </div>

        {/* Right: stats */}
        <div className="flex items-center gap-6">
          <StatusPill status={statusType} />
          <div className="text-small-regular">{lesson.word_count} words</div>
          <div className="text-small-regular">{lesson.wordsMastered} mastered</div>
          <div className="flex items-center gap-2">
            <ProgressRing value={lesson.completionPercent} size={32} />
            <span className="text-small-regular">{lesson.completionPercent}%</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}
