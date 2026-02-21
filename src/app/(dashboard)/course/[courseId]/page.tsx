import { Clock } from "lucide-react";
import { getLessons } from "@/lib/queries";
import { LessonsList } from "@/components/LessonsList";
import { SetCourseContext } from "@/components/SetCourseContext";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { PageContainer } from "@/components/PageContainer";
import { notFound } from "next/navigation";
import { formatTime } from "@/lib/utils/helpers";
import { getFlagFromCode } from "@/lib/utils/flags";

interface CoursePageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;
  const { language, course, lessons, stats, isGuest } = await getLessons(courseId);

  if (!course) {
    notFound();
  }

  // Calculate progress percentages
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
    <PageContainer size="lg" withTopPadding={false} className="-mt-6 md:-mt-10 lg:-mt-[60px] pt-[80px]">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-page-header">All Lessons</h1>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          {/* Total words */}
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">Total words</span>
            <span className="text-regular-semibold">{stats.totalWords}</span>
          </div>

          {/* Total time */}
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">Total Time</span>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-regular-semibold">{formatTime(stats.totalTimeSeconds)}</span>
            </div>
          </div>

          {/* Words studied */}
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">Words studied</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
              <span className="text-regular-semibold">
                {stats.wordsStudied} ({studiedPercentage}%)
              </span>
            </div>
          </div>

          {/* Words mastered */}
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">Words mastered</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-warning" />
              <span className="text-regular-semibold">
                {stats.wordsMastered} ({masteredPercentage}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lessons List with Filter Tabs */}
      {lessons.length === 0 ? (
        <EmptyState title="No lessons available yet for this course." />
      ) : (
        <LessonsList lessons={lessons} languageFlag={languageFlag} />
      )}

      {/* Guest CTA */}
      {isGuest && lessons.length > 0 && (
        <GuestCTA title="Sign up to save your learning progress" />
      )}
    </PageContainer>
    </SetCourseContext>
  );
}
