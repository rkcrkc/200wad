import { Clock } from "lucide-react";
import { getTests } from "@/lib/queries";
import { getCourseById } from "@/lib/queries/courses";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { PageShell } from "@/components/PageShell";
import { TestsList } from "@/components/TestsList";
import { formatDuration } from "@/lib/utils/helpers";
import { notFound } from "next/navigation";

interface TestsPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CourseTestsPage({ params }: TestsPageProps) {
  const { courseId } = await params;

  // Get course info
  const { course } = await getCourseById(courseId);

  if (!course) {
    notFound();
  }

  const { dueTests, previousTests, stats, isGuest } = await getTests(course.id);

  return (
    <PageShell withTopPadding={false} className="pt-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-page-header">Tests</h1>

          {/* Stats */}
          <div className="flex cursor-default flex-wrap items-center gap-x-8 gap-y-2">
            {/* Total test time */}
            <div className="flex flex-col items-start gap-1.5">
              <span className="text-xs text-muted-foreground">Total Test Time</span>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-regular-semibold">{formatDuration(stats.totalTestTimeSeconds)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tests List with Filter Tabs */}
        {dueTests.length === 0 && previousTests.length === 0 ? (
          <EmptyState title="No tests available yet. Start studying a lesson to unlock tests!" />
        ) : (
          <TestsList
            dueTests={dueTests}
            previousTests={previousTests}
            averageScore={stats.averageScore}
          />
        )}

        {/* Guest CTA */}
        {isGuest && (
          <GuestCTA title="Sign up to track your test progress" />
        )}
    </PageShell>
  );
}
