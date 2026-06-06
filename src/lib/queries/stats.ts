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
  wordsLearned: number;
  totalWords: number;
  wordsStudied: number;
  lessonsCompleted: number;
  totalLessons: number;
  courseCompletionPercent: number;
  totalStudyTimeSeconds: number;
  studyTimeSeconds: number;
  testTimeSeconds: number;
  lifetimeXp: number;
  bestDayXp: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
  /**
   * Set when every row for this date has `streak_frozen = true` — the day is
   * a freeze bridge rather than real activity. Optional so the existing
   * `/progress` heatmap (which doesn't surface freezes) stays unchanged.
   */
  frozen?: boolean;
  /** Lesson sessions completed on this date (for the sessions tooltip). */
  lessonSessions?: number;
  /** Test sessions completed on this date (for the sessions tooltip). */
  testSessions?: number;
  /** Words that reached `learned` status on this date (for the words tooltip). */
  wordsLearned?: number;
  /** Words that reached `mastered` status on this date (for the words tooltip). */
  wordsMastered?: number;
}

export interface ChartDailyRow {
  date: string;              // "YYYY-MM-DD"
  newWordsStarted: number;   // words with learning_at on this day
  newlyLearned: number;      // words with learned_at on this day (≥1 full-mark 3/3 test)
  newlyMastered: number;     // words with mastered_at on this day
  cumulativeVocab: number;   // running sum of started
  cumulativeLearned: number; // running sum of learned (≥1 full-mark 3/3 test)
  cumulativeMastered: number;// running sum of mastered
  studyTimeSeconds: number;  // study + test time on this day
  cumulativeStudyTimeSeconds: number; // running sum of study time
}

export interface ChartServerData {
  dailyRows: ChartDailyRow[];
  totalCourseWords: number;
  firstActivityDate: string | null;
}

export interface ProgressPageStats {
  wordsPerDayRates: WordsPerDayRates;
  streaks: StreakStats;
  cumulative: CumulativeProgress;
  heatmapData: HeatmapDay[];
  chartData: ChartServerData;
}

// ============================================================================
// EXISTING TYPES
// ============================================================================

export interface UserLearningStats {
  /** Total words learned (≥1 full-mark 3/3 test) across all courses */
  totalWordsLearned: number;
  /** Total time spent studying in seconds */
  totalTimeSeconds: number;
  /** Study-only time in seconds */
  studyTimeSeconds: number;
  /** Test-only time in seconds */
  testTimeSeconds: number;
  /** Calculated words per 8-hour day rate */
  wordsPerDay: number;
}

/**
 * Get user learning stats from word progress, study sessions, and tests.
 * Words per day is calculated as: (words_learned / total_time_hours) * 8
 * where words_learned = words that have reached at least 'learned' status (i.e.
 * answered with full marks 3/3 in a test at least once — `user_word_progress`
 * rows with a non-null `learned_at` timestamp). Total time includes both study
 * and test time.
 *
 * When `courseId` is provided, BOTH the numerator and denominator are scoped to
 * that course:
 *   - Words: limited to the course's word IDs (excluding information pages)
 *   - Time: study_sessions and test_sessions are joined to `lessons` and
 *     filtered by `lessons.course_id = courseId`
 * Sessions/tests with null timestamps are excluded from the time totals so the
 * rate stays consistent with the per-period rates on the Progress page.
 */
