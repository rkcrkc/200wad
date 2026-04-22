import { DashboardContent } from "@/components/DashboardContent";
import { TooltipInit } from "@/components/TooltipInit";
import { Toaster } from "@/components/ui/toaster";
import {
  getDueTestsCount,
  getCurrentCourse,
  getUserLearningStats,
  getCourseProgress,
  getActivePricingPlans,
  getLeaderboard,
  getUserSubscriptions,
} from "@/lib/queries";
import { getTextOverrides } from "@/lib/queries/text";
import { getSubscriptionDisplayInfo, type SubscriptionDisplayInfo } from "@/lib/queries/subscriptionInfo";
import { getEnabledTiers } from "@/lib/utils/accessControl";
import { getFlagFromCode } from "@/lib/utils/flags";
import { createClient } from "@/lib/supabase/server";
import type { SimpleSubscription } from "@/context/SubscriptionContext";

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
  const [dueTestsCount, learningStats, courseProgress, plansResult, enabledTiers, leaderboardData, textOverridesResult, subsResult, displayInfo] = await Promise.all([
    course ? getDueTestsCount(course.id) : Promise.resolve(0),
    getUserLearningStats(),
    course ? getCourseProgress(course.id) : Promise.resolve(null),
    getActivePricingPlans(),
    getEnabledTiers(),
    language ? getLeaderboard(language.id, "avg_words_per_day", "week") : Promise.resolve(null),
    getTextOverrides(),
    isGuest ? Promise.resolve({ subscriptions: [], error: null }) : getUserSubscriptions(),
    getSubscriptionDisplayInfo(),
  ]);

  // Simplify subscriptions for client context
  const subscriptions: SimpleSubscription[] = subsResult.subscriptions.map((s) => ({
    type: s.type as SimpleSubscription["type"],
    targetId: s.target_id,
    isEffective: s.isEffective,
    cancelAtPeriodEnd: s.cancel_at_period_end ?? false,
    currentPeriodEnd: s.current_period_end,
  }));

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
    studyTimeSeconds: learningStats.studyTimeSeconds,
    testTimeSeconds: learningStats.testTimeSeconds,
    leaderboardRank: leaderboardData?.userPosition?.rank ?? null,
  };

  return (
    <div className="h-screen overflow-visible bg-white">
      <TooltipInit />
      <Toaster />
      <DashboardContent
        dueTestsCount={dueTestsCount}
        defaultCourseContext={defaultCourseContext}
        headerStats={headerStats}
        showPreviewMode={isGuest}
        plans={plansResult.plans}
        enabledTiers={enabledTiers}
        textOverrides={textOverridesResult.overrides}
        subscriptions={subscriptions}
        displayInfo={displayInfo}
      >
        {children}
      </DashboardContent>
    </div>
  );
}
