export { getLanguages } from "./languages";
export type { LanguageWithProgress, GetLanguagesResult } from "./languages";

export { getCourses, getCourseById } from "./courses";
export type { CourseWithProgress, GetCoursesResult, GetCourseByIdResult } from "./courses";

export { getLessons } from "./lessons";
export type {
  LessonStatus,
  LessonWithProgress,
  GetLessonsResult,
} from "./lessons";

// Pure (no server imports) auto-lesson helpers — re-exported from the barrel
// so client components can import them without dragging in lessons.ts (which
// pulls in @/lib/supabase/server and next/headers).
export { isAutoLesson, parseAutoLessonId, createAutoLessonId } from "./auto-lessons";
export type { AutoLessonType } from "./auto-lessons";

export { getWords, getWord } from "./words";
export type {
  WordStatus,
  WordWithDetails,
  GetWordsResult,
} from "./words";

export { getUserSettings } from "./settings";
export type {
  UserSettings,
  LearningLanguage,
  GetUserSettingsResult,
} from "./settings";

export { getScheduleData, getDueTestsCount, getCurrentCourse } from "./schedule";

export { getUserLearningStats, getCourseProgress, getProgressStats } from "./stats";
export type {
  UserLearningStats,
  CourseProgressStats,
  ProgressPageStats,
  WordsPerDayRates,
  StreakStats,
  CumulativeProgress,
  HeatmapDay,
  ChartDailyRow,
  ChartServerData,
} from "./stats";
export type {
  LessonForScheduler,
  ScheduleData,
  GetScheduleDataResult,
  CurrentCourseInfo,
} from "./schedule";

export { getTests, getLessonMilestoneScores, getLessonActivityHistory } from "./tests";
export type { TestForList, GetTestsResult, LessonMilestoneScores, LessonActivity, LessonActivityHistoryResult } from "./tests";

export { getDictionaryWords } from "./dictionary";
export type { DictionaryWord, GetDictionaryResult } from "./dictionary";

export { getUserSubscriptions, hasActiveSubscription, getActivePricingPlans, getAllPricingPlans, getSubscriptionPageData } from "./subscriptions";
export type { UserSubscription, GetUserSubscriptionsResult, GetPricingPlansResult, SubscriptionPageData, SubscriptionLanguage, GetSubscriptionPageDataResult } from "./subscriptions";

export { getCreditBalance, getReferralStats } from "./credits";
export type { CreditBalance, GetCreditBalanceResult, GetReferralStatsResult } from "./credits";

export { getLeaderboard, getUserLeaderboardPosition, getLeaderboardRewards, getLeagueConfig, getPersonalBests } from "./leaderboard";
export type { LeaderboardEntry, LeaderboardMetric, LeaderboardPeriod, LeaderboardData, LeaderboardReward } from "./leaderboard";

export { getHelpEntries, getHelpEntriesAdmin } from "./help";

// `getTextOverrides` is intentionally NOT re-exported here — pulling it through
// the barrel drags `@/lib/supabase/server` (which imports `next/headers`) into
// any Client Component that imports anything else from `@/lib/queries`.
// Import it directly from `@/lib/queries/text` instead.

export { getTipsForWords, getAllTips, getTipsByWordId } from "./tips";
export type { TipForWord, TipWithWordCount } from "./tips";

export { getAchievementsForUser } from "./achievements";
export type {
  AchievementCategory,
  AchievementTier,
  UnlockCriteria,
  AchievementExtra,
  AchievementForList,
  UserAchievementAggregates,
  GetAchievementsForUserResult,
} from "./achievements";

export { getStreakPageData, getCurrentStreak } from "./streaks";
export type {
  StreakSummary,
  StreakRecoverState,
  StreakPageData,
} from "./streaks";

export { getDailyGoalProgress } from "./daily-goal";
export type { DailyGoalProgress } from "./daily-goal";

export { getShopData } from "./shop";
export type { ShopCategory, ShopItemForList, ShopData } from "./shop";

export { getUserLevel } from "./levels";
export type { LevelTier, UserLevelData } from "./levels";
