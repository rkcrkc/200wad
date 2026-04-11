import { createClient } from "@/lib/supabase/server";
import { Course, Language } from "@/types/database";

export interface GetCourseByIdResult {
  course: Course | null;
  language: Language | null;
}

/**
 * Get a single course by ID with its language
 */
export async function getCourseById(courseId: string): Promise<GetCourseByIdResult> {
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*, languages(*)")
    .eq("id", courseId)
    .single();

  if (!course) {
    return { course: null, language: null };
  }

  // Extract language from joined data
  const language = course.languages as Language | null;

  // Return course without the nested languages object
  const { languages: _, ...courseWithoutLanguages } = course;

  return {
    course: courseWithoutLanguages as Course,
    language,
  };
}

export interface CourseWithProgress extends Course {
  lessonsCompleted: number;
  totalLessons: number;
  progressPercent: number;
  /** Actual word count from database (overrides static word_count field) */
  actualWordCount: number;
  /** Computed status based on lesson completion */
  status: "not-started" | "learning" | "mastered";
}

export interface GetCoursesResult {
  language: Language | null;
  courses: CourseWithProgress[];
  isGuest: boolean;
}

export async function getCourses(languageId: string): Promise<GetCoursesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch language
  const { data: language } = await supabase
    .from("languages")
    .select("*")
    .eq("id", languageId)
    .single();

  // Fetch published courses for this language
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("*")
    .eq("language_id", languageId)
    .eq("is_published", true)
    .order("sort_order");

  if (coursesError) {
    console.error("Error fetching courses:", coursesError);
    return { language, courses: [], isGuest: !user };
  }

  // Guard: skip lessons query if no courses exist (prevents PostgREST 400 on empty .in())
  if (!courses || courses.length === 0) {
    return { language, courses: [], isGuest: !user };
  }

  // Get lesson counts per course
  const courseIds = courses.map((c) => c.id);
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, course_id, word_count")
    .in("course_id", courseIds);

  const lessonCountByCourse: Record<string, number> = {};
  const lessonIdsByCourse: Record<string, string[]> = {};

  lessons?.forEach((lesson) => {
    if (lesson.course_id) {
      lessonCountByCourse[lesson.course_id] =
        (lessonCountByCourse[lesson.course_id] || 0) + 1;
      if (!lessonIdsByCourse[lesson.course_id]) {
        lessonIdsByCourse[lesson.course_id] = [];
      }
      lessonIdsByCourse[lesson.course_id].push(lesson.id);
    }
  });

  // Sum word counts per course from already-fetched lesson data
  const wordCountByCourse: Record<string, number> = {};
  lessons?.forEach((l) => {
    if (l.course_id) {
      wordCountByCourse[l.course_id] =
        (wordCountByCourse[l.course_id] || 0) + (l.word_count || 0);
    }
  });

  // Get per-course word progress (words-mastered basis) and lesson completion stats
  const lessonsCompletedByCourse: Record<string, number> = {};
  const wordsMasteredByCourse: Record<string, number> = {};
  const wordsStudiedByCourse: Record<string, number> = {};

  if (user && lessons && lessons.length > 0) {
    const lessonIds = lessons.map((l) => l.id);
    const lessonIdToCourse: Record<string, string> = {};
    lessons.forEach((l) => {
      if (l.course_id) lessonIdToCourse[l.id] = l.course_id;
    });

    const [lessonProgressResult, lessonWordsResult, userProgressResult] = await Promise.all([
      // Lesson-level mastered counts (for the lessonsCompleted field, kept for UI consumers)
      supabase
        .from("user_lesson_progress")
        .select("lesson_id, status")
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds)
        .eq("status", "mastered"),
      // Full lesson → word map so we can bucket user progress by course
      supabase
        .from("lesson_words")
        .select("lesson_id, word_id")
        .in("lesson_id", lessonIds),
      // All of this user's progress on any word — we intersect client-side
      supabase
        .from("user_word_progress")
        .select("word_id, status")
        .eq("user_id", user.id)
        .in("status", ["learning", "mastered"]),
    ]);

    // lessonsCompleted per course
    lessonProgressResult.data?.forEach((lp) => {
      if (!lp.lesson_id) return;
      const courseId = lessonIdToCourse[lp.lesson_id];
      if (courseId) {
        lessonsCompletedByCourse[courseId] = (lessonsCompletedByCourse[courseId] || 0) + 1;
      }
    });

    // Build courseId → Set<wordId>
    const courseWordSets: Record<string, Set<string>> = {};
    lessonWordsResult.data?.forEach((lw) => {
      const courseId = lessonIdToCourse[lw.lesson_id];
      if (courseId && lw.word_id) {
        if (!courseWordSets[courseId]) courseWordSets[courseId] = new Set();
        courseWordSets[courseId].add(lw.word_id);
      }
    });

    // Bucket word progress into courses
    const progressByWord = new Map<string, string>();
    userProgressResult.data?.forEach((p) => {
      if (p.word_id && p.status) progressByWord.set(p.word_id, p.status);
    });

    for (const [courseId, wordSet] of Object.entries(courseWordSets)) {
      let mastered = 0;
      let studied = 0;
      for (const wordId of wordSet) {
        const status = progressByWord.get(wordId);
        if (status === "mastered") {
          mastered++;
          studied++;
        } else if (status === "learning") {
          studied++;
        }
      }
      wordsMasteredByCourse[courseId] = mastered;
      wordsStudiedByCourse[courseId] = studied;
    }
  }

  // Combine data
  const coursesWithProgress: CourseWithProgress[] = (courses || []).map(
    (course) => {
      const totalLessons = lessonCountByCourse[course.id] || course.total_lessons || 0;
      const lessonsCompleted = lessonsCompletedByCourse[course.id] || 0;
      const actualWordCount = wordCountByCourse[course.id] || 0;
      const wordsMastered = wordsMasteredByCourse[course.id] || 0;
      const wordsStudied = wordsStudiedByCourse[course.id] || 0;

      // Course progress is always word-based: wordsMastered / totalWords
      const progressPercent =
        actualWordCount > 0
          ? Math.round((wordsMastered / actualWordCount) * 100)
          : 0;

      // Status derived from word progress to stay consistent with the percentage
      const status: "not-started" | "learning" | "mastered" =
        actualWordCount > 0 && wordsMastered >= actualWordCount
          ? "mastered"
          : wordsStudied > 0
            ? "learning"
            : "not-started";

      return {
        ...course,
        totalLessons,
        lessonsCompleted,
        progressPercent,
        actualWordCount,
        status,
      };
    }
  );

  return {
    language,
    courses: coursesWithProgress,
    isGuest: !user,
  };
}
