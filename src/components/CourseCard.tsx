import Link from "next/link";
import { ChevronRight, BookOpen, MessageCircle } from "lucide-react";
import { ProgressRingWithLabel } from "@/components/ui/progress-ring-with-label";
import { CourseWithProgress } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  course: CourseWithProgress;
  isActive?: boolean;
}

const levelStyles = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-purple-100 text-purple-700",
};

const levelLabels = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function CourseCard({ course, isActive = false }: CourseCardProps) {
  const level = (course.level || "beginner") as keyof typeof levelStyles;

  return (
    <Link
      href={`/lessons/${course.id}`}
      className={cn(
        "relative block rounded-2xl border-2 bg-white p-5 transition-all hover:shadow-lg",
        isActive
          ? "border-primary shadow-lg ring-2 ring-primary/20"
          : "border-gray-200"
      )}
    >
      {/* Currently Selected Badge */}
      {isActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary shadow-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
            Currently Selected
          </div>
        </div>
      )}

      {/* Top Badges Row */}
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
        {/* Difficulty Badge */}
        <span
          className={cn(
            "inline-block whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium",
            levelStyles[level]
          )}
        >
          {levelLabels[level]}
          {course.cefr_range && ` • ${course.cefr_range}`}
        </span>

        {/* Progress Ring */}
        <div className="flex-shrink-0">
          <ProgressRingWithLabel
            value={course.progressPercent}
            size={40}
            strokeWidth={3}
          />
        </div>
      </div>

      {/* Course Icon and Title */}
      <div className="mb-4 mt-12 flex items-start gap-3">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg">
          <BookOpen className="h-7 w-7 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-lg font-semibold sm:text-xl">{course.name}</h3>
          <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
            {course.description}
          </p>
        </div>
      </div>

      {/* Course Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 flex-shrink-0" />
          <span>{course.totalLessons} lessons</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 flex-shrink-0" />
          <span>{course.actualWordCount} words</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm text-white transition-all hover:bg-primary/90">
        <span>Select course</span>
        <ChevronRight className="h-4 w-4 flex-shrink-0" />
      </div>
    </Link>
  );
}
