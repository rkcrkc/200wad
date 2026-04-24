import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/utils";
import { Course, Language, Lesson, UserLessonProgress } from "@/types/database";
import { getLessonAccessMap } from "@/lib/utils/accessControl";

export type LessonStatus = "not-started" | "learning" | "learned" | "mastered";

export interface LessonWithProgress extends Lesson {
  status: LessonStatus;
  completionPercent: number;
  wordsLearned: number;
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
    wordsLearned: number;
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
  // Get all word IDs for this course. PostgREST silently caps at 1,000 rows,
  // so paginate via .range() to read everything for large courses.
  const lessonWords = await fetchAllRows<{ word_id: string | null }>(
    (from, to) =>
      supabase
        .from("lesson_words")
        .select("word_id")
        .in("lesson_id", lessonIds)
        .range(from, to),
    { label: "generateAutoLessons:lesson_words" }
  );

  const courseWordIds = lessonWords.map((lw) => lw.word_id).filter((id): id is string => id !== null);

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

  // Get word IDs and test data for each auto-lesson type in parallel
  const [notesResult, bestWorstData] = await Promise.all([
    // Fetch word IDs with user notes. No word_id filter — pushing ~1k UUIDs
    // through PostgREST silently returns empty on long URLs. The
    // `user_notes is not null` predicate already bounds this to a small set.
    supabase
      .from("user_word_progress")
      .select("word_id")
      .eq("user_id", userId)
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

  // Intersect notes client-side with this course's words.
  const courseWordIdSet = new Set(courseWordIds);
  const notesWordIds = notesResult.data
    ?.map((w) => w.word_id)
    .filter((id): id is string => id !== null && courseWordIdSet.has(id)) || [];

  // Calculate best/worst word scores and extract sorted word IDs
  const wordScores: Record<string, { totalEarned: number; totalMax: number }> = {};
  bestWorstData.data?.forEach((tq) => {
    if (!tq.word_id) return;
    if (!wordScores[tq.word_id]) {
      wordScores[tq.word_id] = { totalEarned: 0, totalMax: 0 };
    }
    wordScores[tq.word_id].totalEarned += tq.points_earned ?? 0;
    wordScores[tq.word_id].totalMax += tq.max_points ?? 3;
  });

  const sortedByScore = Object.entries(wordScores)
    .map(([wordId, scores]) => ({
      wordId,
      avgPercent: scores.totalMax > 0 ? (scores.totalEarned / scores.totalMax) * 100 : 0,
    }))
    .sort((a, b) => a.avgPercent - b.avgPercent);

  const worstWordIds = sortedByScore.map((w) => w.wordId);
  const bestWordIds = [...sortedByScore].reverse().slice(0, 20).map((w) => w.wordId);

  const wordIdsByType: Record<AutoLessonType, string[]> = {
    notes: notesWordIds,
    best: bestWordIds,
    worst: worstWordIds,
  };

  // Query word progress for all auto-lesson words (learning, learned, mastered)
  const allAutoWordIds = [...new Set([...notesWordIds, ...bestWordIds, ...worstWordIds])];
  const masteredWordIds = new Set<string>();
  const learnedWordIds = new Set<string>();
  const learningWordIds = new Set<string>();

  if (allAutoWordIds.length > 0) {
    // Scope by user_id only. `allAutoWordIds` can include every "worst"
    // word in the course (1500+ UUIDs), and passing that many through
    // `.in("word_id", …)` creates a ~55KB URL that PostgREST silently
    // returns empty for. Paginate via .range() and intersect client-side.
    const allAutoWordIdSet = new Set(allAutoWordIds);
    const wordProgress = await fetchAllRows<{ word_id: string | null; status: string | null }>(
      (from, to) =>
        supabase
          .from("user_word_progress")
          .select("word_id, status")
          .eq("user_id", userId)
          .in("status", ["learning", "learned", "mastered"])
          .range(from, to),
      { label: "generateAutoLessons:user_word_progress" }
    );

    wordProgress.forEach((wp) => {
      if (!wp.word_id || !allAutoWordIdSet.has(wp.word_id)) return;
      if (wp.status === "mastered") masteredWordIds.add(wp.word_id);
      if (wp.status === "learned") learnedWordIds.add(wp.word_id);
      if (wp.status === "learning") learningWordIds.add(wp.word_id);
    });
  }

  // Exclude mastered words from worst words and cap at 20
  wordIdsByType.worst = worstWordIds
    .filter((id) => !masteredWordIds.has(id))
    .slice(0, 20);

  // Generate auto-lesson objects with live mastery data
  const now = new Date().toISOString();
  return AUTO_LESSON_DEFINITIONS.map((def) => {
    const ids = wordIdsByType[def.type];
    const totalWords = ids.length;
    const mastered = ids.filter((id) => masteredWordIds.has(id)).length;
    const learned = ids.filter((id) => learnedWordIds.has(id) || masteredWordIds.has(id)).length;
    const studying = ids.filter((id) => learningWordIds.has(id)).length;
    const completion = totalWords > 0 ? Math.round((mastered / totalWords) * 100) : 0;
    const status: LessonStatus =
      completion >= 100 && totalWords > 0 ? "mastered"
      : learned >= totalWords && totalWords > 0 ? "learned"
      : mastered > 0 || learned > 0 || studying > 0 ? "learning"
      : "not-started";

    return {
      id: createAutoLessonId(def.type, courseId),
      course_id: courseId,
      number: def.number,
      title: def.title,
      emoji: def.emoji,
      word_count: totalWords,
      is_published: true,
      sort_order: def.number,
      legacy_lesson_id: null,
      created_at: now,
      updated_at: now,
      created_by: null,
      updated_by: null,
      status,
      completionPercent: completion,
      wordsLearned: learned,
      wordsMastered: mastered,
      totalStudyTimeSeconds: 0,
      lastStudiedAt: null,
      isAutoLesson: true,
    };
  });
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
      stats: { totalWords: 0, totalTimeSeconds: 0, studyTimeSeconds: 0, testTimeSeconds: 0, wordsStudied: 0, wordsLearned: 0, wordsMastered: 0 },
      isGuest: !user,
    };
  }

