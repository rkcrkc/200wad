import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { notFound } from "next/navigation";
import { getWords } from "@/lib/queries";
import { WordsList } from "@/components/WordsList";
import { SetCourseContext } from "@/components/SetCourseContext";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils/helpers";

interface LessonPageProps {
  params: Promise<{ lessonId: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = await params;
  const { language, course, lesson, words, stats, isGuest } = await getWords(lessonId);

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

  return (
    <SetCourseContext languageFlag={language?.flag} courseId={course?.id} courseName={course?.name}>
    <div>
      {/* Back Button */}
      <BackButton
        href={course ? `/lessons/${course.id}` : "/dashboard"}
        label={course?.name || "Lessons"}
      />

      {/* Header */}
      <div className="mb-6">
        <p className="mb-2 text-small-semibold text-foreground/50">
          Lesson #{lesson.number}
        </p>
        <h1 className="mb-4 text-xxl-bold">
          {lesson.emoji && <span className="mr-2">{lesson.emoji}</span>}
          {lesson.title}
        </h1>

        {/* Stats bar */}
        <div className="flex items-center gap-6">
          {/* Average score - placeholder for now */}
          <div className="flex items-center gap-2 text-success">
            <span className="text-small-regular">Average score</span>
            <span className="text-regular-semibold">✓ {masteredPercentage}%</span>
          </div>

          {/* Total time */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-small-regular">Total time</span>
            <span className="text-regular-semibold">{formatTime(stats.totalTimeSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Words List with Filter Tabs */}
      {words.length === 0 ? (
        <EmptyState title="No words available yet for this lesson." />
      ) : (
        <WordsList
          words={words}
          languageFlag={language?.flag}
          wordsNotStudied={wordsNotStudied}
          wordsNotMastered={wordsNotMastered}
        />
      )}

      {/* Action Buttons */}
      {words.length > 0 && (
        <div className="mt-8 flex gap-4">
          <Button asChild size="xl" className="flex-1">
            <Link href={`/lesson/${lessonId}/study`}>
              Study lesson
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="xl" className="flex-1">
            <Link href={`/lesson/${lessonId}/test`}>
              Take test
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
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
    </div>
    </SetCourseContext>
  );
}
