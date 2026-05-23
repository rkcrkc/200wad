import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for /lesson/[lessonId] — mirrors the lesson page
 * (top bar + lesson header with status pill and 3 inline stats + tabs row
 * + words list).
 */
export default function LessonLoading() {
  return (
    <div className="mx-auto w-full max-w-content-md pt-8">
      {/* PageTopBar: back link (left) + width toggle (right) */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>

      {/* Lesson header: row 1 (Lesson # + status pill), row 2 (title + 3 stats) */}
      <div className="mb-8 flex flex-col gap-4">
        {/* Row 1 */}
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>

        {/* Row 2 — stacks under 1280px, side-by-side at xl */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between xl:gap-8">
          <Skeleton className="h-8 w-3/4 max-w-xl" />

          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-start gap-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs row: tabs (left) + search + view toggle (right) */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-72" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* Words list: flush rows (real list is a table with hairline borders, no gaps) */}
      <Skeleton className="h-[560px] w-full" />
    </div>
  );
}
