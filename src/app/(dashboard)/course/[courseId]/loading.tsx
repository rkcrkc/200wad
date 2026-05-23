import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for /course/[courseId] — mirrors the All Lessons page
 * (top bar + header with CourseStatsBar + special lessons row + filter
 * tabs/search + lessons table).
 */
export default function CourseLoading() {
  return (
    <div className="mx-auto w-full max-w-content-md pt-8">
      {/* PageTopBar: empty left + width toggle (right) */}
      <div className="mb-6 flex items-center justify-between">
        <div />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>

      {/* Header: title + CourseStatsBar (4 stat groups) */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-10 w-48" />

        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-start gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Special lessons row: ~5 narrow cards, horizontal scroll */}
      <div className="mb-8 flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-[260px] shrink-0 rounded-2xl" />
        ))}
      </div>

      {/* Filter tabs row: tabs (left) + search + view toggle (right) */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-80" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* Lessons table: header strip + flush rows (real table has hairline
          borders, no gaps) */}
      <Skeleton className="mb-2 h-10 w-full" />
      <Skeleton className="h-[560px] w-full" />
    </div>
  );
}
