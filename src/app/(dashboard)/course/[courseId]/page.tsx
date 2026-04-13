import { Clock } from "lucide-react";
import { getLessons, getLessonMilestoneScores, getActivePricingPlans } from "@/lib/queries";
import { setCurrentCourse } from "@/lib/mutations";
import { getEnabledTiers } from "@/lib/utils/accessControl";
import { LessonsList } from "@/components/LessonsList";
import { SetCourseContext } from "@/components/SetCourseContext";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { PageShell } from "@/components/PageShell";
import { Popover } from "@/components/ui/popover";
import { notFound } from "next/navigation";
import { formatDuration, formatNumber, formatPercent, formatRatioPercent } from "@/lib/utils/helpers";
import { getFlagFromCode } from "@/lib/utils/flags";

interface CoursePageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;

  // Fetch lessons, milestone scores, and pricing data in parallel
  const [lessonsResult, milestoneScores, plansResult, enabledTiers] = await Promise.all([
    getLessons(courseId),
    getLessonMilestoneScores(courseId),
    getActivePricingPlans(),
    getEnabledTiers(),
  ]);

  const { language, course, lessons, stats, isGuest } = lessonsResult;

  if (!course) {
    notFound();
  }

  // Update the user's current course (fire-and-forget, don't block render)
  if (!isGuest) {
    setCurrentCourse(courseId);
  }

  // Calculate progress percentages (raw numeric values — formatted via
  // formatPercent / formatRatioPercent at render time so digits/decimals stay
  // consistent with the rest of the app).
  const studiedPercentage =
    stats.totalWords > 0
      ? Math.round((stats.wordsStudied / stats.totalWords) * 100)
      : 0;
  const masteredPercentage =
    stats.totalWords > 0
      ? Math.round((stats.wordsMastered / stats.totalWords) * 100)
      : 0;

  const languageFlag = getFlagFromCode(language?.code);

  return (
    <SetCourseContext languageId={language?.id} languageFlag={languageFlag} courseId={courseId} courseName={course.name}>
    <PageShell withTopPadding={false} className="-mt-6 md:-mt-10 lg:-mt-[60px] pt-[80px]">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-page-header">All Lessons</h1>

        {/* Stats */}
        <div className="flex cursor-default flex-wrap items-center gap-x-8 gap-y-2">
          {/* Total words */}
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">Total words</span>
            <span className="text-regular-semibold">{formatNumber(stats.totalWords)}</span>
          </div>

          {/* Total time */}
          <Popover
            className="flex flex-col items-start cursor-default"
            content={
              <div className="flex flex-col gap-1">
                <span className="text-foreground text-[14px] leading-[1.4] font-semibold">
                  Time breakdown
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground text-[13px] leading-[1.4]">
                    Study time: <span className="font-semibold">{formatDuration(stats.studyTimeSeconds)}</span>
                  </span>
                  <span className="text-foreground text-[13px] leading-[1.4]">
                    Test time: <span className="font-semibold">{formatDuration(stats.testTimeSeconds)}</span>
                  </span>
                </div>
              </div>
            }
          >
            <span className="text-xs text-muted-foreground">Total Time</span>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-regular-semibold">{formatDuration(stats.totalTimeSeconds)}</span>
            </div>
          </Popover>

          {/* Words studied */}
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">Words studied</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-warning" />
              <span className="text-regular-semibold">
                {formatNumber(stats.wordsStudied)} ({formatPercent(studiedPercentage)})
              </span>
            </div>
          </div>

          {/* Words mastered */}
          <div
            className="group relative flex flex-col items-start"
            title={`${formatNumber(stats.wordsMastered)} of ${formatNumber(stats.totalWords)} words mastered (${formatRatioPercent(stats.wordsMastered, stats.totalWords, { decimals: 1 })})`}
          >
            <span className="text-xs text-muted-foreground">Words mastered</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
              <span className="text-regular-semibold">
                {formatNumber(stats.wordsMastered)} ({formatPercent(masteredPercentage)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lessons List with Filter Tabs */}
      {lessons.length === 0 ? (
        <EmptyState title="No lessons available yet for this course." />
      ) : (
        <LessonsList
          lessons={lessons}
          languageFlag={languageFlag}
          languageName={language?.name}
          languageId={language?.id}
          milestoneScores={milestoneScores}
          plans={plansResult.plans}
          enabledTiers={enabledTiers}
        />
      )}

      {/* Guest CTA */}
      {isGuest && lessons.length > 0 && (
        <GuestCTA title="Sign up to save your learning progress" />
      )}
    </PageShell>
    </SetCourseContext>
  );
}
