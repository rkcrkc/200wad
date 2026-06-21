import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/utils";
import { Lesson } from "@/types/database";
import { TestType } from "@/types/test";
import { LessonStatus } from "./lessons";
import { resolveLessonIdRef } from "./auto-lessons";
import { computeCourseXp } from "./stats";

// ============================================================================
// Types
// ============================================================================

export interface TestForList {
  // Lesson info
  lessonId: string;
  lessonNumber: number;
  lessonTitle: string;
  lessonEmoji: string | null;
  lessonWordCount: number;
  lessonStatus: LessonStatus;
  wordsLearned: number;
  wordsMastered: number;
  completionPercent: number;
  // Test info
  testId?: string;
  milestone: string;
  testNumber: number; // Which test # for this lesson (1, 2, 3...)
  scorePercent?: number;
  durationSeconds?: number;
  takenAt?: string;
  // Per-test results (previous tests only)
  newlyLearned?: number;
  newlyMastered?: number;
  isRetest?: boolean;
  /** Direction this test session ran in. Persisted on test_sessions.direction. */
  direction?: TestType;
  /**
   * XP earned on this test session (`test_sessions.points_earned`). Only set
   * for previous tests — due tests haven't been taken yet so this is undef.
   */
  pointsEarned?: number;
  /**
   * Maximum XP available on this test. For previous tests this is the actual
   * `test_sessions.max_points` (Test Twice doubles it). For due tests we
   * project from `lessons.word_count × 3` (one perfect single-direction test).
   */
  maxPoints?: number;
  // For due tests
  isDue: boolean;
  dueAt?: string;
}

export interface GetTestsResult {
  dueTests: TestForList[];
  previousTests: TestForList[];
  stats: {
    totalTestTimeSeconds: number;
    testsTaken: number;
    averageScore: number;
    averageScorePerWord: number;
    /** Total XP for THIS course, summed from the course's test_sessions. */
    totalXp: number;
    /** XP earned today for this course (taken_at = today). */
    todayXp: number;
    /** User's daily XP target (`users.daily_xp_goal`, default 30). Account-wide. */
    dailyXpGoal: number;
    /** Best single-day XP for this course. */
    bestDayXp: number;
  };
  isGuest: boolean;
}

// ============================================================================
// Main Query
// ============================================================================

