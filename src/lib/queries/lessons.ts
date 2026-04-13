import { createClient } from "@/lib/supabase/server";
import { Course, Language, Lesson, UserLessonProgress } from "@/types/database";
import { getLessonAccessMap } from "@/lib/utils/accessControl";

export type LessonStatus = "not-started" | "learning" | "mastered";

export interface LessonWithProgress extends Lesson {
  status: LessonStatus;
  completionPercent: number;
  wordsMastered: number;
  totalStudyTimeSeconds: number;
  lastStudiedAt: string | null;
  /** Whether this is a virtual auto-lesson */
  isAutoLesson?: boolean;
  /** Whether this lesson is locked (requires subscription) */
  isLocked?: boolean;
}

// Auto-lesson types
export type AutoLessonType = "notes" | "best" | "worst";

// Auto-lesson ID helpers
export function createAutoLessonId(type: AutoLessonType, courseId: string): string {
  return `auto-${type}-${courseId}`;
}

export function parseAutoLessonId(lessonId: string): { type: AutoLessonType; courseId: string } | null {
  const match = lessonId.match(/^auto-(notes|best|worst)-(.+)$/);
  if (!match) return null;
  return { type: match[1] as AutoLessonType, courseId: match[2] };
}

export function isAutoLesson(lessonId: string): boolean {
  return lessonId.startsWith("auto-");
}

export interface GetLessonsResult {
  language: Language | null;
  course: Course | null;
  lessons: LessonWithProgress[];
  stats: {
    totalWords: number;
    totalTimeSeconds: number;
    studyTimeSeconds: number;
    testTimeSeconds: number;
    wordsStudied: number;
    wordsMastered: number;
  };
  isGuest: boolean;
}

// Auto-lesson definitions
const AUTO_LESSON_DEFINITIONS: {
  type: AutoLessonType;
  number: number;
  title: string;
  emoji: string;
}[] = [
  { type: "notes", number: 800, title: "My Notes", emoji: "📝" },
  { type: "best", number: 801, title: "Best Words", emoji: "🏆" },
  { type: "worst", number: 802, title: "Worst Words", emoji: "🎯" },
];

/**
 * Generate virtual auto-lessons for a course based on user data
 */
