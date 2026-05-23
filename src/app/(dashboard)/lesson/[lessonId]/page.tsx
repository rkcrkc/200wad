import { notFound, redirect } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { getWords, isAutoLesson, parseAutoLessonId, getLessonActivityHistory } from "@/lib/queries";
import { AUTO_LESSON_META } from "@/lib/queries/auto-lessons";
import { getTextOverrides } from "@/lib/queries/text";
import { getText } from "@/lib/text";
import type { AutoLessonType } from "@/lib/queries";
import type { Lesson } from "@/types/aliases";
import { canAccessLesson } from "@/lib/utils/accessControl";
import { SetCourseContext } from "@/components/SetCourseContext";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { PageShell } from "@/components/PageShell";
import { LessonPageContent } from "@/components/LessonPageContent";
import { Tooltip } from "@/components/ui/tooltip";
import { getFlagFromCode } from "@/lib/utils/flags";

const AUTO_LESSON_EXPLANATIONS: Record<string, string> = {
  notes: "Every word in this course you've added a personal note to.",
  best: "Your top-scoring words across all tests in this course — the ones you get right most consistently.",
  worst: "Your lowest-scoring words across all tests in this course — the ones that need the most practice.",
  unmastered: "Words you've reached 'learned' on but haven't yet mastered (3 full-mark tests in a row), oldest first.",
  lost_mastery: "Words you previously mastered but have since dropped a mistake on — most recent slips first.",
};

// Maps the auto-lesson type to its `TEXT_KEYS` entry. Admins can edit these
// strings in the "Greetings & Messages" tab of the Text & Labels admin page.
const AUTO_LESSON_EMPTY_TEXT_KEY: Record<AutoLessonType, string> = {
  notes: "empty_auto_notes",
  best: "empty_auto_best",
  worst: "empty_auto_worst",
  unmastered: "empty_auto_unmastered",
  lost_mastery: "empty_auto_lost_mastery",
};

interface LessonPageProps {
  params: Promise<{ lessonId: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = await params;

  // Fetch words, activity history, and admin text overrides in parallel.
  // getTextOverrides is cached (revalidate: 3600), so this call is free when
  // the dashboard layout has already warmed the cache.
  const [wordsResult, activityHistory, textOverridesResult] = await Promise.all([
    getWords(lessonId),
    getLessonActivityHistory(lessonId),
    getTextOverrides(),
  ]);

  const { language, course, lesson, words, stats, isGuest, previousLesson, nextLesson, userId } = wordsResult;

  // For auto-lessons, `getAutoLessonWords` can return `lesson: null` in edge
  // cases (e.g. transient `userId === null` from a race between the server-
  // side auth probe and a cookie refresh after `revalidatePath`). Rather than
  // 404 here, synthesize the same virtual lesson `buildAutoLessonResult`
  // would have produced so the empty-state path below renders gracefully.
  // For real (authored) lessons a missing row is still a genuine 404.
  let resolvedLesson: Lesson | null = lesson;
  if (!resolvedLesson) {
    const autoInfo = isAutoLesson(lessonId) ? parseAutoLessonId(lessonId) : null;
    if (!autoInfo) {
      notFound();
    }
    const def = AUTO_LESSON_META[autoInfo.type];
    const now = new Date().toISOString();
    resolvedLesson = {
      id: lessonId,
      course_id: autoInfo.courseId,
      number: def.number,
      title: def.title,
      emoji: def.emoji,
      word_count: 0,
      is_published: true,
      sort_order: def.number,
      legacy_lesson_id: null,
      created_at: now,
      updated_at: now,
      created_by: null,
      updated_by: null,
    };
  }

  // Access gate: redirect to course page if lesson is locked
  if (course && !isAutoLesson(lessonId)) {
    const access = await canAccessLesson(
      userId,
      { lessonNumber: resolvedLesson.number },
      { id: course.id, language_id: course.language_id, free_lessons: course.free_lessons }
    );
    if (!access.hasAccess) {
      redirect(`/course/${course.id}?upgrade-lesson=${encodeURIComponent(resolvedLesson.id)}`);
    }
  }

  // Calculate progress stats — canonical statuses only, excluding info pages
  const testableWords = words.filter((w) => w.category !== "information");
  const wordsNotStarted = testableWords.filter((w) => w.status === "not-started").length;
  const wordsLearning = testableWords.filter((w) => w.status === "learning").length;
  const wordsLearned = testableWords.filter((w) => w.status === "learned").length;
  const wordsMastered = testableWords.filter((w) => w.status === "mastered").length;
  const masteredPercentage =
    stats.totalWords > 0
      ? Math.round((stats.wordsMastered / stats.totalWords) * 100)
      : 0;

  const languageFlag = getFlagFromCode(language?.code);

  // Check if this is an auto-lesson and resolve its empty-state message via
  // the admin-editable text registry (falls back to the default in lib/text.ts
  // when no override is set).
  const autoLessonInfo = isAutoLesson(lessonId) ? parseAutoLessonId(lessonId) : null;
  const emptyMessage = getText(
    autoLessonInfo
      ? AUTO_LESSON_EMPTY_TEXT_KEY[autoLessonInfo.type]
      : "empty_lesson_default",
    textOverridesResult.overrides,
  );

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
              <div className="mb-2 flex items-center gap-2.5">
                <p className="text-regular-semibold text-black-80">
                  Lesson #{resolvedLesson.number}
                </p>
                {autoLessonInfo && (
                  <Tooltip
                    label={AUTO_LESSON_EXPLANATIONS[autoLessonInfo.type]}
                    position="below"
                    align="left"
                  >
                    <span
                      role="img"
                      aria-label="How this lesson is built"
                      className="relative top-[3px] inline-flex text-black-50 hover:text-black-80 transition-colors"
                    >
                      <HelpCircle className="h-[15px] w-[15px]" strokeWidth={2} />
                    </span>
                  </Tooltip>
                )}
              </div>
              <h1 className="flex items-center gap-4 text-xxl-semibold">
                {resolvedLesson.emoji && <span className="text-2xl">{resolvedLesson.emoji}</span>}
                {resolvedLesson.title}
              </h1>
            </div>

            {/* Empty state card */}
            <EmptyState title={emptyMessage} />
          </div>
        ) : (
          <LessonPageContent
            lesson={resolvedLesson}
            words={testableWords}
            languageName={language?.name ?? undefined}
            courseId={course?.id}
            wordsNotStarted={wordsNotStarted}
            wordsLearning={wordsLearning}
            wordsLearned={wordsLearned}
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
