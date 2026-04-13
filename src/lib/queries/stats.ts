import { createClient } from "@/lib/supabase/server";

// ============================================================================
// PROGRESS PAGE TYPES
// ============================================================================

export interface WordsPerDayRates {
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
  lifetime: number;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
}

export interface CumulativeProgress {
  wordsMastered: number;
  totalWords: number;
  wordsStudied: number;
  lessonsCompleted: number;
  totalLessons: number;
  courseCompletionPercent: number;
  totalStudyTimeSeconds: number;
  studyTimeSeconds: number;
  testTimeSeconds: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface ProgressPageStats {
  wordsPerDayRates: WordsPerDayRates;
  streaks: StreakStats;
  cumulative: CumulativeProgress;
  heatmapData: HeatmapDay[];
}

// ============================================================================
// EXISTING TYPES
// ============================================================================

export interface UserLearningStats {
  /** Total words studied across all sessions */
  totalWordsStudied: number;
  /** Total time spent studying in seconds */
  totalTimeSeconds: number;
  /** Calculated words per 8-hour day rate */
  wordsPerDay: number;
}

/**
 * Get user learning stats from word progress, study sessions, and tests.
 * Words per day is calculated as: (new_words_encountered / total_time_hours) * 8
 * where new_words_encountered = words that transitioned from not-started to learning
 * (i.e. user_word_progress rows with a learning_at timestamp).
 * Total time includes both study and test time.
 */
export async function getUserLearningStats(): Promise<UserLearningStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalWordsStudied: 0,
      totalTimeSeconds: 0,
      wordsPerDay: 0,
    };
  }

  // Query word progress, study_sessions, and test_scores in parallel
  const [wordsResult, sessionsResult, testsResult] = await Promise.all([
    supabase
      .from("user_word_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("learning_at", "is", null),
    supabase
      .from("study_sessions")
      .select("duration_seconds")
      .eq("user_id", user.id),
    supabase
      .from("user_test_scores")
      .select("duration_seconds")
      .eq("user_id", user.id),
  ]);

  const totalWordsStudied = wordsResult.count || 0;
  const sessions = sessionsResult.data || [];
  const tests = testsResult.data || [];

  const studyTimeSeconds = sessions.reduce(
    (sum, s) => sum + (s.duration_seconds || 0),
    0
  );
  const testTimeSeconds = tests.reduce(
    (sum, t) => sum + (t.duration_seconds || 0),
    0
  );
  const totalTimeSeconds = studyTimeSeconds + testTimeSeconds;
  const totalHours = totalTimeSeconds / 3600;

  // Calculate words per 8-hour day
  const wordsPerDay =
    totalHours > 0 ? Math.round((totalWordsStudied / totalHours) * 8) : 0;

  return {
    totalWordsStudied,
    totalTimeSeconds,
    wordsPerDay,
  };
}

export interface CourseProgressStats {
  /** Number of lessons completed (mastered) */
  lessonsCompleted: number;
  /** Total lessons in the course */
  totalLessons: number;
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** Number of words mastered */
  wordsMastered: number;
  /** Total words in the course */
  totalWords: number;
}

/**
 * Get progress stats for a specific course
 */
export async function getCourseProgress(
  courseId: string
): Promise<CourseProgressStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get total lessons for the course
  const { count: totalLessons } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  if (!totalLessons || totalLessons === 0) {
    return {
      lessonsCompleted: 0,
      totalLessons: 0,
      progressPercent: 0,
      wordsMastered: 0,
      totalWords: 0,
    };
  }

  if (!user) {
    return {
      lessonsCompleted: 0,
      totalLessons,
      progressPercent: 0,
      wordsMastered: 0,
      totalWords: 0,
    };
  }

  // Get lesson IDs for this course
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId);

  if (!lessons || lessons.length === 0) {
    return {
      lessonsCompleted: 0,
      totalLessons,
      progressPercent: 0,
      wordsMastered: 0,
      totalWords: 0,
    };
  }

  const lessonIds = lessons.map((l) => l.id);

  // Fetch mastered lessons, lesson_words (paginated), and user progress in parallel.
  // lesson_words can exceed PostgREST's default 1000-row page for large courses, so
  // we page through it explicitly rather than relying on a fixed limit.
  const fetchAllLessonWords = async (): Promise<{ word_id: string | null }[]> => {
    const pageSize = 1000;
    const rows: { word_id: string | null }[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("lesson_words")
        .select("word_id")
        .in("lesson_id", lessonIds)
        .range(offset, offset + pageSize - 1);
      if (error || !data) break;
      rows.push(...data);
      if (data.length < pageSize) break;
    }
    return rows;
  };

  const [lessonsCompletedResult, lessonWordsRows, userProgressResult] = await Promise.all([
    supabase
      .from("user_lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("lesson_id", lessonIds)
      .eq("status", "mastered"),
    fetchAllLessonWords(),
    supabase
      .from("user_word_progress")
      .select("word_id, status")
      .eq("user_id", user.id)
      .eq("status", "mastered"),
  ]);

  const completed = lessonsCompletedResult.count || 0;

  // Calculate word stats
  const courseWordIds = new Set(
    lessonWordsRows.map((lw) => lw.word_id).filter((id): id is string => id !== null)
  );
  const totalWords = courseWordIds.size;
  const wordsMastered = (userProgressResult.data || []).filter(
    (p) => p.word_id && courseWordIds.has(p.word_id)
  ).length;

  // Progress is based on words mastered percentage
  const progressPercent = totalWords > 0 ? Math.round((wordsMastered / totalWords) * 100) : 0;

  return {
    lessonsCompleted: completed,
    totalLessons,
    progressPercent,
    wordsMastered,
    totalWords,
  };
}

