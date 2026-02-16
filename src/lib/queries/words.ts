import { createClient } from "@/lib/supabase/server";
import {
  Course,
  ExampleSentence,
  Language,
  Lesson,
  UserWordProgress,
  Word,
} from "@/types/database";

// Helper function to extract course without nested relations
function extractCourse(course: Course & { languages?: unknown }): Course {
  return {
    id: course.id,
    name: course.name,
    description: course.description,
    language_id: course.language_id,
    legacy_ref: course.legacy_ref,
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

// Helper function to extract lesson without nested relations
function extractLesson(lesson: Lesson & { courses?: unknown }): Lesson {
  return {
    id: lesson.id,
    course_id: lesson.course_id,
    legacy_lesson_id: lesson.legacy_lesson_id,
    number: lesson.number,
    title: lesson.title,
    emoji: lesson.emoji,
    word_count: lesson.word_count,
    is_published: lesson.is_published,
    sort_order: lesson.sort_order,
    created_at: lesson.created_at,
    updated_at: lesson.updated_at,
    created_by: lesson.created_by,
    updated_by: lesson.updated_by,
  };
}

export type WordStatus = "not-started" | "studying" | "mastered";

export interface TestAttempt {
  isCorrect: boolean;
  answeredAt: string;
}

export interface WordWithDetails extends Word {
  /** Sort order within the current lesson (from lesson_words join table) */
  sort_order: number;
  exampleSentences: ExampleSentence[];
  relatedWords: Pick<Word, "id" | "english" | "headword" | "memory_trigger_image_url">[];
  progress: UserWordProgress | null;
  status: WordStatus;
  /** Last 3 test attempts on this word (most recent first) */
  testHistory: TestAttempt[];
}

/** Minimal lesson info for previous/next navigation */
export type AdjacentLesson = Pick<Lesson, "id" | "number" | "title">;

export interface GetWordsResult {
  language: Language | null;
  course: Course | null;
  lesson: Lesson | null;
  words: WordWithDetails[];
  /** Previous lesson in course order; on first lesson, last lesson (loop). Null only if single lesson. */
  previousLesson: AdjacentLesson | null;
  /** Next lesson in course order; on last lesson, first lesson (loop). Null only if single lesson. */
  nextLesson: AdjacentLesson | null;
  stats: {
    totalWords: number;
    wordsStudied: number;
    wordsMastered: number;
    totalTimeSeconds: number;
  };
  isGuest: boolean;
}

export async function getWords(lessonId: string): Promise<GetWordsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch lesson with course and language
  const { data: lesson } = await supabase
    .from("lessons")
    .select("*, courses(*, languages(*))")
    .eq("id", lessonId)
    .single();

  if (!lesson) {
    return {
      language: null,
      course: null,
      lesson: null,
      words: [],
      previousLesson: null,
      nextLesson: null,
      stats: { totalWords: 0, wordsStudied: 0, wordsMastered: 0, totalTimeSeconds: 0 },
      isGuest: !user,
    };
  }

  const course = lesson.courses as Course & { languages: Language };
  const language = course?.languages as Language | null;
  const extractedLesson = extractLesson(lesson);

  // Fetch adjacent lessons (previous/next) in course order
  const { data: courseLessons } = await supabase
    .from("lessons")
    .select("id, number, title")
    .eq("course_id", lesson.course_id)
    .eq("is_published", true)
    .order("sort_order")
    .order("number");
  const orderedLessons = courseLessons ?? [];
  const currentIndex = orderedLessons.findIndex((l) => l.id === lesson.id);
  const hasMultiple = orderedLessons.length > 1;
  // Loop: first lesson → previous = last; last lesson → next = first
  const previousLesson: AdjacentLesson | null =
    currentIndex > 0
      ? orderedLessons[currentIndex - 1]
      : hasMultiple
        ? orderedLessons[orderedLessons.length - 1]
        : null;
  const nextLesson: AdjacentLesson | null =
    currentIndex >= 0 && currentIndex < orderedLessons.length - 1
      ? orderedLessons[currentIndex + 1]
      : hasMultiple
        ? orderedLessons[0]
        : null;

  // Fetch words for this lesson via lesson_words join table
  const { data: lessonWords, error: wordsError } = await supabase
    .from("lesson_words")
    .select("sort_order, words(*, example_sentences(*))")
    .eq("lesson_id", lessonId)
    .order("sort_order");

  if (wordsError) {
    console.error("Error fetching words:", wordsError);
    return {
      language,
      course: course ? extractCourse(course) : null,
      lesson: extractedLesson,
      words: [],
      previousLesson,
      nextLesson,
      stats: { totalWords: 0, wordsStudied: 0, wordsMastered: 0, totalTimeSeconds: 0 },
      isGuest: !user,
    };
  }

  // Extract words from join table results
  const words = lessonWords?.map((lw) => ({
    ...(lw.words as Word & { example_sentences: ExampleSentence[] }),
    sort_order: lw.sort_order,
  })) || [];

  // Collect all related word IDs
  const allRelatedWordIds = new Set<string>();
  words?.forEach((word) => {
    word.related_word_ids?.forEach((id: string) => allRelatedWordIds.add(id));
  });

  // Fetch related words if any
  let relatedWordsMap: Record<string, Pick<Word, "id" | "english" | "headword" | "memory_trigger_image_url">> = {};
  if (allRelatedWordIds.size > 0) {
    const { data: relatedWords } = await supabase
      .from("words")
      .select("id, english, headword, memory_trigger_image_url")
      .in("id", Array.from(allRelatedWordIds));

    relatedWords?.forEach((rw) => {
      relatedWordsMap[rw.id] = rw;
    });
  }

  // Get user's word progress if authenticated
  let progressByWord: Record<string, UserWordProgress> = {};
  let wordsStudied = 0;
  let wordsMastered = 0;

  if (user && words && words.length > 0) {
    const { data: wordProgress } = await supabase
      .from("user_word_progress")
      .select("*")
      .eq("user_id", user.id)
      .in(
        "word_id",
        words.map((w) => w.id)
      );

    wordProgress?.forEach((wp) => {
      const wordId = wp.word_id;
      if (wordId) {
        progressByWord[wordId] = wp;
      }
      if (wp.status === "studying" || wp.status === "mastered") {
        wordsStudied++;
      }
      if (wp.status === "mastered") {
        wordsMastered++;
      }
    });
  }

  // Get lesson progress for total study time (may not exist for new lessons)
  let totalTimeSeconds = 0;
  if (user) {
    const { data: lessonProgress } = await supabase
      .from("user_lesson_progress")
      .select("total_study_time_seconds")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    totalTimeSeconds = lessonProgress?.total_study_time_seconds || 0;
  }

  // Get test history for all words in this lesson (last 3 attempts per word)
  let testHistoryByWord: Record<string, TestAttempt[]> = {};
  if (user && words && words.length > 0) {
    const { data: testQuestions } = await supabase
      .from("test_questions")
      .select("word_id, points_earned, answered_at")
      .in("word_id", words.map((w) => w.id))
      .order("answered_at", { ascending: false });

    // Group by word_id and take last 3
    testQuestions?.forEach((tq) => {
      const wordId = tq.word_id;
      if (!wordId) return;
      if (!testHistoryByWord[wordId]) {
        testHistoryByWord[wordId] = [];
      }
      // Only keep last 3
      if (testHistoryByWord[wordId].length < 3) {
        testHistoryByWord[wordId].push({
          isCorrect: (tq.points_earned ?? 0) > 0,
          answeredAt: tq.answered_at ?? new Date().toISOString(),
        });
      }
    });
  }

  // Combine data
  const wordsWithDetails: WordWithDetails[] = (words || []).map((word) => {
    const progress = progressByWord[word.id];
    const exampleSentences = (word.example_sentences || []) as ExampleSentence[];
    const relatedWords = (word.related_word_ids || [])
      .map((id: string) => relatedWordsMap[id])
      .filter(Boolean);
    const testHistory = testHistoryByWord[word.id] || [];

    return {
      ...word,
      example_sentences: undefined, // Remove nested field
      exampleSentences,
      relatedWords,
      progress: progress || null,
      status: (progress?.status as WordStatus) || "not-started",
      testHistory,
    };
  });

  return {
    language,
    course: course ? extractCourse(course) : null,
    lesson: extractedLesson,
    words: wordsWithDetails,
    previousLesson,
    nextLesson,
    stats: {
      totalWords: words?.length || 0,
      wordsStudied,
      wordsMastered,
      totalTimeSeconds,
    },
    isGuest: !user,
  };
}

/**
 * Get a single word by ID with all details
 */
export async function getWord(wordId: string): Promise<{
  word: WordWithDetails | null;
  language: Language | null;
  isGuest: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch word with example sentences and language
  const { data: word } = await supabase
    .from("words")
    .select("*, example_sentences(*), languages(*)")
    .eq("id", wordId)
    .single();

  if (!word) {
    return { word: null, language: null, isGuest: !user };
  }

  const language = word.languages as Language | null;

  // Fetch related words
  let relatedWords: Pick<Word, "id" | "english" | "headword" | "memory_trigger_image_url">[] = [];
  if (word.related_word_ids && word.related_word_ids.length > 0) {
    const { data: relatedWordsData } = await supabase
      .from("words")
      .select("id, english, headword, memory_trigger_image_url")
      .in("id", word.related_word_ids);

    relatedWords = relatedWordsData || [];
  }

  // Get user's progress for this word
  let progress: UserWordProgress | null = null;
  let testHistory: TestAttempt[] = [];
  if (user) {
    const { data: wordProgress } = await supabase
      .from("user_word_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("word_id", wordId)
      .single();

    progress = wordProgress || null;

    // Get last 3 test attempts for this word
    const { data: testQuestions } = await supabase
      .from("test_questions")
      .select("points_earned, answered_at")
      .eq("word_id", wordId)
      .order("answered_at", { ascending: false })
      .limit(3);

    testHistory = (testQuestions || []).map((tq) => ({
      isCorrect: (tq.points_earned ?? 0) > 0,
      answeredAt: tq.answered_at ?? new Date().toISOString(),
    }));
  }

  // Build word without nested relations
  const wordWithDetails: WordWithDetails = {
    id: word.id,
    language_id: word.language_id,
    headword: word.headword,
    lemma: word.lemma,
    english: word.english,
    alternate_answers: word.alternate_answers,
    part_of_speech: word.part_of_speech,
    gender: word.gender,
    transitivity: word.transitivity,
    is_irregular: word.is_irregular,
    is_plural_only: word.is_plural_only,
    grammatical_number: word.grammatical_number,
    category: word.category,
    phrase_type: word.phrase_type,
    tags: word.tags,
    is_false_friend: word.is_false_friend,
    legacy_refn: word.legacy_refn,
    legacy_gender_code: word.legacy_gender_code,
    legacy_image_suffix: word.legacy_image_suffix,
    notes: word.notes,
    admin_notes: word.admin_notes,
    memory_trigger_text: word.memory_trigger_text,
    memory_trigger_image_url: word.memory_trigger_image_url,
    audio_url_english: word.audio_url_english,
    audio_url_foreign: word.audio_url_foreign,
    audio_url_trigger: word.audio_url_trigger,
    related_word_ids: word.related_word_ids,
    sort_order: 0, // Default; actual sort_order is context-dependent on the lesson
    created_at: word.created_at,
    updated_at: word.updated_at,
    created_by: word.created_by,
    updated_by: word.updated_by,
    exampleSentences: (word.example_sentences || []) as ExampleSentence[],
    relatedWords,
    progress,
    status: (progress?.status as WordStatus) || "not-started",
    testHistory,
  };

  return {
    word: wordWithDetails,
    language,
    isGuest: !user,
  };
}
