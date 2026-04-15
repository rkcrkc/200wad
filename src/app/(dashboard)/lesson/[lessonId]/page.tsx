import { notFound, redirect } from "next/navigation";
import { getWords, isAutoLesson, parseAutoLessonId, getLessonActivityHistory } from "@/lib/queries";
import { canAccessLesson } from "@/lib/utils/accessControl";
import { SetCourseContext } from "@/components/SetCourseContext";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { PageShell } from "@/components/PageShell";
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

  const { language, course, lesson, words, stats, isGuest, previousLesson, nextLesson, userId } = wordsResult;

  if (!lesson) {
    notFound();
  }

  // Access gate: redirect to course page if lesson is locked
  if (course && !isAutoLesson(lessonId)) {
    const access = await canAccessLesson(
      userId,
      { lessonNumber: lesson.number },
      { id: course.id, language_id: course.language_id, free_lessons: course.free_lessons }
    );
    if (!access.hasAccess) {
      redirect(`/course/${course.id}`);
    }
  }

  // Calculate progress stats — canonical statuses only, excluding info pages
  const testableWords = words.filter((w) => w.category !== "information");
  const wordsNotStarted = testableWords.filter((w) => w.status === "not-started").length;
  const wordsLearning = testableWords.filter((w) => w.status === "learning").length;
  const wordsMastered = testableWords.filter((w) => w.status === "mastered").length;
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
      <PageShell
        backLink={course?.id ? { href: `/course/${course.id}`, label: "All Lessons" } : undefined}
        withTopPadding={false}
        className="pt-8"
      >
        {testableWords.length === 0 ? (
          // Empty state - show header with informative message
          <div>
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
            words={testableWords}
            languageFlag={languageFlag}
            languageName={language?.name ?? undefined}
            courseId={course?.id}
            wordsNotStarted={wordsNotStarted}
            wordsLearning={wordsLearning}
            wordsMastered={wordsMastered}
            masteredPercentage={masteredPercentage}
            averageTestScore={stats.averageTestScore}
            totalTimeSeconds={stats.totalTimeSeconds}
            studyTimeSeconds={stats.studyTimeSeconds}
            testTimeSeconds={stats.testTimeSeconds}
            previousLesson={previousLesson}
            nextLesson={nextLesson}
            activityHistory={activityHistory}
          />
        )}

        {/* Guest CTA */}
        {isGuest && testableWords.length > 0 && (
          <GuestCTA title="Sign up to save your learning progress" />
        )}
      </PageShell>
    </SetCourseContext>
  );
}
