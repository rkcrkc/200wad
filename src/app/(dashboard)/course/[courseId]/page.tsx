import { Clock } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { getLessons } from "@/lib/queries";
import { LessonsList } from "@/components/LessonsList";
import { SetCourseContext } from "@/components/SetCourseContext";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
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

  // Calculate progress stats
  const masteredPercentage =
    stats.totalWords > 0
      ? Math.round((stats.wordsMastered / stats.totalWords) * 100)
      : 0;

  const languageFlag = getFlagFromCode(language?.code);

  return (
    <SetCourseContext languageFlag={languageFlag} courseId={courseId} courseName={course.name}>
    <div>
      {/* Back Button */}
      <BackButton
        href={language ? `/courses/${language.id}` : "/dashboard"}
        label={`${language?.name || "All"} Courses`}
      />

      {/* Header */}
      <div className="mb-6">
        <p className="mb-2 text-small-semibold text-foreground/50">
          {course.level && course.level.charAt(0).toUpperCase() + course.level.slice(1)}
          {course.cefr_range && ` • ${course.cefr_range}`}
        </p>
        <h1 className="mb-4 text-xxl-bold">
          {course.name}
        </h1>
        {course.description && (
          <p className="mb-4 text-sm text-muted-foreground">{course.description}</p>
        )}

        {/* Stats bar */}
        <div className="flex items-center gap-6">
          {/* Words mastered */}
          <div className="flex items-center gap-2 text-success">
            <span className="text-small-regular">Words mastered</span>
            <span className="text-regular-semibold">✓ {masteredPercentage}%</span>
          </div>

          {/* Total time */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-small-regular">Total time</span>
            <span className="text-regular-semibold">{formatTime(stats.totalTimeSeconds)}</span>
          </div>

          {/* Total words */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-small-regular">Total words</span>
            <span className="text-regular-semibold">{stats.totalWords}</span>
          </div>

          {/* Total lessons */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-small-regular">Lessons</span>
            <span className="text-regular-semibold">{lessons.length}</span>
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
    </div>
    </SetCourseContext>
  );
}
