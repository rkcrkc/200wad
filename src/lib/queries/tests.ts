import { createClient } from "@/lib/supabase/server";
import { Lesson, UserTestScore } from "@/types/database";
import { LessonStatus } from "./lessons";

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
  wordsMastered: number;
  completionPercent: number;
  // Test info
  testId?: string;
  milestone: string;
  testNumber: number; // Which test # for this lesson (1, 2, 3...)
  scorePercent?: number;
  durationSeconds?: number;
  takenAt?: string;
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
      stats: { totalTestTimeSeconds: 0, testsTaken: 0, averageScore: 0 },
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
      stats: { totalTestTimeSeconds: 0, testsTaken: 0, averageScore: 0 },
      isGuest: false,
    };
  }

  const lessonIds = lessons.map((l) => l.id);
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));

  // Get user's lesson progress (for status, mastered count, and due tests)
  const { data: lessonProgress } = await supabase
    .from("user_lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("lesson_id", lessonIds);

  const progressByLesson = new Map(
    (lessonProgress || [])
      .filter((p) => p.lesson_id !== null)
      .map((p) => [p.lesson_id!, p])
  );

  // Get all test scores for this course's lessons
  const { data: testScores } = await supabase
    .from("user_test_scores")
    .select("*")
    .eq("user_id", user.id)
    .in("lesson_id", lessonIds)
    .order("taken_at", { ascending: false });

  // Calculate stats
  let totalTestTimeSeconds = 0;
  let totalScore = 0;
  const testsTaken = testScores?.length || 0;

  testScores?.forEach((ts) => {
    totalTestTimeSeconds += ts.duration_seconds || 0;
    totalScore += ts.score_percent || 0;
  });

  const averageScore = testsTaken > 0 ? Math.round(totalScore / testsTaken) : 0;

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
        dueTests.push({
          lessonId: lesson.id,
          lessonNumber: lesson.number,
          lessonTitle: lesson.title,
          lessonEmoji: lesson.emoji,
          lessonWordCount: lesson.word_count || 0,
          lessonStatus: (progress.status as LessonStatus) || "not-started",
          wordsMastered: progress.words_mastered || 0,
          completionPercent: progress.completion_percent || 0,
          milestone: progress.next_milestone,
          testNumber: testCount + 1,
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

    const progress = progressByLesson.get(ts.lesson_id);

    // Calculate test number (count down from total)
    const totalTests = testCountByLesson[ts.lesson_id] || 0;
    lessonTestNumbers[ts.lesson_id] = (lessonTestNumbers[ts.lesson_id] || totalTests);
    const testNumber = lessonTestNumbers[ts.lesson_id];
    lessonTestNumbers[ts.lesson_id]--;

    previousTests.push({
      lessonId: lesson.id,
      lessonNumber: lesson.number,
      lessonTitle: lesson.title,
      lessonEmoji: lesson.emoji,
      lessonWordCount: lesson.word_count || 0,
      lessonStatus: (progress?.status as LessonStatus) || "not-started",
      wordsMastered: progress?.words_mastered || 0,
      completionPercent: progress?.completion_percent || 0,
      testId: ts.id,
      milestone: ts.milestone || "Initial",
      testNumber,
      scorePercent: ts.score_percent || 0,
      durationSeconds: ts.duration_seconds || 0,
      takenAt: ts.taken_at || undefined,
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
    .from("user_test_scores")
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
  wordsMastered?: number;
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

  // Fetch study sessions and test scores in parallel
  const [studyResult, testResult] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("id, started_at, duration_seconds, words_studied, words_mastered")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .order("started_at", { ascending: false }),
    supabase
      .from("user_test_scores")
      .select("id, taken_at, duration_seconds, milestone, score_percent, mastered_words_count")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .order("taken_at", { ascending: false }),
  ]);

  const activities: LessonActivity[] = [];

  // Add study sessions
  (studyResult.data || []).forEach((session) => {
    activities.push({
      id: session.id,
      type: "study",
      date: session.started_at || "",
      durationSeconds: session.duration_seconds || 0,
      wordsStudied: session.words_studied || 0,
    });
  });

  // Add test scores
  (testResult.data || []).forEach((test) => {
    activities.push({
      id: test.id,
      type: "test",
      date: test.taken_at || "",
      durationSeconds: test.duration_seconds || 0,
      milestone: test.milestone || undefined,
      scorePercent: test.score_percent || 0,
      wordsMastered: test.mastered_words_count || 0,
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