export async function getTests(courseId: string): Promise<GetTestsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      dueTests: [],
      previousTests: [],
      stats: {
        totalTestTimeSeconds: 0,
        testsTaken: 0,
        averageScore: 0,
        averageScorePerWord: 0,
        totalXp: 0,
        todayXp: 0,
        dailyXpGoal: 30,
        bestDayXp: 0,
      },
      isGuest: true,
    };
  }

  // Fetch all lessons for this course
  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .eq("is_published", true)
    .order("sort_order")
    .order("number");

  if (!lessons || lessons.length === 0) {
    return {
      dueTests: [],
      previousTests: [],
      stats: {
        totalTestTimeSeconds: 0,
        testsTaken: 0,
        averageScore: 0,
        averageScorePerWord: 0,
        totalXp: 0,
        todayXp: 0,
        dailyXpGoal: 30,
        bestDayXp: 0,
      },
      isGuest: false,
    };
  }

  const lessonIds = lessons.map((l) => l.id);
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));

  // Get lesson progress, test scores, and lesson_words in parallel; user_word_progress
  // is fetched after so it can be scoped to this course's words. lesson_words and
  // user_word_progress both use .range() pagination because PostgREST's server-side
  // max-rows cap (1,000) silently truncates single-request responses — that caused
  // later lessons in large courses to show 0 learned/mastered.
  // Today (UTC, matches Postgres `current_date` used by update_daily_activity).
  const todayISO = new Date().toISOString().slice(0, 10);

  const [
    { data: lessonProgress },
    { data: testScores },
    lessonWordsRows,
    { data: userXpRow },
  ] = await Promise.all([
    supabase
      .from("user_lesson_progress")
      .select("*")
      .eq("user_id", user.id)
      .in("lesson_id", lessonIds),
    // Course-scoped read: include auto-lesson rows (lesson_id IS NULL,
    // course_id set) alongside real-lesson rows. `getTests` summarises
    // tests per *real* lesson for the Tests page, so the auto-lesson rows
    // surface only in the `testsTaken`/`totalTestTimeSeconds` aggregates
    // below — `lessonMap.get(ts.lesson_id)` returns undefined for them.
    (lessonIds.length > 0
      ? supabase
          .from("test_sessions")
          .select("*")
          .eq("user_id", user.id)
          .or(`lesson_id.in.(${lessonIds.join(",")}),course_id.eq.${courseId}`)
      : supabase
          .from("test_sessions")
          .select("*")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
    ).order("taken_at", { ascending: false }),
    fetchAllRows<{
      lesson_id: string | null;
      word_id: string | null;
      words: { category: string | null } | null;
    }>(
      (from, to) =>
        supabase
          .from("lesson_words")
          .select("lesson_id, word_id, words(category)")
          .in("lesson_id", lessonIds)
          .range(from, to),
      { label: "getTests:lesson_words" }
    ),
    // Daily XP target only (account-wide). Course-specific XP totals are
    // computed below from the course-scoped `testScores` rows. Cheap single-row
    // read piggybacked on the existing Promise.all so it doesn't add an RTT.
    supabase
      .from("users")
      .select("daily_xp_goal")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  // Filter out information pages — they're non-testable
  const testableRows = lessonWordsRows.filter(
    (lw) => (lw.words as unknown as { category: string | null })?.category !== "information"
  );
  const courseWordIds = new Set(
    testableRows.map((lw) => lw.word_id).filter((id): id is string => id !== null)
  );

  // Scope by user_id only. Filtering by word_id pushes 1k+ UUIDs through
  // PostgREST and silently returns empty on long URLs for big courses.
  // Paginate via .range() so the 1,000-row max-rows cap doesn't drop rows
  // for power users. The downstream intersection with courseWordIds keeps
  // counts scoped.
  const userWordProgress = await fetchAllRows<{
    word_id: string | null;
    status: string | null;
  }>(
    (from, to) =>
      supabase
        .from("user_word_progress")
        .select("word_id, status")
        .eq("user_id", user.id)
        .in("status", ["learning", "learned", "mastered"])
        .range(from, to),
    { label: "getTests:user_word_progress" }
  );

  const progressByLesson = new Map(
    (lessonProgress || [])
      .filter((p) => p.lesson_id !== null)
      .map((p) => [p.lesson_id!, p])
  );

  // Build live per-lesson learned/mastered counts from user_word_progress
  const liveLearnedByLesson: Record<string, number> = {};
  const liveMasteredByLesson: Record<string, number> = {};
  const testableCountByLesson: Record<string, number> = {};

  if (lessonWordsRows.length > 0 && userWordProgress.length > 0) {
    const wordStatusMap = new Map<string, string>();
    userWordProgress.forEach((p) => {
      if (p.word_id && p.status) wordStatusMap.set(p.word_id, p.status);
    });

    for (const lw of testableRows) {
      if (!lw.lesson_id || !lw.word_id) continue;
      testableCountByLesson[lw.lesson_id] = (testableCountByLesson[lw.lesson_id] || 0) + 1;
      const status = wordStatusMap.get(lw.word_id);
      if (status === "mastered") {
        liveMasteredByLesson[lw.lesson_id] = (liveMasteredByLesson[lw.lesson_id] || 0) + 1;
      }
      if (status === "learned" || status === "mastered") {
        liveLearnedByLesson[lw.lesson_id] = (liveLearnedByLesson[lw.lesson_id] || 0) + 1;
      }
    }
  }

  // Helper to derive live lesson stats
  function getLiveLessonStats(lessonId: string, lesson: Lesson) {
    const liveLearned = liveLearnedByLesson[lessonId] || 0;
    const liveMastered = liveMasteredByLesson[lessonId] || 0;
    const totalWords = testableCountByLesson[lessonId] || lesson.word_count || 0;
    const liveCompletion = totalWords > 0 ? Math.round((liveMastered / totalWords) * 100) : 0;
    const progress = progressByLesson.get(lessonId);

    const allMastered = liveCompletion >= 100 && totalWords > 0;
    const allLearnedOrMastered = liveLearned >= totalWords && totalWords > 0;
    const derivedStatus: LessonStatus =
      allMastered
        ? "mastered"
        : allLearnedOrMastered
          ? "learned"
          : liveMastered > 0 || liveLearned > 0 || progress?.status === "learning" || progress?.status === "learned" || progress?.status === "mastered"
            ? "learning"
            : "not-started";

    return { liveLearned, liveMastered, liveCompletion, derivedStatus };
  }

  // Calculate stats
  let totalTestTimeSeconds = 0;
  let scoreSum = 0;
  let totalPointsEarned = 0;
  let totalMaxPoints = 0;
  const testsTaken = testScores?.length || 0;

  testScores?.forEach((ts) => {
    totalTestTimeSeconds += ts.duration_seconds || 0;
    scoreSum += ts.score_percent || 0;
    totalPointsEarned += ts.points_earned || 0;
    totalMaxPoints += ts.max_points || 0;
  });

  const averageScore = testsTaken > 0 ? Math.round(scoreSum / testsTaken) : 0;
  const averageScorePerWord = totalMaxPoints > 0 ? Math.round((totalPointsEarned / totalMaxPoints) * 100) : 0;

  // Course-specific XP for the Tests-page header, summed from this course's
  // test_sessions (`testScores`). `daily_xp_goal` stays account-wide (default
  // 30 when uncustomised); todayXp is measured against it for this course.
  const { totalXp, todayXp, bestDayXp } = computeCourseXp(testScores ?? [], todayISO);
  const dailyXpGoal = userXpRow?.daily_xp_goal ?? 30;

  // Build due tests list
  const now = new Date().toISOString();
  const dueTests: TestForList[] = [];

  // Count tests per lesson for test numbering
  const testCountByLesson: Record<string, number> = {};
  testScores?.forEach((ts) => {
    if (ts.lesson_id) {
      testCountByLesson[ts.lesson_id] = (testCountByLesson[ts.lesson_id] || 0) + 1;
    }
  });

  lessonProgress?.forEach((progress) => {
    if (
      progress.lesson_id &&
      progress.next_milestone &&
      progress.next_test_due_at &&
      progress.next_test_due_at <= now
    ) {
      const lesson = lessonMap.get(progress.lesson_id);
      if (lesson) {
        const testCount = testCountByLesson[lesson.id] || 0;
        const live = getLiveLessonStats(lesson.id, lesson);
        dueTests.push({
          lessonId: lesson.id,
          lessonNumber: lesson.number,
          lessonTitle: lesson.title,
          lessonEmoji: lesson.emoji,
          lessonWordCount: lesson.word_count || 0,
          lessonStatus: live.derivedStatus,
          wordsLearned: live.liveLearned,
          wordsMastered: live.liveMastered,
          completionPercent: live.liveCompletion,
          milestone: progress.next_milestone,
          testNumber: testCount + 1,
          // Projected XP available on this due test: 3 points per word for one
          // perfect single-direction run. Test Twice would double this; we
          // surface the conservative single-direction figure so the row reads
          // as "minimum XP on the table" rather than overstating the prize.
          maxPoints: (lesson.word_count || 0) * 3,
          isDue: true,
          dueAt: progress.next_test_due_at,
        });
      }
    }
  });

  // Sort due tests by due date (oldest first)
  dueTests.sort((a, b) => (a.dueAt || "").localeCompare(b.dueAt || ""));

  // Build previous tests list
  const previousTests: TestForList[] = [];

  // Track test number per lesson (most recent = highest number)
  const lessonTestNumbers: Record<string, number> = {};

  testScores?.forEach((ts) => {
    if (!ts.lesson_id) return;
    const lesson = lessonMap.get(ts.lesson_id);
    if (!lesson) return;

    // Calculate test number (count down from total)
    const totalTests = testCountByLesson[ts.lesson_id] || 0;
    lessonTestNumbers[ts.lesson_id] = (lessonTestNumbers[ts.lesson_id] || totalTests);
    const testNumber = lessonTestNumbers[ts.lesson_id];
    lessonTestNumbers[ts.lesson_id]--;

    const live = getLiveLessonStats(lesson.id, lesson);
    previousTests.push({
      lessonId: lesson.id,
      lessonNumber: lesson.number,
      lessonTitle: lesson.title,
      lessonEmoji: lesson.emoji,
      lessonWordCount: lesson.word_count || 0,
      lessonStatus: live.derivedStatus,
      wordsLearned: live.liveLearned,
      wordsMastered: live.liveMastered,
      completionPercent: live.liveCompletion,
      testId: ts.id,
      milestone: ts.milestone || "Initial",
      testNumber,
      scorePercent: ts.score_percent || 0,
      durationSeconds: ts.duration_seconds || 0,
      takenAt: ts.taken_at || undefined,
      newlyLearned: ts.learned_words_count || 0,
      newlyMastered: ts.mastered_words_count || 0,
      isRetest: ts.is_retest || false,
      direction: (ts.direction || "english-to-foreign") as TestType,
      pointsEarned: ts.points_earned ?? 0,
      maxPoints: ts.max_points ?? 0,
      isDue: false,
    });
  });

  return {
    dueTests,
    previousTests,
    stats: {
      totalTestTimeSeconds,
      testsTaken,
      averageScore,
      averageScorePerWord,
      totalXp,
      todayXp,
      dailyXpGoal,
      bestDayXp,
    },
    isGuest: false,
  };
}

// ============================================================================
// Lesson Milestone Scores Query
// ============================================================================

export interface LessonMilestoneScores {
  lessonId: string;
  initial: number | null;
  day: number | null;
  week: number | null;
  month: number | null;
  qtr: number | null;
  year: number | null;
  other: number | null;
  overall: number | null;
}

/**
 * Get milestone test scores for all lessons in a course
 * Returns a map of lesson ID -> milestone scores
 */
export async function getLessonMilestoneScores(
  courseId: string
): Promise<Map<string, LessonMilestoneScores>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = new Map<string, LessonMilestoneScores>();

  if (!user) {
    return result;
  }

  // Get all lesson IDs for this course
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)
    .eq("is_published", true);

  if (!lessons || lessons.length === 0) {
    return result;
  }

  const lessonIds = lessons.map((l) => l.id);

  // Get all test scores for these lessons
  const { data: testScores } = await supabase
    .from("test_sessions")
    .select("lesson_id, milestone, score_percent")
    .eq("user_id", user.id)
    .in("lesson_id", lessonIds);

  if (!testScores) {
    return result;
  }

  // Group scores by lesson and milestone (taking best score per milestone)
  const scoresByLesson = new Map<string, Map<string, number>>();

  testScores.forEach((ts) => {
    if (!ts.lesson_id || !ts.milestone) return;

    if (!scoresByLesson.has(ts.lesson_id)) {
      scoresByLesson.set(ts.lesson_id, new Map());
    }

    const lessonScores = scoresByLesson.get(ts.lesson_id)!;
    const existingScore = lessonScores.get(ts.milestone);
    const newScore = ts.score_percent || 0;

    // Keep the best score for each milestone
    if (existingScore === undefined || newScore > existingScore) {
      lessonScores.set(ts.milestone, newScore);
    }
  });

  // Build the result map with all lessons (including ones without scores)
  lessonIds.forEach((lessonId) => {
    const scores = scoresByLesson.get(lessonId);

    const initial = scores?.get("initial") ?? null;
    const day = scores?.get("day") ?? null;
    const week = scores?.get("week") ?? null;
    const month = scores?.get("month") ?? null;
    const qtr = scores?.get("qtr") ?? null;
    const year = scores?.get("year") ?? null;
    const other = scores?.get("other") ?? null;

    // Calculate overall average (only from non-null scores, including other)
    const allScores = [initial, day, week, month, qtr, year, other].filter(
      (s): s is number => s !== null
    );
    const overall = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : null;

    result.set(lessonId, {
      lessonId,
      initial,
      day,
      week,
      month,
      qtr,
      year,
      other,
      overall,
    });
  });

  return result;
}

