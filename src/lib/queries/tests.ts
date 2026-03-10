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
