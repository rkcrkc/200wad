import { DashboardContent } from "@/components/DashboardContent";
import { TooltipInit } from "@/components/TooltipInit";
import {
  getDueTestsCount,
  getCurrentCourse,
  getUserLearningStats,
  getCourseProgress,
  getActivePricingPlans,
  getLeaderboard,
} from "@/lib/queries";
import { getEnabledTiers } from "@/lib/utils/accessControl";
import { getFlagFromCode } from "@/lib/utils/flags";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is a guest (for preview mode)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isGuest = !user;

  // Fetch current language and course for header display
  const { course, language } = await getCurrentCourse();

  // Fetch stats and pricing in parallel
  const [dueTestsCount, learningStats, courseProgress, plansResult, enabledTiers, leaderboardData] = await Promise.all([
    course ? getDueTestsCount(course.id) : Promise.resolve(0),
    getUserLearningStats(),
    course ? getCourseProgress(course.id) : Promise.resolve(null),
    getActivePricingPlans(),
    getEnabledTiers(),
    language ? getLeaderboard(language.id, "avg_words_per_day", "week") : Promise.resolve(null),
  ]);

  // Prepare default course context for header
  const defaultCourseContext = course && language
    ? {
        languageId: language.id,
        languageFlag: getFlagFromCode(language.code),
        languageName: language.name,
        courseId: course.id,
        courseName: course.name,
      }
    : undefined;

  // Prepare header stats
  const headerStats = {
    wordsPerDay: learningStats.wordsPerDay,
    courseProgressPercent: courseProgress?.progressPercent ?? 0,
    wordsMastered: courseProgress?.wordsMastered ?? 0,
    totalWords: courseProgress?.totalWords ?? 0,
    totalWordsStudied: learningStats.totalWordsStudied,
    totalTimeSeconds: learningStats.totalTimeSeconds,
    leaderboardRank: leaderboardData?.userPosition?.rank ?? null,
  };

  return (
    <div className="h-screen overflow-hidden bg-white">
      <TooltipInit />
      <DashboardContent
        dueTestsCount={dueTestsCount}
        defaultCourseContext={defaultCourseContext}
        headerStats={headerStats}
        showPreviewMode={isGuest}
        plans={plansResult.plans}
        enabledTiers={enabledTiers}
      >
        {children}
      </DashboardContent>
    </div>
  );
}
