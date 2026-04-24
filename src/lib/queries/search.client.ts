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
 * Search words and lessons for a language (client-side).
 * Words are searched language-wide by headword and english (accent-insensitive).
 * Lessons are searched by title within the current course only.
 */
export async function searchCourse(
  query: string,
  courseId: string,
  languageId: string
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

  // Get lesson IDs for this course (for lesson title search - still course-scoped)
  const { data: courseLessons } = await supabase
    .from("lessons")
    .select("id, title, number, emoji")
    .eq("course_id", courseId)
    .eq("is_published", true);

  // Run word and lesson searches in parallel
  const [wordsResult, lessonResults] = await Promise.all([
    // Accent-insensitive word search via RPC (language-wide)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- function not yet in generated types
    (supabase.rpc as any)("search_language_words", {
      p_query: sanitized,
      p_language_id: languageId,
    }),

    // Search lessons by title (client-side filter, scoped to current course)
    Promise.resolve(
      (courseLessons || [])
        .filter((l) => l.title.toLowerCase().includes(sanitized.toLowerCase()))
        .slice(0, 5)
    ),
  ]);

  // Process word results
  const words: SearchWordResult[] = [];
  if (wordsResult.data) {
    for (const row of wordsResult.data) {
      words.push({
        id: row.word_id,
        english: row.english,
        headword: row.headword,
        category: row.category,
        lessonId: row.lesson_id,
        lessonTitle: row.lesson_title,
        lessonNumber: row.lesson_number,
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
