import { createClient } from "@/lib/supabase/server";
import { Course, Language, Lesson, UserLessonProgress } from "@/types/database";

export type LessonStatus = "not-started" | "studying" | "mastered";

export interface LessonWithProgress extends Lesson {
  status: LessonStatus;
  completionPercent: number;
  wordsMastered: number;
  totalStudyTimeSeconds: number;
  lastStudiedAt: string | null;
}

export interface GetLessonsResult {
  language: Language | null;
  course: Course | null;
  lessons: LessonWithProgress[];
  stats: {
    totalWords: number;
    totalTimeSeconds: number;
    wordsStudied: number;
    wordsMastered: number;
  };
  isGuest: boolean;
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
      price_cents: course.price_cents,
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
      stats: { totalWords: 0, totalTimeSeconds: 0, wordsStudied: 0, wordsMastered: 0 },
      isGuest: !user,
    };
  }

  // Get user's lesson progress if authenticated
  let progressByLesson: Record<string, UserLessonProgress> = {};
  let totalTimeSeconds = 0;
  let wordsMastered = 0;
  let wordsStudied = 0;

  if (user && lessons && lessons.length > 0) {
    const lessonIds = lessons.map((l) => l.id);

    const { data: lessonProgress } = await supabase
      .from("user_lesson_progress")
      .select("*")
      .eq("user_id", user.id)
      .in("lesson_id", lessonIds);

    lessonProgress?.forEach((lp) => {
      if (lp.lesson_id) {
        progressByLesson[lp.lesson_id] = lp;
      }
      totalTimeSeconds += lp.total_study_time_seconds || 0;
      wordsMastered += lp.words_mastered || 0;
    });

    // Get word IDs for this course's lessons via lesson_words
    const { data: lessonWords } = await supabase
      .from("lesson_words")
      .select("word_id")
      .in("lesson_id", lessonIds);

    if (lessonWords && lessonWords.length > 0) {
      const wordIds = lessonWords.map((lw) => lw.word_id).filter((id): id is string => id !== null);

      // Count words with any progress (studying or mastered)
      const { count } = await supabase
        .from("user_word_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("word_id", wordIds)
        .in("status", ["studying", "mastered"]);

      wordsStudied = count || 0;
    }
  }

  // Calculate total words
  const totalWords = lessons?.reduce((sum, l) => sum + (l.word_count || 0), 0) || 0;

  // Combine data
  const lessonsWithProgress: LessonWithProgress[] = (lessons || []).map(
    (lesson) => {
      const progress = progressByLesson[lesson.id];

      return {
        ...lesson,
        status: (progress?.status as LessonStatus) || "not-started",
        completionPercent: progress?.completion_percent || 0,
        wordsMastered: progress?.words_mastered || 0,
        totalStudyTimeSeconds: progress?.total_study_time_seconds || 0,
        lastStudiedAt: progress?.last_studied_at || null,
      };
    }
  );

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
    price_cents: course.price_cents,
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
    lessons: lessonsWithProgress,
    stats: {
      totalWords,
      totalTimeSeconds,
      wordsStudied,
      wordsMastered,
    },
    isGuest: !user,
  };
}
