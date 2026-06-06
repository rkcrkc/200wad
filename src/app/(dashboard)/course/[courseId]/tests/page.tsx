import { Clock, Target } from "lucide-react";
import { getLessons, getTests } from "@/lib/queries";
import { getCourseById } from "@/lib/queries/courses";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { PageShell } from "@/components/PageShell";
import { Tooltip } from "@/components/ui/tooltip";
import { TestsList } from "@/components/TestsList";
import { SpecialLessonsRow } from "@/components/lessons/SpecialLessonsRow";
import { formatDuration, formatPercent } from "@/lib/utils/helpers";
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

  // Tests + lessons in parallel; lessons feed the Special Lessons row.
  const [testsResult, lessonsResult] = await Promise.all([
    getTests(course.id),
    getLessons(course.id),
  ]);
  const { dueTests, previousTests, stats, isGuest } = testsResult;
  const { lessons } = lessonsResult;

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
            {/* Average score per word */}
            <div className="flex flex-col items-start gap-1.5">
              <span className="text-xs text-muted-foreground">Avg. score/word</span>
              <div className="flex items-center gap-1.5">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-regular-semibold">{formatPercent(stats.averageScorePerWord)}</span>
              </div>
            </div>
            {/* Lifetime XP — primary tests-page ledger stat. Rendered as a
                green chip mirroring the XP-earned chip on previous test rows
                to reinforce "earned XP" theming. Ring shows today's progress
                against the daily goal; tooltip breaks down today + best day. */}
            <Tooltip
              align="right"
              position="below"
              label={
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">Lifetime XP</span>
                  <span>
                    XP are points you earn from tests — full marks score 3 XP
                    per word. Today: {stats.todayXp}/{stats.dailyXpGoal} XP.
                    Best day: {stats.bestDayXp} XP.
                  </span>
                </div>
              }
            >
              <div className="flex flex-col items-start gap-1.5">
                <span className="text-xs text-muted-foreground">Lifetime XP</span>
                <span className="inline-flex items-center justify-center gap-1 rounded-md border border-green-500 bg-green-50 px-2 py-0.5 text-regular-semibold text-foreground">
                  {stats.lifetimeXp.toLocaleString()}
                  <span className="text-[10px] font-medium text-muted-foreground">XP</span>
                </span>
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Special lessons (auto-generated): Lost Mastery, Unmastered, Worst, Notes, Best */}
        {!isGuest && lessons.length > 0 && (
          <SpecialLessonsRow lessons={lessons} mode="test" />
        )}

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
