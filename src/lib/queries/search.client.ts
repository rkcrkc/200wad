"use client";

import { createClient } from "@/lib/supabase/client";

// ============================================================================
// Types
// ============================================================================

export interface SearchWordResult {
  id: string;
  english: string;
  headword: string;
  category: string | null;
  lessonId: string;
  lessonTitle: string;
  lessonNumber: number;
}

export interface SearchLessonResult {
  id: string;
  title: string;
  number: number;
  emoji: string | null;
}

export interface SearchResults {
  words: SearchWordResult[];
  lessons: SearchLessonResult[];
}

// ============================================================================
// Search Query
// ============================================================================

/**
 * Search words and lessons within a course (client-side).
 * Words are searched by headword and english fields.
 * Lessons are searched by title.
 */
export async function searchCourse(
  query: string,
  courseId: string
): Promise<SearchResults> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { words: [], lessons: [] };
  }

  // Sanitize LIKE wildcards to prevent injection
  const sanitized = trimmed.replace(/[%_]/g, "");
  if (!sanitized) {
    return { words: [], lessons: [] };
  }

  const supabase = createClient();

  // Get lesson IDs for this course first
  const { data: courseLessons } = await supabase
    .from("lessons")
    .select("id, title, number, emoji")
    .eq("course_id", courseId)
    .eq("is_published", true);

  if (!courseLessons || courseLessons.length === 0) {
    return { words: [], lessons: [] };
  }

  const lessonIds = courseLessons.map((l) => l.id);

  // Run word and lesson searches in parallel
  const pattern = `%${sanitized}%`;

  const [wordsResult, lessonResults] = await Promise.all([
    // Search words via lesson_words junction to scope to course
    supabase
      .from("lesson_words")
      .select(`
        lesson_id,
        words!inner(id, english, headword, category),
        lessons!inner(id, title, number)
      `)
      .in("lesson_id", lessonIds)
      .or(
        `english.ilike.${pattern},headword.ilike.${pattern}`,
        { referencedTable: "words" }
      )
      .limit(20),

    // Search lessons by title
    Promise.resolve(
      courseLessons
        .filter((l) => l.title.toLowerCase().includes(sanitized.toLowerCase()))
        .slice(0, 5)
    ),
  ]);

  // Process word results - deduplicate by word ID
  const seenWordIds = new Set<string>();
  const words: SearchWordResult[] = [];

  if (wordsResult.data) {
    for (const row of wordsResult.data) {
      const word = row.words as unknown as {
        id: string;
        english: string;
        headword: string;
        category: string | null;
      };
      if (!word || seenWordIds.has(word.id)) continue;
      seenWordIds.add(word.id);

      const lesson = row.lessons as unknown as {
        id: string;
        title: string;
        number: number;
      };

      words.push({
        id: word.id,
        english: word.english,
        headword: word.headword,
        category: word.category,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonNumber: lesson.number,
      });
    }
  }

  // Process lesson results
  const lessons: SearchLessonResult[] = lessonResults.map((l) => ({
    id: l.id,
    title: l.title,
    number: l.number,
    emoji: l.emoji,
  }));

  return { words, lessons };
}
