import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/utils";
import { Course, Language, Lesson, UserLessonProgress } from "@/types/database";
import { getLessonAccessMap } from "@/lib/utils/accessControl";
import {
  AUTO_LESSON_DEFINITIONS,
  createAutoLessonId,
  selectLostMasteryWordIds,
  selectUnmasteredWordIds,
} from "./auto-lessons";
import type { AutoLessonType } from "./auto-lessons";
import { getAutoLessonWordLimit } from "./platformConfig";

// Re-export the client-safe helpers so existing imports from this module
// keep working. New client code should import from "./auto-lessons" directly
// to avoid dragging server-only modules into the client bundle.
export {
  AUTO_LESSON_META,
  DEFAULT_AUTO_LESSON_WORD_LIMIT,
  createAutoLessonId,
  getAllAutoLessonIds,
  isAutoLesson,
  parseAutoLessonId,
  resolveLessonIdRef,
  selectLostMasteryWordIds,
  selectUnmasteredWordIds,
} from "./auto-lessons";
export type { AutoLessonType, LessonIdRef } from "./auto-lessons";

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

/**
 * Insert a one-time "lost_mastery_introduced" notification for the user when
 * their Lost Mastery special lesson first becomes populated. Dedupes via a
 * single (user_id, type) lookup — both columns are indexed, so the cost is
 * negligible. Safe to call on every render: the existence check skips the
 * insert once a row is present.
 */
