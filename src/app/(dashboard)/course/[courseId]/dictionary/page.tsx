import { getDictionaryWords } from "@/lib/queries";
import { getCourseById } from "@/lib/queries/courses";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { PageShell } from "@/components/PageShell";
import { DictionaryList } from "@/components/DictionaryList";
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

  const isGuest = myWordsResult.isGuest;

  return (
    <PageShell withTopPadding={false} className="pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-page-header">Dictionary</h1>
        </div>

        {/* Dictionary List with Filter Tabs */}
        {courseWordsResult.words.length === 0 && allWordsResult.words.length === 0 ? (
          <EmptyState title="No words available yet." />
        ) : (
          <DictionaryList
            myWords={myWordsResult.words}
            courseWords={courseWordsResult.words}
            allWords={allWordsResult.words}
            languageName={language?.name}
          />
        )}

        {/* Guest CTA */}
        {isGuest && (
          <GuestCTA title="Sign up to track your vocabulary progress" />
        )}
      </PageShell>
  );
}
