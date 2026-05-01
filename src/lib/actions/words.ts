"use server";

import { getWord } from "@/lib/queries/words";
import { createClient } from "@/lib/supabase/server";
import { canAccessLesson } from "@/lib/utils/accessControl";
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
 * Determine whether the memory trigger for this word should be locked for the
 * current user. A word is considered locked when every lesson that contains it
 * is locked for the user (i.e. neither in the free range nor covered by an
 * active subscription). If any lesson is accessible, the trigger is unlocked.
 */
async function isWordTriggerLocked(wordId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("lesson_words")
    .select(
      "lessons(number, courses(id, language_id, free_lessons))"
    )
    .eq("word_id", wordId);

  type Row = {
    lessons: {
      number: number | null;
      courses: {
        id: string;
        language_id: string | null;
        free_lessons: number | null;
      } | null;
    } | null;
  };

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return false;

  for (const row of rows) {
    const lesson = row.lessons;
    if (!lesson || lesson.number === null || !lesson.courses) continue;
    const access = await canAccessLesson(
      user?.id ?? null,
      { lessonNumber: lesson.number },
      lesson.courses
    );
    if (access.hasAccess) return false;
  }

  return true;
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
  isLocked: boolean;
}> {
  const { word } = await getWord(wordId);
  if (!word) {
    return {
      word: null,
      lessonId: null,
      lessonTitle: "",
      lessonNumber: 0,
      lessons: [],
      isLocked: false,
    };
  }

  const [lessons, isLocked] = await Promise.all([
    fetchWordLessons(wordId),
    isWordTriggerLocked(wordId),
  ]);
  const primary = lessons[0] ?? null;

  return {
    word,
    lessonId: primary?.id ?? null,
    lessonTitle: primary?.title ?? "",
    lessonNumber: primary?.number ?? 0,
    lessons,
    isLocked,
  };
}