async function ensureLostMasteryIntroduced(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "lost_mastery_introduced")
    .limit(1)
    .maybeSingle();

  if (existing) return;

  await supabase.from("notifications").insert({
    user_id: userId,
    type: "lost_mastery_introduced",
    channel: "in_app",
    title: "New special lesson: Lost Mastery",
    message:
      "You've slipped on a word you previously mastered. Open Lost Mastery in your lessons to refresh it.",
    is_read: false,
  });
}

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

  // Admin-configurable cap shared by every auto-lesson (Best, Worst,
  // Unmastered, Lost Mastery). Cached + invalidated via the `platform-config`
  // tag, so this read is cheap on hot paths.
  const autoLessonWordLimit = await getAutoLessonWordLimit();

  // Fetch notes word IDs, best/worst word IDs, and the user's per-word status
  // all in parallel. Best/Worst aggregation happens server-side via the
  // `select_best_worst_words_for_course` RPC so per-word test history isn't
  // filtered through the current course's lesson_ids (see migration for
  // rationale).
  const [
    notesResult,
    bestRpcResult,
    worstRpcResult,
    wordProgressData,
  ] = await Promise.all([
    // Fetch word IDs with user notes. No word_id filter — pushing ~1k UUIDs
    // through PostgREST silently returns empty on long URLs. The
    // `user_notes is not null` predicate already bounds this to a small set.
    supabase
      .from("user_word_progress")
      .select("word_id")
      .eq("user_id", userId)
      .not("user_notes", "is", null),

    supabase.rpc("select_best_worst_words_for_course", {
      p_course_id: courseId,
      p_type: "best",
      p_limit: autoLessonWordLimit,
    }),
    supabase.rpc("select_best_worst_words_for_course", {
      p_course_id: courseId,
      p_type: "worst",
      p_limit: autoLessonWordLimit,
    }),

    // Per-word status + timestamps for unmastered/lost-mastery selection.
    // Scope by user_id + status only and paginate via .range() — pushing every
    // course word_id through `.in(…)` creates a multi-KB URL that PostgREST
    // silently returns empty for.
    fetchAllRows<{
      word_id: string | null;
      status: string | null;
      mastered_at: string | null;
      learned_at: string | null;
      last_studied_at: string | null;
      correct_streak: number | null;
    }>(
      (from, to) =>
        supabase
          .from("user_word_progress")
          .select("word_id, status, mastered_at, learned_at, last_studied_at, correct_streak")
          .eq("user_id", userId)
          .in("status", ["learning", "learned", "mastered"])
          .range(from, to),
      { label: "generateAutoLessons:user_word_progress" }
    ),
  ]);

  // Intersect notes client-side with this course's words.
  const courseWordIdSet = new Set(courseWordIds);
  const notesWordIds = notesResult.data
    ?.map((w) => w.word_id)
    .filter((id): id is string => id !== null && courseWordIdSet.has(id)) || [];

  // Build per-status sets, scoped to this course's words. We also collect
  // the rows for "learned" words so the unmastered / lost-mastery selectors
  // can sort by their timestamps without re-querying.
  const masteredWordIds = new Set<string>();
  const learnedWordIds = new Set<string>();
  const learningWordIds = new Set<string>();
  const learnedRows: Array<{
    word_id: string;
    mastered_at: string | null;
    learned_at: string | null;
    last_studied_at: string | null;
    correct_streak: number | null;
  }> = [];
  wordProgressData.forEach((wp) => {
    if (!wp.word_id || !courseWordIdSet.has(wp.word_id)) return;
    if (wp.status === "mastered") masteredWordIds.add(wp.word_id);
    if (wp.status === "learned") {
      learnedWordIds.add(wp.word_id);
      learnedRows.push({
        word_id: wp.word_id,
        mastered_at: wp.mastered_at,
        learned_at: wp.learned_at,
        last_studied_at: wp.last_studied_at,
        correct_streak: wp.correct_streak,
      });
    }
    if (wp.status === "learning") learningWordIds.add(wp.word_id);
  });

  // Best/Worst word IDs come from the `select_best_worst_words_for_course`
  // RPC. The function aggregates `test_questions` server-side scoped to this
  // user and to words in this course, so the All-Lessons summary, the
  // lesson detail page, and the scheduler always agree.
  const bestWordIds = (bestRpcResult.data ?? [])
    .map((r) => r.word_id)
    .filter((id): id is string => !!id);
  const worstWordIds = (worstRpcResult.data ?? [])
    .map((r) => r.word_id)
    .filter((id): id is string => !!id);

  // Unmastered: status=learned AND mastered_at IS NULL — words the user has
  // never reached mastery on. Sort by learned_at ASC so the "stuck the
  // longest" words come up first; deterministic word_id tiebreak keeps the
  // selection stable across reloads.
  const unmasteredWordIds = selectUnmasteredWordIds(learnedRows, autoLessonWordLimit);

  // Lost Mastery: status=learned AND mastered_at IS NOT NULL — words the
  // user has previously mastered but has since slipped on. Sort by
  // last_studied_at DESC so the freshest losses surface first.
  const lostMasteryWordIds = selectLostMasteryWordIds(learnedRows, autoLessonWordLimit);

  const wordIdsByType: Record<AutoLessonType, string[]> = {
    notes: notesWordIds,
    best: bestWordIds,
    worst: worstWordIds,
    unmastered: unmasteredWordIds,
    lost_mastery: lostMasteryWordIds,
  };

  // Fire-and-forget: when the user has any lost-mastery words, ensure they've
  // been notified at least once that this special lesson exists. Wrapped in
  // try/catch so notification failures never block lesson rendering.
  if (lostMasteryWordIds.length > 0) {
    void ensureLostMasteryIntroduced(supabase, userId).catch((err) => {
      console.error("ensureLostMasteryIntroduced failed:", err);
    });
  }

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

    // Auto-lessons (Notes/Best/Worst/Unmastered/Lost Mastery) can be studied
    // and tested standalone. After migration 20260516000002 their rows have
    // `lesson_id IS NULL` and live under `(auto_lesson_type, course_id)`, so
    // we use a `.or()` predicate to capture both real-lesson and auto-lesson
    // sessions in a single round-trip.
    const courseScopeOr =
      lessonIds.length > 0
        ? `lesson_id.in.(${lessonIds.join(",")}),course_id.eq.${courseId}`
        : `course_id.eq.${courseId}`;

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
        .or(courseScopeOr),
      supabase
        .from("test_sessions")
        .select("duration_seconds")
        .eq("user_id", user.id)
        .or(courseScopeOr),
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
