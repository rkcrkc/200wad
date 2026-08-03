import { getLessons, getLessonMilestoneScores, getActivePricingPlans, getPricingTierCopy } from "@/lib/queries";
import { getEnabledTiers } from "@/lib/utils/accessControl";
import { LessonsList } from "@/components/LessonsList";
import { SpecialLessonsRow } from "@/components/lessons/SpecialLessonsRow";
import { EmptyState } from "@/components/ui/empty-state";
import { GuestCTA } from "@/components/GuestCTA";
import { PageShell } from "@/components/PageShell";
import { CourseStatsBar } from "@/components/CourseStatsBar";
import { ListSearchProvider } from "@/context/ListSearchContext";
import { ListSearchInput } from "@/components/ListSearchInput";
import { notFound } from "next/navigation";
import { getFlagFromCode } from "@/lib/utils/flags";
import { getAdminUser } from "@/lib/utils/adminGuard";
import { getQaFlagCounts } from "@/lib/queries/qa";

interface CoursePageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;

  // Fetch lessons, milestone scores, and pricing data in parallel
  const [lessonsResult, milestoneScores, plansResult, enabledTiers, pricingCopy, adminUser] = await Promise.all([
    getLessons(courseId),
    getLessonMilestoneScores(courseId),
    getActivePricingPlans(),
    getEnabledTiers(),
    getPricingTierCopy(),
    getAdminUser(),
  ]);

  const { language, course, lessons, stats, isGuest } = lessonsResult;

  if (!course) {
    notFound();
  }

  // Admin-only QA section: per-flag counts of developer-flagged words. Only
  // queried for admins so non-admins never pay for the scan.
  const qaFlagCounts = adminUser ? await getQaFlagCounts(courseId) : null;

  // Lesson-level stats (exclude auto-lessons: My Notes, Best Words, Worst Words)
  const realLessons = lessons.filter((l) => !l.isAutoLesson);
  const totalLessons = realLessons.length;
  const lessonsLearned = realLessons.filter((l) => l.status === "learned" || l.status === "mastered").length;
  const lessonsMastered = realLessons.filter((l) => l.status === "mastered").length;

  const languageFlag = getFlagFromCode(language?.code);

  return (
    <PageShell withTopPadding={false} className="pt-8">
      {/* Shares the header's mobile search with LessonsList's filter (they're
          siblings; the search moves into the header row on mobile). */}
      <ListSearchProvider>
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-page-header">All Lessons</h1>

          {/* Stats */}
          <CourseStatsBar
            wordsLearned={stats.wordsLearned}
            wordsMastered={stats.wordsMastered}
            totalWords={stats.totalWords}
            lessonsLearned={lessonsLearned}
            lessonsMastered={lessonsMastered}
            totalLessons={totalLessons}
            mobileTrailing={<ListSearchInput placeholder="Filter lessons..." />}
          />
        </div>

        {/* Special lessons (auto-generated): Lost Mastery, Unmastered, Worst, Notes, Best */}
        {!isGuest && lessons.length > 0 && <SpecialLessonsRow lessons={lessons} />}

        {/* Lessons List with Filter Tabs */}
        {lessons.length === 0 ? (
          <EmptyState title="No lessons available yet for this course." />
        ) : (
          <LessonsList
            lessons={lessons}
            languageFlag={languageFlag}
            languageName={language?.name}
            languageId={language?.id}
            milestoneScores={milestoneScores}
            plans={plansResult.plans}
            enabledTiers={enabledTiers}
            copy={pricingCopy}
            qaFlagCounts={qaFlagCounts ?? undefined}
            courseId={courseId}
          />
        )}

        {/* Guest CTA */}
        {isGuest && lessons.length > 0 && (
          <GuestCTA title="Sign up to save your learning progress" />
        )}
      </ListSearchProvider>
    </PageShell>
  );
}