  // Get user's lesson progress if authenticated
  let progressByLesson: Record<string, UserLessonProgress> = {};
  let totalStudyTimeSeconds = 0;
  let totalTestTimeSeconds = 0;
  let wordsMastered = 0;
  let wordsLearned = 0;
  let wordsStudied = 0;
  const liveMasteredByLesson: Record<string, number> = {};
  const liveLearnedByLesson: Record<string, number> = {};
  const testableCountByLesson: Record<string, number> = {};

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

    // Fetch lesson_words via paginated .range() — a single .limit() request
    // is silently capped by PostgREST at 1,000 rows, so a large course's later
    // lessons would otherwise drop out of testableRows entirely.
    const lessonWordsRows = await fetchAllRows<{
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
      { label: "getLessons:lesson_words" }
    );

    // Filter out information pages — they're non-testable
    const testableRows = lessonWordsRows.filter(
      (lw) => (lw.words as unknown as { category: string | null })?.category !== "information"
    );

    // Create a set of course word IDs for fast lookup
    const courseWordIds = new Set(
      testableRows.map((lw) => lw.word_id).filter((id): id is string => id !== null)
    );

    // Fetch user's word progress scoped by user_id only. Filtering by
    // word_id pushes ~1k+ UUIDs through PostgREST and silently returns empty
    // on long URLs for courses with many words. Paginate via .range() so the
    // PostgREST server-side max-rows cap (1,000) doesn't truncate results for
    // power users with many progress records. The downstream intersection
    // with courseWordIds (via wordStatusMap) keeps counts course-scoped.
    const userProgressRows = await fetchAllRows<{
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
      { label: "getLessons:user_word_progress" }
    );

    if (lessonWordsRows.length > 0 && userProgressRows.length > 0) {
      // Build per-word status lookup
      const wordStatusMap = new Map<string, string>();
      userProgressRows.forEach((p) => {
        if (p.word_id && p.status) wordStatusMap.set(p.word_id, p.status);
      });

      // Count user progress that matches course words
      wordsStudied = userProgressRows.filter((p) => p.word_id && courseWordIds.has(p.word_id)).length;

      // Also count learned and mastered words from user_word_progress
      wordsLearned = userProgressRows.filter(
        (p) => p.word_id && courseWordIds.has(p.word_id) && (p.status === "learned" || p.status === "mastered")
      ).length;
      wordsMastered = userProgressRows.filter(
        (p) => p.word_id && courseWordIds.has(p.word_id) && p.status === "mastered"
      ).length;

      // Build per-lesson testable word count and mastered/learned counts from live data
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
  }

  // Calculate total words
  const totalWords = lessons?.reduce((sum, l) => sum + (l.word_count || 0), 0) || 0;

  // Combine data
  const lessonsWithProgress: LessonWithProgress[] = (lessons || []).map(
    (lesson) => {
      const progress = progressByLesson[lesson.id];

      // Use live mastered/learned counts from user_word_progress (more accurate than stale lesson progress)
      const liveMastered = liveMasteredByLesson[lesson.id] || 0;
      const liveLearned = liveLearnedByLesson[lesson.id] || 0;
      // Use testable word count (excludes info pages) — matches updateLessonProgress denominator
      const totalWords = testableCountByLesson[lesson.id] || lesson.word_count || 0;
      const liveCompletion = totalWords > 0 ? Math.round((liveMastered / totalWords) * 100) : 0;

      // Derive status from live word progress instead of potentially stale DB value
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

      return {
        ...lesson,
        status: derivedStatus,
        completionPercent: liveCompletion,
        wordsLearned: liveLearned,
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
      wordsLearned,
      wordsMastered,
    },
    isGuest: !user,
  };
}