async function generateAutoLessons(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  userId: string,
  lessonIds: string[]
): Promise<LessonWithProgress[]> {
  // Get all word IDs for this course
  const { data: lessonWords } = await supabase
    .from("lesson_words")
    .select("word_id")
    .in("lesson_id", lessonIds);

  const courseWordIds = lessonWords?.map((lw) => lw.word_id).filter((id): id is string => id !== null) || [];

  if (courseWordIds.length === 0) {
    return [];
  }

  // Get user's test score IDs for lessons in THIS course (scoping by lesson_id
  // keeps the URL short — filtering by courseWordIds later would push ~1k UUIDs
  // through PostgREST and silently return empty on long URLs).
  const { data: userTestScores } = await supabase
    .from("user_test_scores")
    .select("id")
    .eq("user_id", userId)
    .in("lesson_id", lessonIds);

  const testScoreIds = userTestScores?.map((ts) => ts.id) || [];

  // Get word counts for each auto-lesson type in parallel
  const [notesCount, bestWorstData] = await Promise.all([
    // Count words with user notes
    supabase
      .from("user_word_progress")
      .select("word_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("word_id", courseWordIds)
      .not("user_notes", "is", null),

    // Get test data for best/worst calculation (via test_score_id).
    // No word_id filter needed — test_score_ids are already scoped to this course.
    testScoreIds.length > 0
      ? supabase
          .from("test_questions")
          .select("word_id, points_earned, max_points")
          .in("test_score_id", testScoreIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Calculate best/worst word counts
  const wordScores: Record<string, { totalEarned: number; totalMax: number }> = {};
  bestWorstData.data?.forEach((tq) => {
    if (!tq.word_id) return;
    if (!wordScores[tq.word_id]) {
      wordScores[tq.word_id] = { totalEarned: 0, totalMax: 0 };
    }
    wordScores[tq.word_id].totalEarned += tq.points_earned ?? 0;
    wordScores[tq.word_id].totalMax += tq.max_points ?? 3;
  });

  const testedWordCount = Object.keys(wordScores).length;
  const bestCount = Math.min(20, testedWordCount);
  const worstCount = Math.min(20, testedWordCount);

  const wordCounts: Record<AutoLessonType, number> = {
    notes: notesCount.count || 0,
    best: bestCount,
    worst: worstCount,
  };

  // Generate auto-lesson objects
  const now = new Date().toISOString();
  return AUTO_LESSON_DEFINITIONS.map((def) => ({
    id: createAutoLessonId(def.type, courseId),
    course_id: courseId,
    number: def.number,
    title: def.title,
    emoji: def.emoji,
    word_count: wordCounts[def.type],
    is_published: true,
    sort_order: def.number,
    legacy_lesson_id: null,
    created_at: now,
    updated_at: now,
    created_by: null,
    updated_by: null,
    // Progress fields - auto-lessons don't track progress traditionally
    status: "not-started" as LessonStatus,
    completionPercent: 0,
    wordsMastered: 0,
    totalStudyTimeSeconds: 0,
    lastStudiedAt: null,
    isAutoLesson: true,
  }));
}

export async function getLessons(courseId: string): Promise<GetLessonsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch course with language
  const { data: course } = await supabase
    .from("courses")
    .select("*, languages(*)")
    .eq("id", courseId)
    .single();

  const language = course?.languages as Language | null;

  // Fetch published lessons for this course
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .eq("is_published", true)
    .order("sort_order")
    .order("number");

  if (lessonsError) {
    console.error("Error fetching lessons:", lessonsError);
    // Extract course without nested languages relation
    const courseWithoutRelations = course ? {
      id: course.id,
      name: course.name,
      description: course.description,
      language_id: course.language_id,
      level: course.level,
      cefr_range: course.cefr_range,
      total_lessons: course.total_lessons,
      word_count: course.word_count,
      price_override_cents: course.price_override_cents,
      free_lessons: course.free_lessons,
      is_published: course.is_published,
      sort_order: course.sort_order,
      created_at: course.created_at,
      updated_at: course.updated_at,
      created_by: course.created_by,
      updated_by: course.updated_by,
    } as Course : null;
    return {
      language,
      course: courseWithoutRelations,
      lessons: [],
      stats: { totalWords: 0, totalTimeSeconds: 0, studyTimeSeconds: 0, testTimeSeconds: 0, wordsStudied: 0, wordsMastered: 0 },
      isGuest: !user,
    };
  }

  // Get user's lesson progress if authenticated
  let progressByLesson: Record<string, UserLessonProgress> = {};
  let totalStudyTimeSeconds = 0;
  let totalTestTimeSeconds = 0;
  let wordsMastered = 0;
  let wordsStudied = 0;
  const liveMasteredByLesson: Record<string, number> = {};

  if (user && lessons && lessons.length > 0) {
    const lessonIds = lessons.map((l) => l.id);

    // Fetch lesson progress, study sessions, and test scores in parallel
    const [lessonProgressResult, studySessionsResult, testScoresResult] = await Promise.all([
      supabase
        .from("user_lesson_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds),
      supabase
        .from("study_sessions")
        .select("duration_seconds")
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds),
      supabase
        .from("user_test_scores")
        .select("duration_seconds")
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds),
    ]);

    const lessonProgress = lessonProgressResult.data;
    lessonProgress?.forEach((lp) => {
      if (lp.lesson_id) {
        progressByLesson[lp.lesson_id] = lp;
      }
    });

    // Sum up study time from study_sessions
    studySessionsResult.data?.forEach((ss) => {
      totalStudyTimeSeconds += ss.duration_seconds || 0;
    });

    // Sum up test time
    testScoresResult.data?.forEach((ts) => {
      totalTestTimeSeconds += ts.duration_seconds || 0;
    });

    // Get all user's word progress and lesson_words, then compute intersection
    const [userProgressResult, lessonWordsResult] = await Promise.all([
      supabase
        .from("user_word_progress")
        .select("word_id, status")
        .eq("user_id", user.id)
        .in("status", ["learning", "mastered"]),
      supabase
        .from("lesson_words")
        .select("lesson_id, word_id")
        .in("lesson_id", lessonIds),
    ]);

    if (lessonWordsResult.data && userProgressResult.data) {
      // Create a set of course word IDs for fast lookup
      const courseWordIds = new Set(
        lessonWordsResult.data.map((lw) => lw.word_id).filter((id): id is string => id !== null)
      );

      // Build per-word status lookup
      const wordStatusMap = new Map<string, string>();
      userProgressResult.data.forEach((p) => {
        if (p.word_id && p.status) wordStatusMap.set(p.word_id, p.status);
      });

      // Count user progress that matches course words
      wordsStudied = userProgressResult.data.filter((p) => p.word_id && courseWordIds.has(p.word_id)).length;

      // Also count mastered words from user_word_progress (more accurate than lesson progress)
      wordsMastered = userProgressResult.data.filter(
        (p) => p.word_id && courseWordIds.has(p.word_id) && p.status === "mastered"
      ).length;

      // Build per-lesson mastered counts from live data
      for (const lw of lessonWordsResult.data) {
        if (!lw.lesson_id || !lw.word_id) continue;
        const status = wordStatusMap.get(lw.word_id);
        if (status === "mastered") {
          liveMasteredByLesson[lw.lesson_id] = (liveMasteredByLesson[lw.lesson_id] || 0) + 1;
        }
      }
    }
  }

  // Calculate total words
  const totalWords = lessons?.reduce((sum, l) => sum + (l.word_count || 0), 0) || 0;

  // Combine data
  const lessonsWithProgress: LessonWithProgress[] = (lessons || []).map(
    (lesson) => {
      const progress = progressByLesson[lesson.id];

      // Use live mastered count from user_word_progress (more accurate than stale lesson progress)
      const liveMastered = liveMasteredByLesson[lesson.id] || 0;
      const totalWords = lesson.word_count || 0;
      const liveCompletion = totalWords > 0 ? Math.round((liveMastered / totalWords) * 100) : 0;

      // Derive status from live word progress instead of potentially stale DB value
      const derivedStatus: LessonStatus =
        liveCompletion >= 100 && totalWords > 0
          ? "mastered"
          : progress?.status === "learning" || progress?.status === "mastered"
            ? "learning"
            : "not-started";

      return {
        ...lesson,
        status: derivedStatus,
        completionPercent: liveCompletion,
        wordsMastered: liveMastered,
        totalStudyTimeSeconds: progress?.total_study_time_seconds || 0,
        lastStudiedAt: progress?.last_studied_at || null,
      };
    }
  );

  // Compute access map for lesson locking
  if (course && lessons && lessons.length > 0) {
    const courseAccessInfo = {
      id: course.id,
      language_id: course.language_id,
      free_lessons: course.free_lessons,
    };
    const lessonNumbers = lessons.map((l) => l.number);
    const accessMap = await getLessonAccessMap(
      user?.id ?? null,
      courseAccessInfo,
      lessonNumbers
    );
    for (const lp of lessonsWithProgress) {
      if (!lp.isAutoLesson) {
        const access = accessMap.get(lp.number);
        lp.isLocked = access ? !access.hasAccess : false;
      }
    }
  }

  // Generate auto-lessons for authenticated users
  if (user && lessons && lessons.length > 0) {
    const lessonIds = lessons.map((l) => l.id);
    const autoLessons = await generateAutoLessons(supabase, courseId, user.id, lessonIds);
    lessonsWithProgress.push(...autoLessons);
  }

  // Extract course without nested languages relation
  const courseWithoutRelations = course ? {
    id: course.id,
    name: course.name,
    description: course.description,
    language_id: course.language_id,
    level: course.level,
    cefr_range: course.cefr_range,
    total_lessons: course.total_lessons,
    word_count: course.word_count,
    price_override_cents: course.price_override_cents,
    free_lessons: course.free_lessons,
    is_published: course.is_published,
    sort_order: course.sort_order,
    created_at: course.created_at,
    updated_at: course.updated_at,
    created_by: course.created_by,
    updated_by: course.updated_by,
  } as Course : null;

  // Combine study + test time
  const totalTimeSeconds = totalStudyTimeSeconds + totalTestTimeSeconds;

  return {
    language,
    course: courseWithoutRelations,
    lessons: lessonsWithProgress,
    stats: {
      totalWords,
      totalTimeSeconds,
      studyTimeSeconds: totalStudyTimeSeconds,
      testTimeSeconds: totalTestTimeSeconds,
      wordsStudied,
      wordsMastered,
    },
    isGuest: !user,
  };
}
