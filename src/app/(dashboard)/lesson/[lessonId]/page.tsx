import Link from "next/link";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getWords } from "@/lib/queries";
import { WordsList } from "@/components/WordsList";
import { SetCourseContext } from "@/components/SetCourseContext";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils/helpers";
import { getFlagFromCode } from "@/lib/utils/flags";

interface LessonPageProps {
  params: Promise<{ lessonId: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = await params;
  const { language, course, lesson, words, stats, isGuest, previousLesson, nextLesson } = await getWords(lessonId);

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

  return (
    <SetCourseContext languageId={language?.id} languageFlag={languageFlag} courseId={course?.id} courseName={course?.name}>
    <>
    <PageContainer size="md" withTopPadding={false} className={`pt-8 ${words.length > 0 ? "pb-[160px]" : ""}`.trim()}>
      {/* Breadcrumbs */}
      <nav className="mb-8 flex items-center gap-2 text-xs-medium text-black-50" aria-label="Breadcrumb">
        {course?.id ? (
          <Link
            href={`/course/${course.id}`}
            className="transition-colors hover:text-foreground"
          >
            All Lessons
          </Link>
        ) : (
          <span>All Lessons</span>
        )}
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate" aria-current="page">
          #{lesson.number} {lesson.title}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2 text-regular-semibold text-black-80">
            Lesson #{lesson.number}
          </p>
          <h1 className="text-xxl-semibold">
            {lesson.emoji && <span className="mr-2">{lesson.emoji}</span>}
            {lesson.title}
          </h1>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          {/* Average score */}
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">Average score</span>
            <div className="flex items-center gap-1.5 text-success">
              <span className="text-regular-semibold">✓ {masteredPercentage}%</span>
            </div>
          </div>

          {/* Total time */}
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">Total time</span>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-regular-semibold">{formatTime(stats.totalTimeSeconds)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Words List with Filter Tabs */}
      {words.length === 0 ? (
        <EmptyState title="No words available yet for this lesson." />
      ) : (
        <WordsList
          words={words}
          languageFlag={languageFlag}
          languageName={language?.name ?? undefined}
          wordsNotStudied={wordsNotStudied}
          wordsNotMastered={wordsNotMastered}
        />
      )}

      {/* Previous/Next lesson navigation - TODO: implement with adjacent lessons query */}
      {/* <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
        <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
          Previous: #14 Animals
        </button>
        <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          Next: #16 Colors
          <ChevronRight className="h-5 w-5" />
        </button>
      </div> */}

      {/* Guest CTA */}
      {isGuest && words.length > 0 && (
        <GuestCTA title="Sign up to save your learning progress" />
      )}
    </PageContainer>

    {/* Fixed footer bar - same height and styling as study/test mode */}
    {words.length > 0 && (
      <div className="fixed bottom-0 left-[240px] right-0 z-10 bg-white shadow-[0px_-8px_30px_-15px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between gap-4 border-t border-gray-100 px-6 py-4">
          {previousLesson ? (
            <Link
              href={`/lesson/${previousLesson.id}`}
              className="flex min-w-0 max-w-44 shrink-0 items-center gap-2 overflow-hidden text-left transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <span className="text-xs text-muted-foreground">Previous</span>
                <span className="block min-w-0 truncate text-regular-semibold text-foreground" title={`#${previousLesson.number} ${previousLesson.title}`}>
                  #{previousLesson.number} {previousLesson.title}
                </span>
              </div>
            </Link>
          ) : (
            <div />
          )}
          <div className="flex flex-1 items-center justify-center gap-4">
            <Button asChild size="xl" className="flex-1 max-w-[240px]">
              <Link href={`/lesson/${lessonId}/study`}>
                Study lesson
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="flex-1 max-w-[240px]">
              <Link href={`/lesson/${lessonId}/test`}>
                Take test
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          {nextLesson ? (
            <Link
              href={`/lesson/${nextLesson.id}`}
              className="flex min-w-0 max-w-44 shrink-0 items-center gap-2 overflow-hidden text-left transition-colors hover:text-foreground"
            >
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <span className="text-xs text-muted-foreground">Next</span>
                <span className="block min-w-0 truncate text-regular-semibold text-foreground" title={`#${nextLesson.number} ${nextLesson.title}`}>
                  #{nextLesson.number} {nextLesson.title}
                </span>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    )}
    </>
    </SetCourseContext>
  );
}
