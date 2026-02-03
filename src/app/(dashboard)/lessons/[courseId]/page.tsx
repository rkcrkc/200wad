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

interface LessonsPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function LessonsPage({ params }: LessonsPageProps) {
  const { courseId } = await params;
  const { language, course, lessons, stats, isGuest } = await getLessons(courseId);

  if (!course) {
    notFound();
  }

  const wordsStudied = lessons.reduce(
    (sum, l) => sum + (l.status !== "not-started" ? (l.word_count ?? 0) : 0),
    0
  );
  const studiedPercentage =
    stats.totalWords > 0
      ? Math.round((wordsStudied / stats.totalWords) * 100)
      : 0;
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

      {/* Header with Stats */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-xxl-bold">{course.name}</h1>
          {course.description && (
            <p className="text-sm text-muted-foreground">{course.description}</p>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* Total words */}
          <div className="text-right">
            <div className="mb-1 text-small-regular text-muted-foreground">
              Total words
            </div>
            <div className="text-regular-semibold text-foreground">
              {stats.totalWords}
            </div>
          </div>

          {/* Total Time */}
          <div className="text-right">
            <div className="mb-1 flex items-center justify-end gap-1 text-small-regular text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Total Time
            </div>
            <div className="text-regular-semibold text-foreground">
              {formatTime(stats.totalTimeSeconds)}
            </div>
          </div>

          {/* Words studied */}
          <div className="text-right">
            <div className="mb-1 text-small-regular text-muted-foreground">
              Words studied
            </div>
            <div className="flex items-center justify-end gap-1.5 text-regular-semibold">
              <span className="inline-flex h-2 w-2 rounded-full bg-success" />
              {wordsStudied}/{stats.totalWords} ({studiedPercentage}%)
            </div>
          </div>

          {/* Words mastered */}
          <div className="text-right">
            <div className="mb-1 text-small-regular text-muted-foreground">
              Words mastered
            </div>
            <div className="flex items-center justify-end gap-1.5 text-regular-semibold">
              <span className="inline-flex h-2 w-2 rounded-full bg-warning" />
              {stats.wordsMastered} ({masteredPercentage}%)
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
    </div>
    </SetCourseContext>
  );
}
