import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for /lesson/[lessonId] — mirrors the lesson page
 * (back link + lesson header + progress bar + word cards grid).
 */
export default function LessonLoading() {
  return (
    <div className="mx-auto w-full max-w-content-md pt-8">
      {/* Top bar: back link */}
      <div className="mb-6">
        <Skeleton className="h-5 w-24" />
      </div>

      {/* Lesson header */}
      <div className="mb-6">
        <Skeleton className="mb-2 h-5 w-24" />
        <Skeleton className="h-9 w-3/4 max-w-xl" />
      </div>

      {/* Progress / stats bar */}
      <div className="mb-8 flex flex-wrap gap-4">
        <Skeleton className="h-16 w-32" />
        <Skeleton className="h-16 w-32" />
        <Skeleton className="h-16 w-32" />
        <Skeleton className="h-16 w-32" />
      </div>

      {/* Action buttons row */}
      <div className="mb-8 flex gap-3">
        <Skeleton className="h-11 w-32" />
        <Skeleton className="h-11 w-32" />
      </div>

      {/* Word list */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
