import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for /course/[courseId]/schedule — mirrors the post-login
 * landing page (top bar + scheduler card + lesson grid). Without this file,
 * the schedule page would fall through to the All-Lessons skeleton in
 * ../loading.tsx, which has a completely different layout.
 */
export default function ScheduleLoading() {
  return (
    <div className="mx-auto w-full max-w-content-md pt-12 pb-20">
      {/* PageTopBar: greeting (left) + width toggle (right) */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>

      {/* Scheduler section */}
      <section className="mt-12 mb-16">
        <div className="mb-8 flex items-center justify-between">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-8 w-32" />
        </div>

        {/* SchedulerCard: image left + content right, min-h 450 */}
        <div className="flex min-h-[450px] flex-col overflow-hidden rounded-2xl bg-white shadow-card md:flex-row md:items-stretch md:gap-8">
          <Skeleton className="h-[220px] w-full rounded-none md:h-auto md:w-full md:max-w-[340px]" />
          <div className="flex flex-1 flex-col gap-4 p-6 md:py-8 md:pr-8">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full max-w-md" />
            <div className="mt-auto flex gap-3">
              <Skeleton className="h-11 w-40" />
              <Skeleton className="h-11 w-32" />
            </div>
          </div>
        </div>
      </section>

      {/* Lesson grid section */}
      <section>
        <div className="mb-8 flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-32" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] w-full rounded-2xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
