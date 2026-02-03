import { createClient } from "@/lib/supabase/server";
import { Course, Language, Lesson, UserLessonProgress } from "@/types/database";

// Helper function to extract course without nested relations
function extractCourse(course: Course & { languages?: unknown }): Course {
  return {
    id: course.id,
    name: course.name,
    description: course.description,
    language_id: course.language_id,
    level: course.level,
    cefr_range: course.cefr_range,
    total_lessons: course.total_lessons,
    word_count: course.word_count,
    price_cents: course.price_cents,
    free_lessons: course.free_lessons,
    is_published: course.is_published,
    sort_order: course.sort_order,
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
  /** Total due words count for this lesson (only for tests) */
  dueWordsCount?: number;
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

  // Get user info
  const { data: userData } = await supabase
    .from("users")
    .select("name, current_language_id")
    .eq("id", user.id)
    .single();

  // Get user's current language from user_languages
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

  // Use lesson_words join table to get words per lesson
  const { data: lessonWords } = await supabase
    .from("lesson_words")
    .select("lesson_id, words(translation)")
    .in("lesson_id", lessonIds)
    .order("sort_order");

  const samplesByLesson: Record<string, string[]> = {};
  lessonWords?.forEach((lw) => {
    const lessonId = lw.lesson_id;
    if (!lessonId) return;
    if (!samplesByLesson[lessonId]) {
      samplesByLesson[lessonId] = [];
    }
    // Limit to 10 sample words per lesson
    if (samplesByLesson[lessonId].length < 10 && lw.words) {
      samplesByLesson[lessonId].push((lw.words as { english: string }).english);
    }
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
  dueWordsCounts?: Record<string, number>
): LessonForScheduler[] {
  return lessons.map((lesson) => ({
    ...lesson,
    sampleWords: sampleWords[lesson.id] || [],
    imageUrl: images[lesson.id] || null,
    dueWordsCount: dueWordsCounts?.[lesson.id],
  }));
}

// ============================================================================
// Main Query Functions
// ============================================================================

/**
 * Get the count of lessons with due tests (for sidebar badge)
 */
export async function getDueTestsCount(courseId?: string): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  // Get lesson IDs for the course if specified
  let lessonFilter: string[] | null = null;
  if (courseId) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id")
      .eq("course_id", courseId);
    lessonFilter = lessons?.map((l) => l.id) || [];
    if (lessonFilter.length === 0) return 0;
  }

  // Count distinct lessons with due words (only mastered words count as due for review)
  const now = new Date().toISOString();

  const { data: dueProgress } = await supabase
    .from("user_word_progress")
    .select("word_id")
    .eq("user_id", user.id)
    .eq("status", "mastered")
    .lte("next_review_at", now)
    .limit(500); // Limit for performance

  if (!dueProgress || dueProgress.length === 0) return 0;

  // Get lesson IDs for these words
  const validWordIds = dueProgress
    .map((p) => p.word_id)
    .filter((id): id is string => id !== null);
  
  if (validWordIds.length === 0) return 0;

  const { data: words } = await supabase
    .from("words")
    .select("lesson_id")
    .in("id", validWordIds);

  if (!words) return 0;

  // Filter by course if specified
  const lessonIds = new Set<string>(
    words.map((w) => w.lesson_id).filter((id): id is string => id !== null)
  );
  if (lessonFilter) {
    const filtered = Array.from(lessonIds).filter((id) =>
      lessonFilter!.includes(id)
    );
    return filtered.length;
  }

  return lessonIds.size;
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

  // Get due tests - lessons with mastered words where next_review_at <= now
  const now = new Date().toISOString();
  const { data: dueWordProgress } = await supabase
    .from("user_word_progress")
    .select("word_id")
    .eq("user_id", user.id)
    .eq("status", "mastered")
    .lte("next_review_at", now)
    .limit(500); // Limit for performance

  let dueTests: LessonForScheduler[] = [];
  let dueTestsCount = 0;
  const dueWordsByLesson: Record<string, number> = {};

  if (dueWordProgress && dueWordProgress.length > 0) {
    // Get lesson IDs for due words
    const validDueWordIds = dueWordProgress
      .map((p) => p.word_id)
      .filter((id): id is string => id !== null);
    
    const { data: dueWords } = validDueWordIds.length > 0 
      ? await supabase
        .from("words")
        .select("id, lesson_id")
        .in("id", validDueWordIds)
      : { data: null };

    if (dueWords) {
      // Count due words per lesson and filter to current course
      const dueLessonIds = new Set<string>();
      dueWords.forEach((w) => {
        const wLessonId = w.lesson_id;
        if (wLessonId && lessonIds.includes(wLessonId)) {
          dueLessonIds.add(wLessonId);
          dueWordsByLesson[wLessonId] =
            (dueWordsByLesson[wLessonId] || 0) + 1;
        }
      });

      dueTestsCount = dueLessonIds.size;

      // Get full lesson data for due lessons
      const dueLessons = allLessons.filter((l) => dueLessonIds.has(l.id));

      if (dueLessons.length > 0) {
        const dueLessonIds = dueLessons.map((l) => l.id);
        const [sampleWords, images] = await Promise.all([
          getLessonSampleWords(supabase, dueLessonIds),
          getLessonImages(supabase, dueLessonIds),
        ]);

        dueTests = transformToSchedulerFormat(
          dueLessons,
          sampleWords,
          images,
          dueWordsByLesson
        );
      }
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
