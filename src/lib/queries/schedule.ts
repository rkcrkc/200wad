import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/utils";
import { Course, Language, Lesson, UserLessonProgress } from "@/types/database";
import {
  LessonStatus,
  createAutoLessonId,
} from "./lessons";
import { getAutoLessonWordLimit } from "./platformConfig";
import { recordTestDueNotifications } from "@/lib/notifications/test-due";

/** Cadence for re-surfacing the Worst Words auto-lesson in the scheduler. */
const WORST_WORDS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// Helper function to extract course without nested relations
function extractCourse(course: Course & { languages?: unknown }): Course {
  return {
    id: course.id,
    name: course.name,
    description: course.description,
    language_id: course.language_id,
    legacy_ref: course.legacy_ref,
    level: course.level,
    cefr_range: course.cefr_range,
    total_lessons: course.total_lessons,
    word_count: course.word_count,
    price_override_cents: course.price_override_cents,
    free_lessons: course.free_lessons,
    is_published: course.is_published,
    sort_order: course.sort_order,
    thumbnail_url: course.thumbnail_url,
    created_at: course.created_at,
    updated_at: course.updated_at,
    created_by: course.created_by,
    updated_by: course.updated_by,
  };
}

// ============================================================================
// Types
// ============================================================================

export interface CurrentCourseInfo {
  course: Course | null;
  language: Language | null;
  userName: string | null;
}

export interface LessonForScheduler extends Lesson {
  /** Sample words from the lesson for display */
  sampleWords: string[];
  /** URL for lesson thumbnail/image */
  imageUrl: string | null;
  /** The milestone this test is for (only for due tests) */
  nextMilestone?: string;
  /** When this test became due */
  nextTestDueAt?: string;
  /** Lesson status from user progress */
  status: string | null;
}

export interface ScheduleData {
  // Primary action
  dueTests: LessonForScheduler[];
  nextLesson: LessonForScheduler | null;
  /**
   * Worst Words auto-lesson, surfaced once per week. Non-null only when the
   * user has at least one non-mastered worst word AND has not completed a
   * Worst Words test in the last 7 days. Takes top priority in the scheduler
   * card when set, falling back to dueTests / nextLesson otherwise.
   */
  worstWordsAutoLesson: LessonForScheduler | null;

  // Context
  isFirstLesson: boolean;
  dueTestsCount: number;
  totalLessons: number;

  // Lesson grid
  newLessons: LessonForScheduler[];
  recentLessons: LessonForScheduler[];
  needsReviewLessons: LessonForScheduler[];

  // Auth state
  isGuest: boolean;
}

export interface GetScheduleDataResult extends ScheduleData {
  error: string | null;
}

// ============================================================================
// Current Course Query
// ============================================================================

/**
 * Get the user's current course based on their current language
 * Falls back to the first available course if no language is selected
 */
