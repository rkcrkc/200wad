import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getWords, isAutoLesson, parseAutoLessonId, getLessonActivityHistory } from "@/lib/queries";
import { SetCourseContext } from "@/components/SetCourseContext";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { PageContainer } from "@/components/PageContainer";
import { LessonPageContent } from "@/components/LessonPageContent";
import { getFlagFromCode } from "@/lib/utils/flags";

interface LessonPageProps {
  params: Promise<{ lessonId: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = await params;

  // Fetch words and activity history in parallel
  const [wordsResult, activityHistory] = await Promise.all([
    getWords(lessonId),
    getLessonActivityHistory(lessonId),
  ]);

  const { language, course, lesson, words, stats, isGuest, previousLesson, nextLesson } = wordsResult;

  if (!lesson) {
    notFound();
  }

  // Calculate progress stats
  const wordsNotStudied = words.filter((w) => w.status === "not-started").length;
  const wordsNotMastered = words.filter((w) => w.status !== "mastered").length;
  const masteredPercentage =
    stats.totalWords > 0
      ? Math.round((stats.wordsMastered / stats.totalWords) * 100)
      : 0;

  const languageFlag = getFlagFromCode(language?.code);

  // Check if this is an auto-lesson and get type-specific empty message
  const autoLessonInfo = isAutoLesson(lessonId) ? parseAutoLessonId(lessonId) : null;
  const autoLessonEmptyMessages: Record<string, string> = {
    notes: "No words yet — words you add notes to will appear here.",
    best: "No words yet — take some tests to see your best words here.",
    worst: "No words yet — take some tests to see words needing practice.",
  };

  const emptyMessage = autoLessonInfo
    ? autoLessonEmptyMessages[autoLessonInfo.type]
    : "No words available yet for this lesson.";

  return (
    <SetCourseContext languageId={language?.id} languageFlag={languageFlag} courseId={course?.id} courseName={course?.name}>
      <PageContainer size="md" withTopPadding={false} className="pt-8">
        {words.length === 0 ? (
          // Empty state - show header with informative message
          <div>
            {/* Back button */}
            {course?.id && (
              <Link
                href={`/course/${course.id}`}
                className="mb-8 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                All Lessons
              </Link>
            )}

            {/* Header */}
            <div className="mb-6">
              <p className="mb-2 text-regular-semibold text-black-80">
                Lesson #{lesson.number}
              </p>
              <h1 className="flex items-center gap-4 text-xxl-semibold">
                {lesson.emoji && <span className="text-2xl">{lesson.emoji}</span>}
                {lesson.title}
              </h1>
            </div>

            {/* Empty state card */}
            <EmptyState title={emptyMessage} />
          </div>
        ) : (
          <LessonPageContent
            lesson={lesson}
            words={words}
            languageFlag={languageFlag}
            languageName={language?.name ?? undefined}
            courseId={course?.id}
            wordsNotStudied={wordsNotStudied}
            wordsNotMastered={wordsNotMastered}
            masteredPercentage={masteredPercentage}
            totalTimeSeconds={stats.totalTimeSeconds}
            previousLesson={previousLesson}
            nextLesson={nextLesson}
            activityHistory={activityHistory}
          />
        )}

        {/* Guest CTA */}
        {isGuest && words.length > 0 && (
          <GuestCTA title="Sign up to save your learning progress" />
        )}
      </PageContainer>
    </SetCourseContext>
  );
}