export async function getUserLearningStats(
  courseId?: string
): Promise<UserLearningStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalWordsLearned: 0,
      totalTimeSeconds: 0,
      studyTimeSeconds: 0,
      testTimeSeconds: 0,
      wordsPerDay: 0,
    };
  }

  // Course-scoped path: paginate lesson_words to gather the set of word IDs
  // that belong to this course (excluding information pages), then count
  // user_word_progress rows whose word_id is in that set and that have a
  // non-null learned_at. Mirrors the Progress page's scoping logic.
  const fetchCourseWordIdsForStats = async (
    cId: string
  ): Promise<Set<string>> => {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id")
      .eq("course_id", cId);
    const lessonIds = (lessons || []).map((l) => l.id);
    if (lessonIds.length === 0) return new Set();

    const pageSize = 1000;
    const ids = new Set<string>();
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("lesson_words")
        .select("word_id, words(category)")
        .in("lesson_id", lessonIds)
        .range(offset, offset + pageSize - 1);
      if (error || !data) break;
      for (const row of data) {
        const category = (row.words as unknown as { category: string | null } | null)?.category;
        if (row.word_id && category !== "information") {
          ids.add(row.word_id);
        }
      }
      if (data.length < pageSize) break;
    }
    return ids;
  };

  // Paginate user_word_progress rows with non-null learned_at so we can
  // intersect client-side (avoids URL-length limits on .in(word_id, [...])).
  const fetchUserLearnedWordIds = async (): Promise<string[]> => {
    const pageSize = 1000;
    const ids: string[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("user_word_progress")
        .select("word_id")
        .eq("user_id", user.id)
        .not("learned_at", "is", null)
        .range(offset, offset + pageSize - 1);
      if (error || !data) break;
      for (const row of data) {
        if (row.word_id) ids.push(row.word_id);
      }
      if (data.length < pageSize) break;
    }
    return ids;
  };

  // Word count: course-scoped via intersection when courseId is given,
  // otherwise filter info pages out via a foreign-key join on `words`.
  // The non-course branch wraps Supabase's PromiseLike result in
  // Promise.resolve so the union type satisfies `Promise<number>`.
  const wordsCountPromise: Promise<number> = courseId
    ? Promise.all([
        fetchCourseWordIdsForStats(courseId),
        fetchUserLearnedWordIds(),
      ]).then(([courseWordIds, learnedIds]) =>
        learnedIds.filter((id) => courseWordIds.has(id)).length
      )
    : Promise.resolve(
        supabase
          .from("user_word_progress")
          .select("id, words!inner(category)", { count: "exact", head: true })
          .eq("user_id", user.id)
          .not("learned_at", "is", null)
          .neq("words.category", "information")
          .then((r) => r.count || 0)
      );

  // When scoping by course, resolve the course's real lesson UUIDs and
  // combine with a `course_id` predicate so auto-lesson rows (lesson_id
  // NULL, course_id set) are also included. The restored FK on
  // `lesson_id → lessons.id` is no longer used as an embedded join here
  // because we still need auto-lesson rows in the same query — `.or()`
  // achieves both in one round-trip.
  //
  // Guard: PostgREST rejects empty `in.()` predicates, so we omit the
  // `lesson_id.in.(...)` clause when the course has no lessons.
  const courseLessonUuids: string[] | null = courseId
    ? await (async () => {
        const { data: courseLessons } = await supabase
          .from("lessons")
          .select("id")
          .eq("course_id", courseId);
        return ((courseLessons || []).map((l) => l.id) as string[]);
      })()
    : null;

  const courseScopeOr = courseId
    ? (courseLessonUuids && courseLessonUuids.length > 0
        ? `lesson_id.in.(${courseLessonUuids.join(",")}),course_id.eq.${courseId}`
        : `course_id.eq.${courseId}`)
    : null;

  const sessionsQuery = courseScopeOr
    ? supabase
        .from("study_sessions")
        .select("duration_seconds, started_at")
        .eq("user_id", user.id)
        .or(courseScopeOr)
        .not("started_at", "is", null)
    : supabase
        .from("study_sessions")
        .select("duration_seconds, started_at")
        .eq("user_id", user.id)
        .not("started_at", "is", null);

  const testsQuery = courseScopeOr
    ? supabase
        .from("test_sessions")
        .select("duration_seconds, taken_at")
        .eq("user_id", user.id)
        .or(courseScopeOr)
        .not("taken_at", "is", null)
    : supabase
        .from("test_sessions")
        .select("duration_seconds, taken_at")
        .eq("user_id", user.id)
        .not("taken_at", "is", null);

  const [totalWordsLearned, sessionsResult, testsResult] = await Promise.all([
    wordsCountPromise,
    sessionsQuery,
    testsQuery,
  ]);

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
    totalHours > 0 ? Math.round((totalWordsLearned / totalHours) * 8) : 0;

  return {
    totalWordsLearned,
    totalTimeSeconds,
    studyTimeSeconds,
    testTimeSeconds,
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
  const fetchAllLessonWords = async (): Promise<{ word_id: string | null; words: { category: string | null } | null }[]> => {
    const pageSize = 1000;
    const rows: { word_id: string | null; words: { category: string | null } | null }[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("lesson_words")
        .select("word_id, words(category)")
        .in("lesson_id", lessonIds)
        .range(offset, offset + pageSize - 1);
      if (error || !data) break;
      rows.push(...(data as typeof rows));
      if (data.length < pageSize) break;
    }
    return rows;
  };

  // Fetch lessons-completed count and lesson_words in parallel; user_word_progress
  // is fetched after so it can be scoped to this course's words (avoids the default
  // 1000-row cap silently truncating mastered counts for power users).
  const [lessonsCompletedResult, lessonWordsRows] = await Promise.all([
    supabase
      .from("user_lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("lesson_id", lessonIds)
      .eq("status", "mastered"),
    fetchAllLessonWords(),
  ]);

  const completed = lessonsCompletedResult.count || 0;

  // Calculate word stats — exclude information pages
  const courseWordIds = new Set(
    lessonWordsRows
      .filter((lw) => (lw.words as unknown as { category: string | null })?.category !== "information")
      .map((lw) => lw.word_id)
      .filter((id): id is string => id !== null)
  );
  const totalWords = courseWordIds.size;

  // Scope by user_id + status only. Filtering by word_id pushes 1k+ UUIDs
  // through PostgREST and silently returns empty on long URLs for big
  // courses. We intersect with courseWordIds client-side instead.
  const fetchAllUserMasteredProgress = async (): Promise<{ word_id: string | null }[]> => {
    const pageSize = 1000;
    const rows: { word_id: string | null }[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("user_word_progress")
        .select("word_id")
        .eq("user_id", user.id)
        .eq("status", "mastered")
        .range(offset, offset + pageSize - 1);
      if (error || !data) break;
      rows.push(...data);
      if (data.length < pageSize) break;
    }
    return rows;
  };
  const masteredProgressRows = await fetchAllUserMasteredProgress();
  const wordsMastered = masteredProgressRows.filter(
    (r) => r.word_id && courseWordIds.has(r.word_id)
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
      wordsLearned: 0,
      totalWords: 0,
      wordsStudied: 0,
      lessonsCompleted: 0,
      totalLessons: 0,
      courseCompletionPercent: 0,
      totalStudyTimeSeconds: 0,
      studyTimeSeconds: 0,
      testTimeSeconds: 0,
      lifetimeXp: 0,
      bestDayXp: 0,
    },
    heatmapData: [],
    chartData: { dailyRows: [], totalCourseWords: 0, firstActivityDate: null },
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

  // Step 2: Get lesson IDs for course (needed for chart data filtering)
  const { data: courseLessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId);

  const courseLessonIds = (courseLessons || []).map((l) => l.id);

  // Paginated fetch of course word IDs (same pattern as getCourseProgress), excluding info pages
  const fetchCourseWordIds = async (): Promise<Set<string>> => {
    if (courseLessonIds.length === 0) return new Set();
    const pageSize = 1000;
    const ids = new Set<string>();
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("lesson_words")
        .select("word_id, words(category)")
        .in("lesson_id", courseLessonIds)
        .range(offset, offset + pageSize - 1);
      if (error || !data) break;
      for (const row of data) {
        if (row.word_id && (row.words as unknown as { category: string | null })?.category !== "information") {
          ids.add(row.word_id);
        }
      }
      if (data.length < pageSize) break;
    }
    return ids;
  };

  // Step 3: Fetch course word IDs so we can intersect client-side.
  const courseWordIds = await fetchCourseWordIds();

  // Paginated fetch of user_word_progress. Scoped by user_id only —
  // filtering by word_id pushes 1k+ UUIDs through PostgREST and silently
  // returns empty on long URLs for big courses. Downstream consumers
  // intersect with courseWordIds to keep things course-scoped.
  const fetchAllScopedWordProgress = async (): Promise<
    { word_id: string | null; learning_at: string | null; learned_at: string | null; mastered_at: string | null; status: string | null }[]
  > => {
    const pageSize = 1000;
    const rows: { word_id: string | null; learning_at: string | null; learned_at: string | null; mastered_at: string | null; status: string | null }[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("user_word_progress")
        .select("word_id, learning_at, learned_at, mastered_at, status")
        .eq("user_id", user.id)
        .not("learning_at", "is", null)
        .range(offset, offset + pageSize - 1);
      if (error || !data) break;
      rows.push(...data);
      if (data.length < pageSize) break;
    }
    return rows;
  };

  // Course-scoping for time totals: combine the resolved real-lesson UUIDs
  // with a `course_id` predicate so auto-lesson rows are included too. The
  // FK on `lesson_id → lessons.id` was restored by migration
  // 20260516000002, but auto-lesson rows have `lesson_id IS NULL` and live
  // under `(auto_lesson_type, course_id)`, so the `.or()` predicate is the
  // canonical course-scoped filter.
  //
  // Guard: PostgREST rejects empty `in.()` predicates, so omit the
  // `lesson_id.in.(...)` clause when the course has no lessons.
  const courseScopeOr =
    courseLessonIds.length > 0
      ? `lesson_id.in.(${courseLessonIds.join(",")}),course_id.eq.${courseId}`
      : `course_id.eq.${courseId}`;

  // Step 4: Fetch the rest in parallel
  const [activityResult, userResult, courseProgress, scopedWordProgress, sessionsResult, testsResult] =
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
        .select("current_streak, longest_streak, lifetime_xp, pb_day_test_points")
        .eq("id", user.id)
        .single(),
      // Reuse existing course progress function
      getCourseProgress(courseId),
      // Word progress with timestamps for chart + per-period rate
      // (scoped to this course's words to avoid the 1000-row cap)
      fetchAllScopedWordProgress(),
      // Study sessions for time totals — scoped to this course
      supabase
        .from("study_sessions")
        .select("duration_seconds, started_at")
        .eq("user_id", user.id)
        .or(courseScopeOr),
      // Test scores for time totals — scoped to this course
      supabase
        .from("test_sessions")
        .select("duration_seconds, taken_at")
        .eq("user_id", user.id)
        .or(courseScopeOr),
    ]);

  const activityRows = activityResult.data || [];
  const userData = userResult.data;
  // wordProgressRows is unscoped (all courses) — downstream consumers must
  // intersect with courseWordIds. Filtering here keeps all derived stats
  // course-scoped in one place.
  const wordProgressRows = scopedWordProgress.filter(
    (w) => w.word_id && courseWordIds.has(w.word_id)
  );
  const sessions = sessionsResult.data || [];
  const tests = testsResult.data || [];

  // --- Words per day rates ---
  // Same formula as the header: (words_learned / total_hours) * 8
  // words_learned = user_word_progress rows with `learned_at` in period (i.e.
  // words that received at least one full-mark 3/3 test answer in the period).
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

  // Sessions/tests with null timestamps are always excluded (same rule for
  // every window, including lifetime) so this stays consistent with the
  // Header's lifetime rate, which also excludes null-timestamp rows.
  const computeRate = (startDate: Date | null): number => {
    const startMs = startDate ? startDate.getTime() : 0;

    const newWords = wordProgressRows.filter((w) => {
      if (!w.learned_at) return false;
      return !startDate || new Date(w.learned_at).getTime() >= startMs;
    }).length;

    const studyTime = sessions
      .filter((s) => {
        if (!s.started_at) return false;
        return !startDate || new Date(s.started_at).getTime() >= startMs;
      })
      .reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

    const testTime = tests
      .filter((t) => {
        if (!t.taken_at) return false;
        return !startDate || new Date(t.taken_at).getTime() >= startMs;
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

  // wordsLearned = words the user has learned but not yet mastered (status='learned')
  // Together with wordsMastered this matches `get_course_vocab_count` used by TestCompletedModal.
  const wordsLearned = wordProgressRows.filter(
    (w) => w.word_id && courseWordIds.has(w.word_id) && w.status === "learned"
  ).length;

  // Course completion % = total vocab (learned + mastered) / total testable words.
  // Matches the "total vocab" semantics used on TestCompletedModal.
  const totalVocab = wordsLearned + courseProgress.wordsMastered;
  const courseCompletionPercent =
    courseProgress.totalWords > 0
      ? Math.round((totalVocab / courseProgress.totalWords) * 100)
      : 0;

  const cumulative: CumulativeProgress = {
    wordsMastered: courseProgress.wordsMastered,
    wordsLearned,
    totalWords: courseProgress.totalWords,
    wordsStudied,
    lessonsCompleted: courseProgress.lessonsCompleted,
    totalLessons: courseProgress.totalLessons,
    courseCompletionPercent,
    totalStudyTimeSeconds: studyTimeSeconds + testTimeSeconds,
    studyTimeSeconds,
    testTimeSeconds,
    lifetimeXp: userData?.lifetime_xp ?? 0,
    bestDayXp: userData?.pb_day_test_points ?? 0,
  };

  // --- Chart per-day maps (also used by the heatmap tooltip) ---
  // Filter word progress to course words only, then group by date.
  const courseWordProgressRows = wordProgressRows.filter(
    (w) => w.word_id && courseWordIds.has(w.word_id)
  );

  const startedByDate = new Map<string, number>();
  const learnedByDate = new Map<string, number>();
  const masteredByDate = new Map<string, number>();
  for (const row of courseWordProgressRows) {
    if (row.learning_at) {
      const d = row.learning_at.slice(0, 10);
      startedByDate.set(d, (startedByDate.get(d) || 0) + 1);
    }
    if (row.learned_at) {
      const d = row.learned_at.slice(0, 10);
      learnedByDate.set(d, (learnedByDate.get(d) || 0) + 1);
    }
    if (row.mastered_at) {
      const d = row.mastered_at.slice(0, 10);
      masteredByDate.set(d, (masteredByDate.get(d) || 0) + 1);
    }
  }

  // --- Heatmap data (last 365 days) ---
  // Intensity = words_learned + words_mastered on that day; tooltip surfaces
  // both counts separately. Both maps are course-scoped via courseWordIds.
  const heatmapData: HeatmapDay[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const learned = learnedByDate.get(dateStr) || 0;
    const mastered = masteredByDate.get(dateStr) || 0;
    heatmapData.push({
      date: dateStr,
      count: learned + mastered,
      wordsLearned: learned,
      wordsMastered: mastered,
    });
  }

  // Group session time by date
  const sessionTimeByDate = new Map<string, number>();
  for (const s of sessions) {
    if (s.started_at) {
      const d = s.started_at.slice(0, 10);
      sessionTimeByDate.set(d, (sessionTimeByDate.get(d) || 0) + (s.duration_seconds || 0));
    }
  }
  for (const t of tests) {
    if (t.taken_at) {
      const d = t.taken_at.slice(0, 10);
      sessionTimeByDate.set(d, (sessionTimeByDate.get(d) || 0) + (t.duration_seconds || 0));
    }
  }

  // Collect all unique dates
  const allDates = new Set<string>();
  for (const d of startedByDate.keys()) allDates.add(d);
  for (const d of learnedByDate.keys()) allDates.add(d);
  for (const d of masteredByDate.keys()) allDates.add(d);
  for (const d of sessionTimeByDate.keys()) allDates.add(d);

  const sortedDates = Array.from(allDates).sort();
  let cumulativeVocab = 0;
  let cumulativeLearned = 0;
  let cumulativeMastered = 0;
  let cumulativeStudyTime = 0;

  const dailyRows: ChartDailyRow[] = sortedDates.map((date) => {
    const newWordsStarted = startedByDate.get(date) || 0;
    const newlyLearned = learnedByDate.get(date) || 0;
    const newlyMastered = masteredByDate.get(date) || 0;
    const dayStudyTime = sessionTimeByDate.get(date) || 0;
    cumulativeVocab += newWordsStarted;
    cumulativeLearned += newlyLearned;
    cumulativeMastered += newlyMastered;
    cumulativeStudyTime += dayStudyTime;
    return {
      date,
      newWordsStarted,
      newlyLearned,
      newlyMastered,
      cumulativeVocab,
      cumulativeLearned,
      cumulativeMastered,
      studyTimeSeconds: dayStudyTime,
      cumulativeStudyTimeSeconds: cumulativeStudyTime,
    };
  });

  const chartData: ChartServerData = {
    dailyRows,
    totalCourseWords: courseWordIds.size,
    firstActivityDate: sortedDates.length > 0 ? sortedDates[0] : null,
  };

  return {
    wordsPerDayRates,
    streaks,
    cumulative,
    heatmapData,
    chartData,
  };
}
