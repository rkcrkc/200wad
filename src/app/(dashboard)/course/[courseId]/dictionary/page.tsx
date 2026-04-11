import { getDictionaryWords } from "@/lib/queries";
import { getCourseById } from "@/lib/queries/courses";
import { setCurrentCourse } from "@/lib/mutations";
import { SetCourseContext } from "@/components/SetCourseContext";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { PageShell } from "@/components/PageShell";
import { DictionaryList } from "@/components/DictionaryList";
import { getFlagFromCode } from "@/lib/utils/flags";
import { formatNumber, formatPercent, formatRatioPercent } from "@/lib/utils/helpers";
import { notFound } from "next/navigation";

// Disable caching for this page to always show fresh data
export const dynamic = "force-dynamic";

interface DictionaryPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CourseDictionaryPage({ params }: DictionaryPageProps) {
  const { courseId } = await params;

  // Get course and language info
  const { course, language } = await getCourseById(courseId);

  if (!course) {
    notFound();
  }

  // Fetch all three word lists in parallel
  const [myWordsResult, courseWordsResult, allWordsResult] = await Promise.all([
    getDictionaryWords(courseId, "my-words"),
    getDictionaryWords(courseId, "course"),
    getDictionaryWords(courseId, "all"),
  ]);

  const languageFlag = getFlagFromCode(language?.code);
  const isGuest = myWordsResult.isGuest;

  // Update the user's current course (fire-and-forget, don't block render)
  if (!isGuest) {
    setCurrentCourse(courseId);
  }

  // Use course words stats for the header
  const stats = courseWordsResult.stats;

  // Calculate percentages
  const studiedPercentage =
    stats.totalWords > 0
      ? Math.round((stats.wordsStudied / stats.totalWords) * 100)
      : 0;
  const masteredPercentage =
    stats.totalWords > 0
      ? Math.round((stats.wordsMastered / stats.totalWords) * 100)
      : 0;

  return (
    <SetCourseContext
      languageId={language?.id}
      languageFlag={languageFlag}
      courseId={course.id}
      courseName={course.name}
    >
      <PageShell withTopPadding={false} className="-mt-6 md:-mt-10 lg:-mt-[60px] pt-[80px]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-page-header">Dictionary</h1>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            {/* Total words */}
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">Total Words</span>
              <span className="text-regular-semibold">{formatNumber(stats.totalWords)}</span>
            </div>

            {/* Words studied */}
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">Words Studied</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                <span className="text-regular-semibold">
                  {formatNumber(stats.wordsStudied)} ({formatPercent(studiedPercentage)})
                </span>
              </div>
            </div>

            {/* Words mastered */}
            <div
              className="flex flex-col items-start"
              title={`${formatNumber(stats.wordsMastered)} of ${formatNumber(stats.totalWords)} words mastered (${formatRatioPercent(stats.wordsMastered, stats.totalWords, { decimals: 1 })})`}
            >
              <span className="text-xs text-muted-foreground">Words Mastered</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-success" />
                <span className="text-regular-semibold">
                  {formatNumber(stats.wordsMastered)} ({formatPercent(masteredPercentage)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dictionary List with Filter Tabs */}
        {courseWordsResult.words.length === 0 && allWordsResult.words.length === 0 ? (
          <EmptyState title="No words available yet." />
        ) : (
          <DictionaryList
            myWords={myWordsResult.words}
            courseWords={courseWordsResult.words}
            allWords={allWordsResult.words}
            languageFlag={languageFlag}
            languageName={language?.name}
          />
        )}

        {/* Guest CTA */}
        {isGuest && (
          <GuestCTA title="Sign up to track your vocabulary progress" />
        )}
      </PageShell>
    </SetCourseContext>
  );
}