export async function getCurrentCourse(): Promise<CurrentCourseInfo> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // For guests, return the first available course
    const { data: firstCourse } = await supabase
      .from("courses")
      .select("*, languages(*)")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(1)
      .single();

    return {
      course: firstCourse ? extractCourse(firstCourse) : null,
      language: (firstCourse?.languages as Language) || null,
      userName: null,
    };
  }

  // Get user info including current course
  const { data: userData } = await supabase
    .from("users")
    .select("name, current_language_id, current_course_id")
    .eq("id", user.id)
    .single();

  // If user has a current course set, use that
  if (userData?.current_course_id) {
    const { data: course } = await supabase
      .from("courses")
      .select("*, languages(*)")
      .eq("id", userData.current_course_id)
      .single();

    if (course) {
      return {
        course: extractCourse(course),
        language: (course.languages as Language) || null,
        userName: userData.name || null,
      };
    }
  }

  // Fall back to current language's first course
  const { data: currentUserLang } = await supabase
    .from("user_languages")
    .select("language_id")
    .eq("user_id", user.id)
    .eq("is_current", true)
    .single();

  const currentLanguageId =
    currentUserLang?.language_id || userData?.current_language_id;

  if (!currentLanguageId) {
    // No language selected, return first course
    const { data: firstCourse } = await supabase
      .from("courses")
      .select("*, languages(*)")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(1)
      .single();

    return {
      course: firstCourse ? extractCourse(firstCourse) : null,
      language: (firstCourse?.languages as Language) || null,
      userName: userData?.name || null,
    };
  }

  // Get first course for the current language
  const { data: course } = await supabase
    .from("courses")
    .select("*, languages(*)")
    .eq("language_id", currentLanguageId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(1)
    .single();

  return {
    course: course ? extractCourse(course) : null,
    language: (course?.languages as Language) || null,
    userName: userData?.name || null,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get sample words for a lesson (first 10 words)
 */
async function getLessonSampleWords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lessonIds: string[]
): Promise<Record<string, string[]>> {
  if (lessonIds.length === 0) return {};

  // Use lesson_words join table to get words per lesson, excluding information pages.
  // Paginate via .range() — PostgREST caps single-request responses at 1,000 rows.
  const lessonWords = await fetchAllRows<{
    lesson_id: string | null;
    words: { english: string; category: string | null } | null;
  }>(
    (from, to) =>
      supabase
        .from("lesson_words")
        .select("lesson_id, words(english, category)")
        .in("lesson_id", lessonIds)
        .order("sort_order")
        .range(from, to),
    { label: "getLessonSampleWords:lesson_words" }
  );

  const samplesByLesson: Record<string, string[]> = {};
  lessonWords.forEach((lw) => {
    const lessonId = lw.lesson_id;
    if (!lessonId) return;
    const word = lw.words as { english: string; category: string | null } | null;
    if (!word || word.category === "information") return;
    if (!samplesByLesson[lessonId]) {
      samplesByLesson[lessonId] = [];
    }
    samplesByLesson[lessonId].push(word.english);
  });

  return samplesByLesson;
}

/**
 * Get first memory trigger image for lessons as thumbnail
 */
async function getLessonImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lessonIds: string[]
): Promise<Record<string, string | null>> {
  if (lessonIds.length === 0) return {};

  // Get first testable word with an image for each lesson via lesson_words join table.
  // Information pages (category = 'information') are excluded so their artwork never
  // appears as the lesson thumbnail. Paginate via .range() to avoid PostgREST's
  // 1,000-row single-request cap for large courses.
  const lessonWords = await fetchAllRows<{
    lesson_id: string | null;
    words: { memory_trigger_image_url: string | null; category: string | null } | null;
  }>(
    (from, to) =>
      supabase
        .from("lesson_words")
        .select("lesson_id, words(memory_trigger_image_url, category)")
        .in("lesson_id", lessonIds)
        .order("sort_order")
        .range(from, to),
    { label: "getLessonImages:lesson_words" }
  );

  const imagesByLesson: Record<string, string | null> = {};
  lessonWords.forEach((lw) => {
    const lessonId = lw.lesson_id;
    if (!lessonId || !lw.words) return;
    const word = lw.words as {
      memory_trigger_image_url: string | null;
      category: string | null;
    };
    if (word.category === "information") return;
    // Only take the first image per lesson
    if (!imagesByLesson[lessonId] && word.memory_trigger_image_url) {
      imagesByLesson[lessonId] = word.memory_trigger_image_url;
    }
  });

  return imagesByLesson;
}

/**
 * Transform lessons to scheduler format
 */
function transformToSchedulerFormat(
  lessons: Lesson[],
  sampleWords: Record<string, string[]>,
  images: Record<string, string | null>,
  liveStatusByLesson?: Record<string, LessonStatus>,
  milestoneInfo?: Record<string, { nextMilestone: string; nextTestDueAt: string }>
): LessonForScheduler[] {
  return lessons.map((lesson) => ({
    ...lesson,
    sampleWords: sampleWords[lesson.id] || [],
    imageUrl: images[lesson.id] || null,
    status: liveStatusByLesson?.[lesson.id] ?? null,
    nextMilestone: milestoneInfo?.[lesson.id]?.nextMilestone,
    nextTestDueAt: milestoneInfo?.[lesson.id]?.nextTestDueAt,
  }));
}

/**
 * Compute the Worst Words auto-lesson for the scheduler card, if eligible.
 *
 * Eligibility (all must hold):
 *   1. The user has completed at least one test in this course (so the
 *      best/worst algorithm has data to score from).
 *   2. After excluding mastered words, the worst-words pool has ≥1 word.
 *   3. The user has either never completed a Worst Words test in this
 *      course, or the most recent completion was ≥7 days ago.
 *
 * Returns a synthetic `LessonForScheduler` whose `id` is
 * `auto-worst-${courseId}` (matches `createAutoLessonId` so existing
 * lesson/study/test routes already accept it).
 *
 * `userWordProgress` is reused from the caller to avoid a duplicate fetch
 * of the user's per-word status set.
 */
