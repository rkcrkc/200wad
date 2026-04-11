"use server";

import { createClient } from "@/lib/supabase/server";
import { getCourses } from "@/lib/queries/courses";

export interface DropdownCourse {
  id: string;
  name: string;
  level: string | null;
  cefr_range: string | null;
  progressPercent: number;
  status: "not-started" | "learning" | "mastered";
}

export async function getCoursesForDropdown(
  languageId: string
): Promise<{ courses: DropdownCourse[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { courses } = await getCourses(languageId);

  if (!user || courses.length === 0) {
    return {
      courses: courses.map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        cefr_range: c.cefr_range,
        progressPercent: c.progressPercent,
        status: c.status,
      })),
    };
  }

  // Compute word-based progress per course (matches header stat logic)
  const courseIds = courses.map((c) => c.id);

  // Get all lesson IDs grouped by course
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, course_id")
    .in("course_id", courseIds);

  if (!lessons || lessons.length === 0) {
    return {
      courses: courses.map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        cefr_range: c.cefr_range,
        progressPercent: 0,
        status: c.status,
      })),
    };
  }

  const lessonIds = lessons.map((l) => l.id);

  // Fetch lesson_words and user mastered words in parallel
  const [lessonWordsResult, userProgressResult] = await Promise.all([
    supabase
      .from("lesson_words")
      .select("lesson_id, word_id")
      .in("lesson_id", lessonIds)
      .limit(10000),
    supabase
      .from("user_word_progress")
      .select("word_id")
      .eq("user_id", user.id)
      .eq("status", "mastered"),
  ]);

  // Build per-course word sets
  const wordsByCourse: Record<string, Set<string>> = {};
  const lessonToCourse: Record<string, string> = {};
  for (const l of lessons) {
    if (l.course_id) lessonToCourse[l.id] = l.course_id;
  }
  for (const lw of lessonWordsResult.data || []) {
    if (!lw.word_id || !lw.lesson_id) continue;
    const cId = lessonToCourse[lw.lesson_id];
    if (!cId) continue;
    if (!wordsByCourse[cId]) wordsByCourse[cId] = new Set();
    wordsByCourse[cId].add(lw.word_id);
  }

  // Build mastered word set
  const masteredWords = new Set(
    (userProgressResult.data || [])
      .map((p) => p.word_id)
      .filter((id): id is string => id !== null)
  );

  return {
    courses: courses.map((c) => {
      const courseWords = wordsByCourse[c.id];
      const totalWords = courseWords ? courseWords.size : 0;
      const wordsMastered = courseWords
        ? [...courseWords].filter((wId) => masteredWords.has(wId)).length
        : 0;
      const progressPercent =
        totalWords > 0 ? Math.round((wordsMastered / totalWords) * 100) : 0;

      return {
        id: c.id,
        name: c.name,
        level: c.level,
        cefr_range: c.cefr_range,
        progressPercent,
        status: c.status,
      };
    }),
  };
}