// ============================================================================
// PROGRESS PAGE QUERY
// ============================================================================

/**
 * Get all stats needed for the Progress page.
 * Fetches activity data, streaks, course progress, and time breakdowns in parallel.
 */
export async function getProgressStats(courseId: string): Promise<ProgressPageStats> {
  const emptyStats: ProgressPageStats = {
    wordsPerDayRates: { thisWeek: 0, thisMonth: 0, thisYear: 0, lifetime: 0 },
    streaks: { currentStreak: 0, longestStreak: 0 },
    cumulative: {
      wordsMastered: 0,
      totalWords: 0,
      wordsStudied: 0,
      lessonsCompleted: 0,
      totalLessons: 0,
      courseCompletionPercent: 0,
      totalStudyTimeSeconds: 0,
      studyTimeSeconds: 0,
      testTimeSeconds: 0,
    },
    heatmapData: [],
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return emptyStats;

  // Step 1: Get course info to find language_id
  const { data: course } = await supabase
    .from("courses")
    .select("language_id")
    .eq("id", courseId)
    .single();

  if (!course || !course.language_id) return emptyStats;

  // Step 2: Fetch all data in parallel
  const [activityResult, userResult, courseProgress, wordProgressResult, sessionsResult, testsResult] =
    await Promise.all([
      // All daily activity rows for this user + language
      supabase
        .from("user_daily_activity")
        .select("activity_date, words_mastered, words_studied")
        .eq("user_id", user.id)
        .eq("language_id", course.language_id)
        .order("activity_date"),
      // Streak data from users table
      supabase
        .from("users")
        .select("current_streak, longest_streak")
        .eq("id", user.id)
        .single(),
      // Reuse existing course progress function
      getCourseProgress(courseId),
      // New words encountered (learning_at timestamps) for per-period rate
      supabase
        .from("user_word_progress")
        .select("learning_at")
        .eq("user_id", user.id)
        .not("learning_at", "is", null),
      // Study sessions for time totals
      supabase
        .from("study_sessions")
        .select("duration_seconds, started_at")
        .eq("user_id", user.id),
      // Test scores for time totals
      supabase
        .from("user_test_scores")
        .select("duration_seconds, taken_at")
        .eq("user_id", user.id),
    ]);

  const activityRows = activityResult.data || [];
  const userData = userResult.data;
  const wordProgressRows = wordProgressResult.data || [];
  const sessions = sessionsResult.data || [];
  const tests = testsResult.data || [];

  // --- Words per day rates ---
  // Same formula as the header: (new_words_encountered / total_hours) * 8
  // new_words_encountered = user_word_progress rows with learning_at in period
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Week start = Monday
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - mondayOffset);

  // Month start = 1st of current month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Year start = Jan 1
  const yearStart = new Date(today.getFullYear(), 0, 1);

  const computeRate = (startDate: Date | null): number => {
    const startMs = startDate ? startDate.getTime() : 0;

    const newWords = wordProgressRows.filter((w) => {
      if (!w.learning_at) return false;
      return !startDate || new Date(w.learning_at).getTime() >= startMs;
    }).length;

    const studyTime = sessions
      .filter((s) => {
        if (!s.started_at) return !startDate;
        return new Date(s.started_at).getTime() >= startMs;
      })
      .reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

    const testTime = tests
      .filter((t) => {
        if (!t.taken_at) return !startDate;
        return new Date(t.taken_at).getTime() >= startMs;
      })
      .reduce((sum, t) => sum + (t.duration_seconds || 0), 0);

    const totalHours = (studyTime + testTime) / 3600;
    if (totalHours <= 0) return 0;
    return Math.round((newWords / totalHours) * 8);
  };

  const wordsPerDayRates: WordsPerDayRates = {
    thisWeek: computeRate(weekStart),
    thisMonth: computeRate(monthStart),
    thisYear: computeRate(yearStart),
    lifetime: computeRate(null),
  };

  // --- Streaks ---
  const streaks: StreakStats = {
    currentStreak: userData?.current_streak ?? 0,
    longestStreak: userData?.longest_streak ?? 0,
  };

  // --- Cumulative progress ---
  const studyTimeSeconds = sessions.reduce(
    (sum, s) => sum + (s.duration_seconds || 0),
    0
  );
  const testTimeSeconds = tests.reduce(
    (sum, t) => sum + (t.duration_seconds || 0),
    0
  );

  // Count total words studied (studying + mastered) from course progress
  // wordsStudied here means words that are in progress (not mastered yet)
  // We'll compute it as: total words that have any progress
  const wordsStudied = activityRows.reduce((sum, r) => sum + (r.words_studied || 0), 0);

  const cumulative: CumulativeProgress = {
    wordsMastered: courseProgress.wordsMastered,
    totalWords: courseProgress.totalWords,
    wordsStudied,
    lessonsCompleted: courseProgress.lessonsCompleted,
    totalLessons: courseProgress.totalLessons,
    courseCompletionPercent: courseProgress.progressPercent,
    totalStudyTimeSeconds: studyTimeSeconds + testTimeSeconds,
    studyTimeSeconds,
    testTimeSeconds,
  };

  // --- Heatmap data (last 365 days) ---
  const heatmapData: HeatmapDay[] = [];
  const activityMap = new Map<string, number>();
  for (const row of activityRows) {
    const existing = activityMap.get(row.activity_date) || 0;
    activityMap.set(row.activity_date, existing + (row.words_mastered || 0));
  }

  // Generate 365-day array, filling gaps with 0
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    heatmapData.push({
      date: dateStr,
      count: activityMap.get(dateStr) || 0,
    });
  }

  return {
    wordsPerDayRates,
    streaks,
    cumulative,
    heatmapData,
  };
}
