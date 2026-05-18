import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for /course/[courseId] — mirrors the All Lessons
 * page (header + stats bar + special lessons row + lessons grid).
 */
export default function CourseLoading() {
  return (
    <div className="mx-auto w-full max-w-content-md pt-8">
      {/* Header row: title + stats bar */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full max-w-md" />
      </div>

      {/* Special lessons row */}
      <div className="mb-8 flex gap-3 overflow-hidden">
        <Skeleton className="h-24 w-40 shrink-0" />
        <Skeleton className="h-24 w-40 shrink-0" />
        <Skeleton className="h-24 w-40 shrink-0" />
        <Skeleton className="h-24 w-40 shrink-0" />
        <Skeleton className="h-24 w-40 shrink-0" />
      </div>

      {/* Lessons list */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
