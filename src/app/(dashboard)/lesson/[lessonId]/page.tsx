import { notFound } from "next/navigation";
import { getWords } from "@/lib/queries";
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
      <PageContainer size="md" withTopPadding={false} className="pt-8">
        {words.length === 0 ? (
          <EmptyState title="No words available yet for this lesson." />
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
