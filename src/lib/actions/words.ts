"use server";

import { getWord } from "@/lib/queries/words";
import { createClient } from "@/lib/supabase/server";
import type { AdjacentLesson, WordWithDetails } from "@/lib/queries/words";

export async function fetchWordDetails(
  wordId: string
): Promise<{ word: WordWithDetails | null }> {
  const { word } = await getWord(wordId);
  return { word };
}

/**
 * Fetches every lesson that contains this word, ordered by lesson number ASC.
 * Used by the word-preview sidebar header chip (lowest-numbered lesson) and
 * by the optional "Lessons" tab (full list when the word is in 2+ lessons).
 */
export async function fetchWordLessons(
  wordId: string
): Promise<AdjacentLesson[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lesson_words")
    .select("lessons(id, title, number)")
    .eq("word_id", wordId);

  const rows = (data ?? []) as Array<{
    lessons: { id: string | null; title: string | null; number: number | null } | null;
  }>;

  return rows
    .map((r) => r.lessons)
    .filter(
      (l): l is { id: string; title: string; number: number } =>
        !!l && l.id !== null && l.number !== null
    )
    .map((l) => ({ id: l.id, number: l.number, title: l.title ?? "" }))
    .sort((a, b) => a.number - b.number);
}

/**
 * Fetches a word plus all lessons that contain it (ordered by lesson number).
 * The first lesson is exposed as the convenience `lessonId/lessonTitle/lessonNumber`
 * for the sidebar header chip.
 */
export async function fetchWordPreview(wordId: string): Promise<{
  word: WordWithDetails | null;
  lessonId: string | null;
  lessonTitle: string;
  lessonNumber: number;
  lessons: AdjacentLesson[];
}> {
  const { word } = await getWord(wordId);
  if (!word) {
    return {
      word: null,
      lessonId: null,
      lessonTitle: "",
      lessonNumber: 0,
      lessons: [],
    };
  }

  const lessons = await fetchWordLessons(wordId);
  const primary = lessons[0] ?? null;

  return {
    word,
    lessonId: primary?.id ?? null,
    lessonTitle: primary?.title ?? "",
    lessonNumber: primary?.number ?? 0,
    lessons,
  };
}
