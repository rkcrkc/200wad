import { createClient } from "@/lib/supabase/server";

export interface UserLearningStats {
  /** Total words studied across all sessions */
  totalWordsStudied: number;
  /** Total time spent studying in seconds */
  totalTimeSeconds: number;
  /** Calculated words per 8-hour day rate */
  wordsPerDay: number;
}

/**
 * Get user learning stats from study sessions
 * Words per day is calculated as: (total_words_studied / total_time_hours) * 8
 */
export async function getUserLearningStats(): Promise<UserLearningStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalWordsStudied: 0,
      totalTimeSeconds: 0,
      wordsPerDay: 0,
    };
  }

  // Query study_sessions for current user
  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("words_studied, duration_seconds")
    .eq("user_id", user.id);

  if (!sessions || sessions.length === 0) {
    return {
      totalWordsStudied: 0,
      totalTimeSeconds: 0,
      wordsPerDay: 0,
    };
  }

  const totalWordsStudied = sessions.reduce(
    (sum, s) => sum + (s.words_studied || 0),
    0
  );
  const totalTimeSeconds = sessions.reduce(
    (sum, s) => sum + (s.duration_seconds || 0),
    0
  );
  const totalHours = totalTimeSeconds / 3600;

  // Calculate words per 8-hour day
  const wordsPerDay =
    totalHours > 0 ? Math.round((totalWordsStudied / totalHours) * 8) : 0;

  return {
    totalWordsStudied,
    totalTimeSeconds,
    wordsPerDay,
  };
}

export interface CourseProgressStats {
  /** Number of lessons completed (mastered) */
  lessonsCompleted: number;
  /** Total lessons in the course */
  totalLessons: number;
  /** Progress percentage (0-100) */
  progressPercent: number;
}

/**
 * Get progress stats for a specific course
 */
export async function getCourseProgress(
  courseId: string
): Promise<CourseProgressStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get total lessons for the course
  const { count: totalLessons } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  if (!totalLessons || totalLessons === 0) {
    return {
      lessonsCompleted: 0,
      totalLessons: 0,
      progressPercent: 0,
    };
  }

  if (!user) {
    return {
      lessonsCompleted: 0,
      totalLessons,
      progressPercent: 0,
    };
  }

  // Get lesson IDs for this course
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId);

  if (!lessons || lessons.length === 0) {
    return {
      lessonsCompleted: 0,
      totalLessons,
      progressPercent: 0,
    };
  }

  const lessonIds = lessons.map((l) => l.id);

  // Count mastered lessons
  const { count: lessonsCompleted } = await supabase
    .from("user_lesson_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("lesson_id", lessonIds)
    .eq("status", "mastered");

  const completed = lessonsCompleted || 0;
  const progressPercent = Math.round((completed / totalLessons) * 100);

  return {
    lessonsCompleted: completed,
    totalLessons,
    progressPercent,
  };
}
