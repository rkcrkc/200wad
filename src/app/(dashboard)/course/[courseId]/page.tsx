import { getLessons, getLessonMilestoneScores, getActivePricingPlans } from "@/lib/queries";
import { setCurrentCourse } from "@/lib/mutations";
import { getEnabledTiers } from "@/lib/utils/accessControl";
import { LessonsList } from "@/components/LessonsList";
import { SetCourseContext } from "@/components/SetCourseContext";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { PageShell } from "@/components/PageShell";
import { CourseStatsBar } from "@/components/CourseStatsBar";
import { notFound } from "next/navigation";
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

  // Lesson-level stats
  const totalLessons = lessons.length;
  const lessonsStudied = lessons.filter((l) => l.status !== "not-started").length;
  const lessonsMastered = lessons.filter((l) => l.status === "mastered").length;

  const languageFlag = getFlagFromCode(language?.code);

  return (
    <SetCourseContext languageId={language?.id} languageFlag={languageFlag} courseId={courseId} courseName={course.name}>
    <PageShell withTopPadding={false} className="pt-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-page-header">All Lessons</h1>

        {/* Stats */}
        <CourseStatsBar
          wordsStudied={stats.wordsStudied}
          wordsMastered={stats.wordsMastered}
          totalWords={stats.totalWords}
          lessonsStudied={lessonsStudied}
          lessonsMastered={lessonsMastered}
          totalLessons={totalLessons}
        />
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