async function getWorstWordsAutoLesson(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  userId: string,
  lessonIds: string[],
  courseWordIds: Set<string>,
  userWordProgress: Array<{ word_id: string | null; status: string | null }>,
  nowMs: number
): Promise<LessonForScheduler | null> {
  if (lessonIds.length === 0 || courseWordIds.size === 0) return null;

  const autoWorstId = createAutoLessonId("worst", courseId);

  // 1. Find last completed Worst Words test in this course. After migration
  //    20260516000002 auto-lesson rows have `lesson_id IS NULL` and are
  //    keyed by `(auto_lesson_type, course_id)` instead.
  const { data: lastSession } = await supabase
    .from("study_sessions")
    .select("ended_at")
    .eq("user_id", userId)
    .eq("auto_lesson_type", "worst")
    .eq("course_id", courseId)
    .eq("session_type", "test")
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastEndedMs = lastSession?.ended_at
    ? new Date(lastSession.ended_at).getTime()
    : null;
  if (lastEndedMs !== null && nowMs - lastEndedMs < WORST_WORDS_COOLDOWN_MS) {
    return null;
  }

  // 2. Pick the user's worst words for this course server-side. The
  //    `select_best_worst_words_for_course` RPC aggregates `test_questions`
  //    scoped to this user and the course's words and excludes already-
  //    mastered words. The All-Lessons summary and the lesson detail page
  //    call the same RPC with the same admin-configurable cap, so all three
  //    views agree on the same set of words.
  const autoLessonWordLimit = await getAutoLessonWordLimit();
  const { data: worstRpcRows } = await supabase.rpc(
    "select_best_worst_words_for_course",
    { p_course_id: courseId, p_type: "worst", p_limit: autoLessonWordLimit },
  );
  const worstWordIds = (worstRpcRows ?? [])
    .map((r) => r.word_id)
    .filter((id): id is string => !!id);
  if (worstWordIds.length === 0) return null;

  // 3. Per-word status for the worst pool, used below to derive the
  //    auto-lesson's aggregate status (mastered/learned/learning/not-started).
  const masteredWordIds = new Set<string>();
  const learnedWordIds = new Set<string>();
  const learningWordIds = new Set<string>();
  for (const wp of userWordProgress) {
    if (!wp.word_id || !courseWordIds.has(wp.word_id)) continue;
    if (wp.status === "mastered") masteredWordIds.add(wp.word_id);
    if (wp.status === "learned") learnedWordIds.add(wp.word_id);
    if (wp.status === "learning") learningWordIds.add(wp.word_id);
  }

  // 4. Fetch sample words + first non-information image directly from `words`.
  //    `lesson_words` has no rows for auto-lesson IDs, so the standard
  //    `getLessonSampleWords` / `getLessonImages` helpers can't be reused.
  const { data: wordRows } = await supabase
    .from("words")
    .select("id, english, memory_trigger_image_url, category")
    .in("id", worstWordIds);

  const worstWordOrder = new Map(worstWordIds.map((id, i) => [id, i]));
  const orderedWords = (wordRows ?? [])
    .filter((w) => w.category !== "information")
    .sort((a, b) => {
      const ai = worstWordOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bi = worstWordOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  const sampleWords = orderedWords.map((w) => w.english);
  const imageUrl =
    orderedWords.find((w) => w.memory_trigger_image_url)
      ?.memory_trigger_image_url ?? null;

  // 5. Derive status for the auto-lesson from the worst-words pool's
  //    aggregate progress (mirrors generateAutoLessons logic).
  const totalWords = worstWordIds.length;
  const masteredCount = worstWordIds.filter((id) => masteredWordIds.has(id))
    .length;
  const learnedOrMasteredCount = worstWordIds.filter(
    (id) => learnedWordIds.has(id) || masteredWordIds.has(id)
  ).length;
  const learningCount = worstWordIds.filter((id) => learningWordIds.has(id))
    .length;
  const status: LessonStatus =
    masteredCount === totalWords && totalWords > 0
      ? "mastered"
      : learnedOrMasteredCount === totalWords && totalWords > 0
        ? "learned"
        : masteredCount > 0 || learnedOrMasteredCount > 0 || learningCount > 0
          ? "learning"
          : "not-started";

  const nowIso = new Date(nowMs).toISOString();
  return {
    id: autoWorstId,
    course_id: courseId,
    number: 802,
    title: "Worst Words",
    emoji: "🎯",
    word_count: totalWords,
    is_published: true,
    sort_order: 802,
    legacy_lesson_id: null,
    created_at: nowIso,
    updated_at: nowIso,
    created_by: null,
    updated_by: null,
    sampleWords,
    imageUrl,
    status,
  };
}

// ============================================================================
// Main Query Functions
// ============================================================================

/**
 * Get the count of lessons with due tests (for sidebar badge).
 *
 * Resolves target lesson IDs via a standalone lessons query, then counts
 * matching user_lesson_progress rows. This mirrors the filtering used by
 * `getTests` (src/lib/queries/tests.ts) so the sidebar badge can never
 * disagree with the Tests page count. Earlier versions used an embedded
 * `lessons!inner(course_id)` join, which could silently drop progress rows
 * due to PostgREST embed/RLS quirks and produce a lower count than the page.
 */
export async function getDueTestsCount(courseId?: string): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  // Step 1: resolve published lesson IDs for the (optional) course scope.
  let lessonsQuery = supabase
    .from("lessons")
    .select("id")
    .eq("is_published", true);

  if (courseId) {
    lessonsQuery = lessonsQuery.eq("course_id", courseId);
  }

  const { data: lessons, error: lessonsError } = await lessonsQuery;

  if (lessonsError) {
    console.error("Error fetching lessons for due tests count:", lessonsError);
    return 0;
  }

  if (!lessons || lessons.length === 0) return 0;

  const lessonIds = lessons.map((l) => l.id);
  const now = new Date().toISOString();

  // Step 2: count due progress rows scoped to those lessons.
  // Uses head:true so only the count is returned over the wire.
  const { count, error } = await supabase
    .from("user_lesson_progress")
    .select("lesson_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("lesson_id", lessonIds)
    .not("next_milestone", "is", null)
    .lte("next_test_due_at", now);

  if (error) {
    console.error("Error fetching due tests count:", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Get all schedule data for the schedule page
 */
export async function getScheduleData(
  courseId: string
): Promise<GetScheduleDataResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = !user;

  // Fetch all lessons for this course
  const { data: allLessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order")
    .order("number");

  if (lessonsError) {
    console.error("Error fetching lessons:", lessonsError);
    return {
      dueTests: [],
      nextLesson: null,
      worstWordsAutoLesson: null,
      isFirstLesson: true,
      dueTestsCount: 0,
      totalLessons: 0,
      newLessons: [],
      recentLessons: [],
      needsReviewLessons: [],
      isGuest,
      error: lessonsError.message,
    };
  }

  if (!allLessons || allLessons.length === 0) {
    return {
      dueTests: [],
      nextLesson: null,
      worstWordsAutoLesson: null,
      isFirstLesson: true,
      dueTestsCount: 0,
      totalLessons: 0,
      newLessons: [],
      recentLessons: [],
      needsReviewLessons: [],
      isGuest,
      error: null,
    };
  }

  const lessonIds = allLessons.map((l) => l.id);

  // For guests, return first lesson as next and all as new
  if (isGuest) {
    const [sampleWords, images] = await Promise.all([
      getLessonSampleWords(supabase, lessonIds),
      getLessonImages(supabase, lessonIds),
    ]);

    const schedulerLessons = transformToSchedulerFormat(
      allLessons,
      sampleWords,
      images,
      undefined
    );

    return {
      dueTests: [],
      nextLesson: schedulerLessons[0] || null,
      worstWordsAutoLesson: null,
      isFirstLesson: true,
      dueTestsCount: 0,
      totalLessons: schedulerLessons.length,
      newLessons: schedulerLessons,
      recentLessons: [],
      needsReviewLessons: [],
      isGuest,
      error: null,
    };
  }

  // Lazy "test due" notifications: any milestone test whose
  // next_test_due_at <= now() that hasn't already been notified for this
  // (lesson, milestone) cycle gets a bell entry. Idempotent + non-critical
  // (errors swallowed by the helper). Deferred via `after()` so it runs
  // after the response has been streamed — was previously awaited at the
  // tail of this function, which put a sequential admin-client query +
  // per-lesson insert loop on the critical render path.
  if (user) {
    const userId = user.id;
    after(() => recordTestDueNotifications(userId));
  }

  // Get lesson progress and lesson_words in parallel; user_word_progress is fetched
  // after so it can be scoped to this course's words. lesson_words and
  // user_word_progress both use .range() pagination — PostgREST's 1,000-row max-rows
  // cap otherwise silently truncates single-request responses.
  const [
    { data: lessonProgress },
    lessonWordsRows,
  ] = await Promise.all([
    supabase
      .from("user_lesson_progress")
      .select("*")
      .eq("user_id", user.id)
      .in("lesson_id", lessonIds),
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
      { label: "getScheduleData:lesson_words" }
    ),
  ]);

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
    next_review_at: string | null;
  }>(
    (from, to) =>
      supabase
        .from("user_word_progress")
        .select("word_id, status, next_review_at")
        .eq("user_id", user.id)
        .in("status", ["learning", "learned", "mastered"])
        .range(from, to),
    { label: "getScheduleData:user_word_progress" }
  );

  const progressByLesson = new Map<string, UserLessonProgress>(
    (lessonProgress || [])
      .filter((p): p is UserLessonProgress & { lesson_id: string } => p.lesson_id !== null)
      .map((p) => [p.lesson_id, p])
  );

  // Build live per-lesson status from user_word_progress
  const liveStatusByLesson: Record<string, LessonStatus> = {};

  if (lessonWordsRows.length > 0 && userWordProgress.length > 0) {
    const wordStatusMap = new Map<string, string>();
    userWordProgress.forEach((p) => {
      if (p.word_id && p.status) wordStatusMap.set(p.word_id, p.status);
    });

    const learnedByLesson: Record<string, number> = {};
    const masteredByLesson: Record<string, number> = {};
    const testableCountByLesson: Record<string, number> = {};

    for (const lw of testableRows) {
      if (!lw.lesson_id || !lw.word_id) continue;
      testableCountByLesson[lw.lesson_id] = (testableCountByLesson[lw.lesson_id] || 0) + 1;
      const status = wordStatusMap.get(lw.word_id);
      if (status === "mastered") {
        masteredByLesson[lw.lesson_id] = (masteredByLesson[lw.lesson_id] || 0) + 1;
      }
      if (status === "learned" || status === "mastered") {
        learnedByLesson[lw.lesson_id] = (learnedByLesson[lw.lesson_id] || 0) + 1;
      }
    }

    for (const lessonId of lessonIds) {
      const liveLearned = learnedByLesson[lessonId] || 0;
      const liveMastered = masteredByLesson[lessonId] || 0;
      const totalWords = testableCountByLesson[lessonId] || 0;
      const progress = progressByLesson.get(lessonId);

      const allMastered = totalWords > 0 && liveMastered >= totalWords;
      const allLearned = totalWords > 0 && liveLearned >= totalWords;

      liveStatusByLesson[lessonId] = allMastered
        ? "mastered"
        : allLearned
          ? "learned"
          : liveMastered > 0 || liveLearned > 0 || progress?.status === "learning" || progress?.status === "learned" || progress?.status === "mastered"
            ? "learning"
            : "not-started";
    }
  }

  // Determine if this is the first lesson (no progress records)
  const isFirstLesson = !lessonProgress || lessonProgress.length === 0;

  // Get due tests - lessons with milestone tests due (lesson-level scheduling)
  const now = new Date().toISOString();

  // Filter progress records to find due tests
  const dueProgressRecords = (lessonProgress || []).filter(
    (p) => p.next_milestone && p.next_test_due_at && p.next_test_due_at <= now
  );

  let dueTests: LessonForScheduler[] = [];
  const dueTestsCount = dueProgressRecords.length;

  if (dueProgressRecords.length > 0) {
    // Get lesson IDs and milestone info for due tests
    const dueLessonIds = dueProgressRecords
      .map((p) => p.lesson_id)
      .filter((id): id is string => id !== null);

    const milestoneInfo: Record<string, { nextMilestone: string; nextTestDueAt: string }> = {};
    dueProgressRecords.forEach((p) => {
      if (p.lesson_id && p.next_milestone && p.next_test_due_at) {
        milestoneInfo[p.lesson_id] = {
          nextMilestone: p.next_milestone,
          nextTestDueAt: p.next_test_due_at,
        };
      }
    });

    // Get full lesson data for due lessons, sorted by due date (oldest first)
    const dueLessons = allLessons
      .filter((l) => dueLessonIds.includes(l.id))
      .sort((a, b) => {
        const aDate = milestoneInfo[a.id]?.nextTestDueAt || "";
        const bDate = milestoneInfo[b.id]?.nextTestDueAt || "";
        return aDate.localeCompare(bDate);
      });

    if (dueLessons.length > 0) {
      const [sampleWords, images] = await Promise.all([
        getLessonSampleWords(supabase, dueLessonIds),
        getLessonImages(supabase, dueLessonIds),
      ]);

      dueTests = transformToSchedulerFormat(
        dueLessons,
        sampleWords,
        images,
        liveStatusByLesson,
        milestoneInfo
      );
    }
  }

  // Build "Needs review" candidates via two-tier sort. Shared by the scheduler
  // fallback (when no not-started lessons exist) and the "Needs review" grid.
  //   Tier 1 — Overdue: lesson has ≥1 word with next_review_at < now()
  //   Tier 2 — Stale: no overdue words, but last_studied_at older than 14 days
  // Mastered lessons are excluded — they should never be suggested.
  const STALE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();

  // Word -> next_review_at map (only words with a value)
  const nextReviewByWord = new Map<string, string>();
  userWordProgress.forEach((p) => {
    if (p.word_id && p.next_review_at) {
      nextReviewByWord.set(p.word_id, p.next_review_at);
    }
  });

  // Per-lesson overdue stats
  const overdueCountByLesson: Record<string, number> = {};
  const maxDaysOverdueByLesson: Record<string, number> = {};

  for (const lw of testableRows) {
    if (!lw.lesson_id || !lw.word_id) continue;
    const nextReviewAt = nextReviewByWord.get(lw.word_id);
    if (!nextReviewAt) continue;
    const dueMs = new Date(nextReviewAt).getTime();
    if (Number.isNaN(dueMs) || dueMs >= nowMs) continue;
    const daysOverdue = (nowMs - dueMs) / (24 * 60 * 60 * 1000);
    overdueCountByLesson[lw.lesson_id] = (overdueCountByLesson[lw.lesson_id] || 0) + 1;
    if (daysOverdue > (maxDaysOverdueByLesson[lw.lesson_id] || 0)) {
      maxDaysOverdueByLesson[lw.lesson_id] = daysOverdue;
    }
  }

  type ReviewCandidate = {
    lesson: Lesson;
    tier: 1 | 2;
    overdueCount: number;
    maxDaysOverdue: number;
    lastStudiedAt: string;
  };

  const reviewCandidates: ReviewCandidate[] = [];
  for (const lesson of allLessons) {
    if (liveStatusByLesson[lesson.id] === "mastered") continue;

    const progress = progressByLesson.get(lesson.id);
    if (!progress) continue;
    const overdueCount = overdueCountByLesson[lesson.id] || 0;
    const maxDaysOverdue = maxDaysOverdueByLesson[lesson.id] || 0;
    const lastStudiedAt = progress.last_studied_at || "";

    if (overdueCount > 0) {
      reviewCandidates.push({
        lesson,
        tier: 1,
        overdueCount,
        maxDaysOverdue,
        lastStudiedAt,
      });
      continue;
    }

    if (lastStudiedAt) {
      const lastMs = new Date(lastStudiedAt).getTime();
      if (!Number.isNaN(lastMs) && nowMs - lastMs > STALE_THRESHOLD_MS) {
        reviewCandidates.push({
          lesson,
          tier: 2,
          overdueCount: 0,
          maxDaysOverdue: 0,
          lastStudiedAt,
        });
      }
    }
  }

  // Sort: tier asc; Tier 1 by overdueCount desc, then maxDaysOverdue desc;
  // Tier 2 by lastStudiedAt asc (oldest first).
  reviewCandidates.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.tier === 1) {
      if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount;
      return b.maxDaysOverdue - a.maxDaysOverdue;
    }
    return a.lastStudiedAt.localeCompare(b.lastStudiedAt);
  });

  // Find next lesson to study. Priority:
  //   1. First not-started lesson (fresh content always wins)
  //   2. Top "Needs review" candidate — most-overdue unmastered lesson
  //      (Tier 1 by overdue count, then Tier 2 by stale date)
  //   3. Any non-mastered lesson with progress (final safety net so the
  //      scheduler is only empty when every lesson is mastered)
  let nextLesson: LessonForScheduler | null = null;
  let nextLessonData: Lesson | undefined = allLessons.find(
    (lesson) => liveStatusByLesson[lesson.id] === "not-started"
  );
  if (!nextLessonData && reviewCandidates.length > 0) {
    nextLessonData = reviewCandidates[0].lesson;
  }
  if (!nextLessonData) {
    nextLessonData = allLessons.find(
      (lesson) =>
        liveStatusByLesson[lesson.id] !== "mastered" &&
        progressByLesson.has(lesson.id)
    );
  }

  if (nextLessonData) {
    const [sampleWords, images] = await Promise.all([
      getLessonSampleWords(supabase, [nextLessonData.id]),
      getLessonImages(supabase, [nextLessonData.id]),
    ]);

    const transformed = transformToSchedulerFormat(
      [nextLessonData],
      sampleWords,
      images,
      liveStatusByLesson
    );
    nextLesson = transformed[0] || null;
  }

  // Categorize lessons for grid
  const newLessonsData: Lesson[] = [];
  const recentLessonsData: Lesson[] = [];

  allLessons.forEach((lesson) => {
    const progress = progressByLesson.get(lesson.id);
    if (!progress) {
      newLessonsData.push(lesson);
    } else if (progress.last_studied_at) {
      recentLessonsData.push(lesson);
    }
  });

  // Sort recent by last studied (most recent first)
  recentLessonsData.sort((a, b) => {
    const aDate = progressByLesson.get(a.id)?.last_studied_at || "";
    const bDate = progressByLesson.get(b.id)?.last_studied_at || "";
    return bDate.localeCompare(aDate);
  });

  // "Needs review" grid threshold: requires ≥5 lessons started AND ≥3
  // qualifying candidates (independent of the scheduler fallback above).
  const startedLessonsCount = lessonProgress?.length ?? 0;
  const meetsThreshold = startedLessonsCount >= 5 && reviewCandidates.length >= 3;
  const needsReviewLessonsData: Lesson[] = meetsThreshold
    ? reviewCandidates.slice(0, 6).map((c) => c.lesson)
    : [];

  // Get sample words and images for grid lessons (dedupe lesson IDs)
  const gridLessonIds = Array.from(
    new Set([
      ...newLessonsData.map((l) => l.id),
      ...recentLessonsData.map((l) => l.id),
      ...needsReviewLessonsData.map((l) => l.id),
    ])
  );

  const [gridSampleWords, gridImages] = await Promise.all([
    getLessonSampleWords(supabase, gridLessonIds),
    getLessonImages(supabase, gridLessonIds),
  ]);

  const newLessons = transformToSchedulerFormat(
    newLessonsData,
    gridSampleWords,
    gridImages,
    liveStatusByLesson
  );
  const recentLessons = transformToSchedulerFormat(
    recentLessonsData,
    gridSampleWords,
    gridImages,
    liveStatusByLesson
  );
  const needsReviewLessons = transformToSchedulerFormat(
    needsReviewLessonsData,
    gridSampleWords,
    gridImages,
    liveStatusByLesson
  );

  // Worst Words auto-lesson — surfaced once per week as the top scheduler
  // priority. Reuses `userWordProgress` and `courseWordIds` already in scope
  // to avoid extra round-trips. Failures are swallowed: a missing auto-lesson
  // shouldn't break the rest of the schedule.
  let worstWordsAutoLesson: LessonForScheduler | null = null;
  try {
    worstWordsAutoLesson = await getWorstWordsAutoLesson(
      supabase,
      courseId,
      user.id,
      lessonIds,
      courseWordIds,
      userWordProgress,
      nowMs
    );
  } catch (err) {
    console.error("Error computing worst-words auto-lesson:", err);
  }

  return {
    dueTests,
    nextLesson,
    worstWordsAutoLesson,
    isFirstLesson,
    dueTestsCount,
    totalLessons: allLessons.length,
    newLessons,
    recentLessons,
    needsReviewLessons,
    isGuest,
    error: null,
  };
}
