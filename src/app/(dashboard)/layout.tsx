import { DashboardContent } from "@/components/DashboardContent";
import { TooltipInit } from "@/components/TooltipInit";
import { Toaster } from "@/components/ui/toaster";
import {
  getDueTestsCount,
  getCurrentCourse,
  getUserLearningStats,
  getCourseProgress,
  getActivePricingPlans,
  getPricingTierCopy,
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
  const [plansResult, enabledTiers, textOverridesResult, subsResult, displayInfo, pricingCopy, langListResult] =
    await Promise.all([
      getActivePricingPlans(),
      getEnabledTiers(),
      getTextOverrides(),
      isGuest
        ? Promise.resolve({ subscriptions: [], error: null })
        : getUserSubscriptions(),
      getSubscriptionDisplayInfo(),
      getPricingTierCopy(),
      supabase
        .from("languages")
        .select("id, name, code")
        .eq("is_visible", true)
        .order("sort_order"),
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
            // Global (cross-language) XP weekly rank — matches the leaderboard board.
            // The board hides zero-XP members behind a teaser, so a rank is only
            // meaningful once the learner has scored this week (see leaderboardRank).
            getUserLeaderboardPosition(null, "xp", "week"),
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
              leaderboardRank:
                (leaderboardPosition?.metric_value ?? 0) > 0
                  ? leaderboardPosition?.rank ?? null
                  : null,
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

  // Languages selectable in the global upgrade modal's single-language picker:
  // every visible language the user hasn't already unlocked. Hidden entirely
  // for all-languages subscribers (they have nothing left to unlock here).
  const hasAllAccess = subsResult.subscriptions.some(
    (s) => s.type === "all-languages" && s.isEffective
  );
  const unlockedLanguageIds = new Set(
    subsResult.subscriptions
      .filter((s) => s.isEffective && s.type === "language" && s.target_id)
      .map((s) => s.target_id as string)
  );
  const upgradeLanguages = hasAllAccess
    ? []
    : (langListResult.data ?? [])
        .filter((l) => !unlockedLanguageIds.has(l.id))
        .map((l) => ({
          id: l.id,
          name: l.name,
          flag: getFlagFromCode(l.code),
        }));
  // Default the picker to the current course's language when it's still
  // unlocked-able, otherwise the first available language.
  const upgradeDefaultLanguageId =
    upgradeLanguages.find((l) => l.id === language?.id)?.id ??
    upgradeLanguages[0]?.id;

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
        pricingCopy={pricingCopy}
        upgradeLanguages={upgradeLanguages}
        upgradeDefaultLanguageId={upgradeDefaultLanguageId}
        textOverrides={textOverridesResult.overrides}
        subscriptions={subscriptions}
        displayInfo={displayInfo}
      >
        {children}
      </DashboardContent>
    </div>
  );
}