// ============================================================================
// Lesson Activity History Query
// ============================================================================

export type ActivityType = "study" | "test";

export interface LessonActivity {
  id: string;
  type: ActivityType;
  date: string;
  durationSeconds: number;
  // Study-specific
  wordsStudied?: number;
  // Test-specific
  milestone?: string;
  scorePercent?: number;
  pointsEarned?: number;
  maxPoints?: number;
  wordsMastered?: number;
  totalQuestions?: number;
  isRetest?: boolean;
}

export interface LessonActivityHistoryResult {
  activities: LessonActivity[];
  counts: {
    all: number;
    study: number;
    test: number;
  };
}

/**
 * Get activity history (study sessions + tests) for a specific lesson
 */
export async function getLessonActivityHistory(
  lessonId: string
): Promise<LessonActivityHistoryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      activities: [],
      counts: { all: 0, study: 0, test: 0 },
    };
  }

  // After migration 20260516000002, `lesson_id` is a UUID FK and auto-lesson
  // rows live under `(auto_lesson_type, course_id)`. Discriminate the filter
  // up-front so a single auto-lesson page also returns its activity.
  const lessonRef = resolveLessonIdRef(lessonId);
  if (lessonRef.kind === "none") {
    return {
      activities: [],
      counts: { all: 0, study: 0, test: 0 },
    };
  }

  const studyBase = supabase
    .from("study_sessions")
    .select("id, started_at, duration_seconds, words_studied, words_mastered")
    .eq("user_id", user.id)
    .eq("session_type", "study");
  const testBase = supabase
    .from("test_sessions")
    .select("id, taken_at, duration_seconds, milestone, score_percent, points_earned, max_points, mastered_words_count, total_questions, is_retest")
    .eq("user_id", user.id);

  const studyFiltered =
    lessonRef.kind === "real"
      ? studyBase.eq("lesson_id", lessonRef.lessonId)
      : studyBase
          .eq("auto_lesson_type", lessonRef.autoLessonType)
          .eq("course_id", lessonRef.courseId);
  const testFiltered =
    lessonRef.kind === "real"
      ? testBase.eq("lesson_id", lessonRef.lessonId)
      : testBase
          .eq("auto_lesson_type", lessonRef.autoLessonType)
          .eq("course_id", lessonRef.courseId);

  // Fetch study sessions and test scores in parallel
  const [studyResult, testResult] = await Promise.all([
    studyFiltered.order("started_at", { ascending: false }),
    testFiltered.order("taken_at", { ascending: false }),
  ]);

  const activities: LessonActivity[] = [];

  // Add study sessions (filter out orphaned sessions and deduplicate)
  const seenTimestamps = new Set<string>();
  (studyResult.data || []).forEach((session) => {
    const timestamp = session.started_at || "";

    // Skip orphaned sessions (NULL duration means session was never completed)
    if (session.duration_seconds === null || session.duration_seconds === undefined) {
      console.warn(`Orphaned study session skipped for lesson ${lessonId}:`, session.id);
      return;
    }

    // Skip duplicates (same timestamp) - keep only the first one
    if (timestamp && seenTimestamps.has(timestamp)) {
      console.warn(`Duplicate study session detected for lesson ${lessonId} at ${timestamp}`);
      return;
    }
    if (timestamp) seenTimestamps.add(timestamp);

    activities.push({
      id: session.id,
      type: "study",
      date: timestamp,
      durationSeconds: session.duration_seconds,
      wordsStudied: session.words_studied || 0,
    });
  });

  // Add test scores (filter out any with NULL duration)
  (testResult.data || []).forEach((test) => {
    // Skip tests with NULL duration (shouldn't happen but safety check)
    if (test.duration_seconds === null || test.duration_seconds === undefined) {
      console.warn(`Test with NULL duration skipped for lesson ${lessonId}:`, test.id);
      return;
    }

    activities.push({
      id: test.id,
      type: "test",
      date: test.taken_at || "",
      durationSeconds: test.duration_seconds,
      milestone: test.milestone || undefined,
      scorePercent: test.score_percent || 0,
      pointsEarned: test.points_earned || 0,
      maxPoints: test.max_points || 0,
      wordsMastered: test.mastered_words_count || 0,
      totalQuestions: test.total_questions || undefined,
      isRetest: test.is_retest || false,
    });
  });

  // Sort by date (newest first)
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const studyCount = activities.filter((a) => a.type === "study").length;
  const testCount = activities.filter((a) => a.type === "test").length;

  return {
    activities,
    counts: {
      all: activities.length,
      study: studyCount,
      test: testCount,
    },
  };
}
