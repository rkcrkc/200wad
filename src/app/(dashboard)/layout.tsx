import { DashboardContent } from "@/components/DashboardContent";
import { TooltipInit } from "@/components/TooltipInit";
import { Toaster } from "@/components/ui/toaster";
import {
  getDueTestsCount,
  getCurrentCourse,
  getUserLearningStats,
  getCourseProgress,
  getActivePricingPlans,
  getUserLeaderboardPosition,
  getUserSubscriptions,
  getCurrentStreak,
  getDailyGoalProgress,
} from "@/lib/queries";
import { getTextOverrides } from "@/lib/queries/text";
import { getSubscriptionDisplayInfo } from "@/lib/queries/subscriptionInfo";
import { getEnabledTiers } from "@/lib/utils/accessControl";
import { getFlagFromCode } from "@/lib/utils/flags";
import { createClient } from "@/lib/supabase/server";
import type { SimpleSubscription } from "@/context/SubscriptionContext";
import type { HeaderStatsBundle } from "@/context/HeaderStatsContext";

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

  // FAST critical-path queries — children consume these via providers
  // (SubscriptionProvider, TextProvider, CourseProvider) so the layout
  // must await them before rendering.
  const [plansResult, enabledTiers, textOverridesResult, subsResult, displayInfo] =
    await Promise.all([
      getActivePricingPlans(),
      getEnabledTiers(),
      getTextOverrides(),
      isGuest
        ? Promise.resolve({ subscriptions: [], error: null })
        : getUserSubscriptions(),
      getSubscriptionDisplayInfo(),
    ]);

  // SLOW header-only stats — bundled into a single Promise that streams via
  // <Suspense> in DashboardContent → HeaderStatsProvider. The layout shell
  // (and children!) render before this resolves; Header/Sidebar pop their
  // stats in once the promise settles. Cuts the longest aggregation queries
  // (course progress + per-user learning stats) out of the critical path.
  const headerStatsPromise: Promise<HeaderStatsBundle> | null =
    course && language
      ? (async () => {
          const [
            dueTestsCount,
            learningStats,
            courseProgress,
            leaderboardPosition,
            currentStreak,
            dailyGoal,
          ] = await Promise.all([
            getDueTestsCount(course.id),
            getUserLearningStats(course.id),
            getCourseProgress(course.id),
            getUserLeaderboardPosition(language.id, "avg_words_per_day", "week"),
            getCurrentStreak(),
            getDailyGoalProgress(),
          ]);
          return {
            stats: {
              wordsPerDay: learningStats.wordsPerDay,
              courseProgressPercent: courseProgress?.progressPercent ?? 0,
              wordsMastered: courseProgress?.wordsMastered ?? 0,
              totalWords: courseProgress?.totalWords ?? 0,
              totalWordsLearned: learningStats.totalWordsLearned,
              totalTimeSeconds: learningStats.totalTimeSeconds,
              studyTimeSeconds: learningStats.studyTimeSeconds,
              testTimeSeconds: learningStats.testTimeSeconds,
              leaderboardRank: leaderboardPosition?.rank ?? null,
              currentStreak,
              dailyGoal,
            },
            dueTestsCount,
          };
        })()
      : null;

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

  return (
    <div className="h-screen overflow-visible bg-white">
      <TooltipInit />
      <Toaster />
      <DashboardContent
        defaultCourseContext={defaultCourseContext}
        headerStatsPromise={headerStatsPromise}
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
