import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ALL_ROWS, warnIfTruncated } from "@/lib/supabase/utils";
import { Course, Language, Lesson, UserLessonProgress } from "@/types/database";
import { LessonStatus } from "./lessons";

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

  // Context
  isFirstLesson: boolean;
  dueTestsCount: number;

  // Lesson grid
  newLessons: LessonForScheduler[];
  recentLessons: LessonForScheduler[];

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
      .order("sort_order")
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
      .order("sort_order")
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
    .order("sort_order")
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

  // Use lesson_words join table to get words per lesson, excluding information pages
  const { data: lessonWords } = await supabase
    .from("lesson_words")
    .select("lesson_id, words(english, category)")
    .in("lesson_id", lessonIds)
    .order("sort_order")
    .limit(SUPABASE_ALL_ROWS);
  warnIfTruncated("getLessonSampleWords:lesson_words", lessonWords?.length ?? 0);

  const samplesByLesson: Record<string, string[]> = {};
  lessonWords?.forEach((lw) => {
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
  // appears as the lesson thumbnail.
  const { data: lessonWords } = await supabase
    .from("lesson_words")
    .select("lesson_id, words(memory_trigger_image_url, category)")
    .in("lesson_id", lessonIds)
    .order("sort_order")
    .limit(SUPABASE_ALL_ROWS);
  warnIfTruncated("getLessonImages:lesson_words", lessonWords?.length ?? 0);

  const imagesByLesson: Record<string, string | null> = {};
  lessonWords?.forEach((lw) => {
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

// ============================================================================
// Main Query Functions
// ============================================================================

/**
 * Get the count of lessons with due tests (for sidebar badge)
 * Uses lesson-level milestone scheduling
 */
export async function getDueTestsCount(courseId?: string): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const now = new Date().toISOString();

  // Build query for due lesson tests
  let query = supabase
    .from("user_lesson_progress")
    .select("lesson_id, lessons!inner(course_id)")
    .eq("user_id", user.id)
    .not("next_milestone", "is", null)
    .lte("next_test_due_at", now);

  // Filter by course if specified
  if (courseId) {
    query = query.eq("lessons.course_id", courseId);
  }

  const { data: dueProgress, error } = await query;

  if (error) {
    console.error("Error fetching due tests count:", error);
    return 0;
  }

  return dueProgress?.length || 0;
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
      isFirstLesson: true,
      dueTestsCount: 0,
      newLessons: [],
      recentLessons: [],
      isGuest,
      error: lessonsError.message,
    };
  }

  if (!allLessons || allLessons.length === 0) {
    return {
      dueTests: [],
      nextLesson: null,
      isFirstLesson: true,
      dueTestsCount: 0,
      newLessons: [],
      recentLessons: [],
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
      isFirstLesson: true,
      dueTestsCount: 0,
      newLessons: schedulerLessons,
      recentLessons: [],
      isGuest,
      error: null,
    };
  }

  // Get lesson progress and lesson_words in parallel; user_word_progress is fetched
  // after so it can be scoped to this course's words (avoids the default 1000-row
  // cap silently truncating progress for users with many courses).
  const [
    { data: lessonProgress },
    lessonWordsResult,
  ] = await Promise.all([
    supabase
      .from("user_lesson_progress")
      .select("*")
      .eq("user_id", user.id)
      .in("lesson_id", lessonIds),
    supabase
      .from("lesson_words")
      .select("lesson_id, word_id, words(category)")
      .in("lesson_id", lessonIds)
      .limit(SUPABASE_ALL_ROWS),
  ]);
  warnIfTruncated("getScheduleData:lesson_words", lessonWordsResult.data?.length ?? 0);

  const testableRows = (lessonWordsResult.data ?? []).filter(
    (lw) => (lw.words as unknown as { category: string | null })?.category !== "information"
  );
  const courseWordIds = new Set(
    testableRows.map((lw) => lw.word_id).filter((id): id is string => id !== null)
  );
  const courseWordIdArray = [...courseWordIds];

  const userWordProgressResult = courseWordIdArray.length > 0
    ? await supabase
        .from("user_word_progress")
        .select("word_id, status")
        .eq("user_id", user.id)
        .in("status", ["learning", "learned", "mastered"])
        .in("word_id", courseWordIdArray)
        .limit(SUPABASE_ALL_ROWS)
    : { data: [] as { word_id: string | null; status: string | null }[] };
  warnIfTruncated("getScheduleData:user_word_progress", userWordProgressResult.data?.length ?? 0);
  const userWordProgress = userWordProgressResult.data;

  const progressByLesson = new Map<string, UserLessonProgress>(
    (lessonProgress || [])
      .filter((p): p is UserLessonProgress & { lesson_id: string } => p.lesson_id !== null)
      .map((p) => [p.lesson_id, p])
  );

  // Build live per-lesson status from user_word_progress
  const liveStatusByLesson: Record<string, LessonStatus> = {};

  if (lessonWordsResult.data && userWordProgress) {
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

  // Find next lesson to study (first non-mastered lesson, using live status)
  let nextLesson: LessonForScheduler | null = null;
  const nextLessonData = allLessons.find((lesson) => {
    return liveStatusByLesson[lesson.id] !== "mastered";
  });

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

  // Get sample words and images for grid lessons
  const gridLessonIds = [
    ...newLessonsData.map((l) => l.id),
    ...recentLessonsData.map((l) => l.id),
  ];

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

  return {
    dueTests,
    nextLesson,
    isFirstLesson,
    dueTestsCount,
    newLessons,
    recentLessons,
    isGuest,
    error: null,
  };
}
