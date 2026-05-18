import type { Database } from "./database-generated";

// ============================================================================
// CONVENIENCE TYPE ALIASES
// These provide backward compatibility with existing code.
//
// IMPORTANT: This file is hand-written. Add new convenience aliases here so
// they survive regeneration of `database-generated.ts` via `supabase gen types`.
// ============================================================================

export type Language = Database["public"]["Tables"]["languages"]["Row"];

// Greetings JSONB shape stored on languages
export interface GreetingEntry {
  text: string;
  translation: string;
}
export interface LanguageGreetings {
  morning: GreetingEntry;
  afternoon: GreetingEntry;
  evening: GreetingEntry;
}
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type Word = Database["public"]["Tables"]["words"]["Row"];
export type LessonWord = Database["public"]["Tables"]["lesson_words"]["Row"];
export type ExampleSentence = Database["public"]["Tables"]["example_sentences"]["Row"];
export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserLanguage = Database["public"]["Tables"]["user_languages"]["Row"];
export type UserWordProgress = Database["public"]["Tables"]["user_word_progress"]["Row"];
export type UserLessonProgress = Database["public"]["Tables"]["user_lesson_progress"]["Row"];
export type StudySession = Database["public"]["Tables"]["study_sessions"]["Row"];
export type UserTestScore = Database["public"]["Tables"]["user_test_scores"]["Row"];
export type TestQuestion = Database["public"]["Tables"]["test_questions"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
export type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];
export type NotificationBroadcast = Database["public"]["Tables"]["notification_broadcasts"]["Row"];
export type NotificationBroadcastInsert = Database["public"]["Tables"]["notification_broadcasts"]["Insert"];
export type NotificationBroadcastUpdate = Database["public"]["Tables"]["notification_broadcasts"]["Update"];
export type NotificationTypeConfig = Database["public"]["Tables"]["notification_types"]["Row"];
export type NotificationTypeConfigInsert = Database["public"]["Tables"]["notification_types"]["Insert"];
export type NotificationTypeConfigUpdate = Database["public"]["Tables"]["notification_types"]["Update"];
export type NotificationTemplate = Database["public"]["Tables"]["notification_templates"]["Row"];
export type NotificationTemplateInsert = Database["public"]["Tables"]["notification_templates"]["Insert"];
export type NotificationTemplateUpdate = Database["public"]["Tables"]["notification_templates"]["Update"];
export type UserNotificationPreference = Database["public"]["Tables"]["user_notification_preferences"]["Row"];
export type UserNotificationPreferenceInsert = Database["public"]["Tables"]["user_notification_preferences"]["Insert"];
export type UserNotificationPreferenceUpdate = Database["public"]["Tables"]["user_notification_preferences"]["Update"];
export type StudyMusicTrack = Database["public"]["Tables"]["study_music_tracks"]["Row"];

// Insert types
export type LanguageInsert = Database["public"]["Tables"]["languages"]["Insert"];
export type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];
export type LessonInsert = Database["public"]["Tables"]["lessons"]["Insert"];
export type WordInsert = Database["public"]["Tables"]["words"]["Insert"];
export type LessonWordInsert = Database["public"]["Tables"]["lesson_words"]["Insert"];
export type UserWordProgressInsert = Database["public"]["Tables"]["user_word_progress"]["Insert"];
export type UserTestScoreInsert = Database["public"]["Tables"]["user_test_scores"]["Insert"];
export type TestQuestionInsert = Database["public"]["Tables"]["test_questions"]["Insert"];
export type StudyMusicTrackInsert = Database["public"]["Tables"]["study_music_tracks"]["Insert"];
export type StudyMusicTrackUpdate = Database["public"]["Tables"]["study_music_tracks"]["Update"];

// Update types
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];
export type UserWordProgressUpdate = Database["public"]["Tables"]["user_word_progress"]["Update"];
export type UserLessonProgressUpdate = Database["public"]["Tables"]["user_lesson_progress"]["Update"];

// Billing types
export type PlatformConfig = Database["public"]["Tables"]["platform_config"]["Row"];
export type PricingPlan = Database["public"]["Tables"]["pricing_plans"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"];
export type CreditTransaction = Database["public"]["Tables"]["credit_transactions"]["Row"];
export type CreditTransactionInsert = Database["public"]["Tables"]["credit_transactions"]["Insert"];
export type Referral = Database["public"]["Tables"]["referrals"]["Row"];
export type ReferralInsert = Database["public"]["Tables"]["referrals"]["Insert"];

// Leaderboard types
export type UserDailyActivity = Database["public"]["Tables"]["user_daily_activity"]["Row"];
export type UserDailyActivityInsert = Database["public"]["Tables"]["user_daily_activity"]["Insert"];
export type WeeklyLeaderboardSnapshot = Database["public"]["Tables"]["weekly_leaderboard_snapshots"]["Row"];
export type LeaderboardRewardRow = Database["public"]["Tables"]["leaderboard_rewards"]["Row"];
export type ActivityFlag = Database["public"]["Tables"]["activity_flags"]["Row"];
export type ActivityFlagInsert = Database["public"]["Tables"]["activity_flags"]["Insert"];

// Help types
export type HelpEntry = Database["public"]["Tables"]["help_entries"]["Row"];
export type HelpEntryInsert = Database["public"]["Tables"]["help_entries"]["Insert"];
export type HelpEntryUpdate = Database["public"]["Tables"]["help_entries"]["Update"];

// Tips types
export type Tip = Database["public"]["Tables"]["tips"]["Row"];
export type TipInsert = Database["public"]["Tables"]["tips"]["Insert"];
export type TipUpdate = Database["public"]["Tables"]["tips"]["Update"];
export type TipWord = Database["public"]["Tables"]["tip_words"]["Row"];
export type TipWordInsert = Database["public"]["Tables"]["tip_words"]["Insert"];
export type UserTipDismissal = Database["public"]["Tables"]["user_tip_dismissals"]["Row"];
