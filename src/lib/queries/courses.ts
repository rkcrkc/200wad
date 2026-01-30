import { createClient } from "@/lib/supabase/server";
import { Course, Language } from "@/types/database";

export interface CourseWithProgress extends Course {
  lessonsCompleted: number;
  totalLessons: number;
  progressPercent: number;
  /** Actual word count from database (overrides static word_count field) */
  actualWordCount: number;
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

  // Fetch courses for this language
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("*")
    .eq("language_id", languageId)
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
    .select("id, course_id")
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

  // Count actual words per course (via words -> lessons)
  const allLessonIds = lessons?.map((l) => l.id) || [];
  let wordCountByCourse: Record<string, number> = {};

  if (allLessonIds.length > 0) {
    const { data: words } = await supabase
      .from("words")
      .select("id, lesson_id")
      .in("lesson_id", allLessonIds);

    words?.forEach((word) => {
      // Find which course this lesson belongs to
      const lesson = lessons?.find((l) => l.id === word.lesson_id);
      if (lesson?.course_id) {
        wordCountByCourse[lesson.course_id] =
          (wordCountByCourse[lesson.course_id] || 0) + 1;
      }
    });
  }

  // Get user's lesson progress if authenticated
  let lessonsCompletedByCourse: Record<string, number> = {};

  if (user && lessons && lessons.length > 0) {
    const { data: lessonProgress } = await supabase
      .from("user_lesson_progress")
      .select("lesson_id, status")
      .eq("user_id", user.id)
      .in(
        "lesson_id",
        lessons.map((l) => l.id)
      )
      .eq("status", "mastered");

    // Map lesson IDs back to courses
    lessonProgress?.forEach((lp) => {
      const lesson = lessons.find((l) => l.id === lp.lesson_id);
      if (lesson?.course_id) {
        lessonsCompletedByCourse[lesson.course_id] =
          (lessonsCompletedByCourse[lesson.course_id] || 0) + 1;
      }
    });
  }

  // Combine data
  const coursesWithProgress: CourseWithProgress[] = (courses || []).map(
    (course) => {
      const totalLessons = lessonCountByCourse[course.id] || course.total_lessons || 0;
      const lessonsCompleted = lessonsCompletedByCourse[course.id] || 0;
      const actualWordCount = wordCountByCourse[course.id] || 0;

      return {
        ...course,
        totalLessons,
        lessonsCompleted,
        progressPercent:
          totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0,
        actualWordCount,
      };
    }
  );

  return {
    language,
    courses: coursesWithProgress,
    isGuest: !user,
  };
}
