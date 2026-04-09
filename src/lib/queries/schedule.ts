import { createClient } from "@/lib/supabase/server";
import { Course, Language, Lesson, UserLessonProgress } from "@/types/database";

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
    .order("sort_order");

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

  // Get first word with an image for each lesson via lesson_words join table
  const { data: lessonWords } = await supabase
    .from("lesson_words")
    .select("lesson_id, words(memory_trigger_image_url)")
    .in("lesson_id", lessonIds)
    .order("sort_order");

  const imagesByLesson: Record<string, string | null> = {};
  lessonWords?.forEach((lw) => {
    const lessonId = lw.lesson_id;
    if (!lessonId || !lw.words) return;
    const imageUrl = (lw.words as { memory_trigger_image_url: string | null }).memory_trigger_image_url;
    // Only take the first image per lesson
    if (!imagesByLesson[lessonId] && imageUrl) {
      imagesByLesson[lessonId] = imageUrl;
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
  milestoneInfo?: Record<string, { nextMilestone: string; nextTestDueAt: string }>
): LessonForScheduler[] {
  return lessons.map((lesson) => ({
    ...lesson,
    sampleWords: sampleWords[lesson.id] || [],
    imageUrl: images[lesson.id] || null,
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
      images
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

  // Get user's lesson progress
  const { data: lessonProgress } = await supabase
    .from("user_lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("lesson_id", lessonIds);

  const progressByLesson = new Map<string, UserLessonProgress>(
    (lessonProgress || [])
      .filter((p): p is UserLessonProgress & { lesson_id: string } => p.lesson_id !== null)
      .map((p) => [p.lesson_id, p])
  );

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
        milestoneInfo
      );
    }
  }

  // Find next lesson to study (first non-mastered lesson)
  let nextLesson: LessonForScheduler | null = null;
  const nextLessonData = allLessons.find((lesson) => {
    const progress = progressByLesson.get(lesson.id);
    return !progress || progress.status !== "mastered";
  });

  if (nextLessonData) {
    const [sampleWords, images] = await Promise.all([
      getLessonSampleWords(supabase, [nextLessonData.id]),
      getLessonImages(supabase, [nextLessonData.id]),
    ]);

    const transformed = transformToSchedulerFormat(
      [nextLessonData],
      sampleWords,
      images
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
    gridImages
  );
  const recentLessons = transformToSchedulerFormat(
    recentLessonsData,
    gridSampleWords,
    gridImages
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
