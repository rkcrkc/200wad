import { createClient } from "@/lib/supabase/server";
import {
  Course,
  ExampleSentence,
  Language,
  Lesson,
  UserWordProgress,
  Word,
} from "@/types/database";
import { isAutoLesson, parseAutoLessonId, AutoLessonType } from "./lessons";

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
    price_override_cents: course.price_override_cents,
    free_lessons: course.free_lessons,
    is_published: course.is_published,
    sort_order: course.sort_order,
    thumbnail_url: course.thumbnail_url,
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

export type WordStatus = "not-started" | "learning" | "mastered";

export interface TestAttempt {
  pointsEarned: number;
  maxPoints: number;
  answeredAt: string;
}

export interface WordScoreStats {
  /** Total points earned across all test attempts */
  totalPointsEarned: number;
  /** Total max points available across all test attempts */
  totalMaxPoints: number;
  /** Historical score as percentage (0-100) */
  scorePercent: number;
}

export interface WordWithDetails extends Word {
  /** Sort order within the current lesson (from lesson_words join table) */
  sort_order: number;
  exampleSentences: ExampleSentence[];
  relatedWords: Pick<Word, "id" | "english" | "headword" | "memory_trigger_image_url">[];
  progress: UserWordProgress | null;
  status: WordStatus;
  /** Last 3 test attempts on this word (most recent first) - "traffic lights" */
  testHistory: TestAttempt[];
  /** Historical score stats across all test attempts */
  scoreStats: WordScoreStats;
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
  /** All lessons in the same course (for lesson selector). */
  courseLessons: AdjacentLesson[];
  stats: {
    totalWords: number;
    wordsStudied: number;
    wordsMastered: number;
    totalTimeSeconds: number;
    studyTimeSeconds: number;
    testTimeSeconds: number;
    averageTestScore: number | null;
  };
  isGuest: boolean;
  userId: string | null;
}

export async function getWords(lessonId: string): Promise<GetWordsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if this is an auto-lesson
  if (isAutoLesson(lessonId)) {
    return getAutoLessonWords(supabase, lessonId, user?.id || null);
  }

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
      courseLessons: [],
      stats: { totalWords: 0, wordsStudied: 0, wordsMastered: 0, totalTimeSeconds: 0, studyTimeSeconds: 0, testTimeSeconds: 0, averageTestScore: null },
      isGuest: !user,
      userId: user?.id ?? null,
    };
  }

  const course = lesson.courses as Course & { languages: Language };
  const language = course?.languages as Language | null;
  const extractedLesson = extractLesson(lesson);

  // Fetch adjacent lessons (previous/next) in course order
  const { data: courseLessons } = lesson.course_id
    ? await supabase
        .from("lessons")
        .select("id, number, title")
        .eq("course_id", lesson.course_id)
        .eq("is_published", true)
        .order("sort_order")
        .order("number")
    : { data: null };
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
      courseLessons: orderedLessons,
      stats: { totalWords: 0, wordsStudied: 0, wordsMastered: 0, totalTimeSeconds: 0, studyTimeSeconds: 0, testTimeSeconds: 0, averageTestScore: null },
      isGuest: !user,
      userId: user?.id ?? null,
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
      if (wp.status === "learning" || wp.status === "mastered") {
        wordsStudied++;
      }
      if (wp.status === "mastered") {
        wordsMastered++;
      }
    });
  }

  // Get study time from study_sessions and test time from test_scores
  let totalTimeSeconds = 0;
  let studyTimeSeconds = 0;
  let testTimeSeconds = 0;
  let averageTestScore: number | null = null;
  if (user) {
    const [studySessionsResult, testScoresResult] = await Promise.all([
      supabase
        .from("study_sessions")
        .select("duration_seconds")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId),
      supabase
        .from("user_test_scores")
        .select("duration_seconds, score_percent")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId),
    ]);

    studyTimeSeconds = (studySessionsResult.data || []).reduce(
      (sum, ss) => sum + (ss.duration_seconds || 0),
      0
    );
    const testScores = testScoresResult.data || [];
    testTimeSeconds = testScores.reduce(
      (sum, ts) => sum + (ts.duration_seconds || 0),
      0
    );
    totalTimeSeconds = studyTimeSeconds + testTimeSeconds;

    // Calculate average test score
    if (testScores.length > 0) {
      const totalScore = testScores.reduce((sum, ts) => sum + (ts.score_percent || 0), 0);
      averageTestScore = Math.round(totalScore / testScores.length);
    }
  }

  // Get test history for all words in this lesson
  // - Last 3 attempts for "traffic lights" display
  // - Total points for historical score percentage
  let testHistoryByWord: Record<string, TestAttempt[]> = {};
  let scoreStatsByWord: Record<string, WordScoreStats> = {};

  if (user && words && words.length > 0) {
    const { data: testQuestions } = await supabase
      .from("test_questions")
      .select("word_id, points_earned, max_points, answered_at")
      .in("word_id", words.map((w) => w.id))
      .order("answered_at", { ascending: false });

    // Process all test questions
    testQuestions?.forEach((tq) => {
      const wordId = tq.word_id;
      if (!wordId) return;

      const pointsEarned = tq.points_earned ?? 0;
      const maxPoints = tq.max_points ?? 3;

      // Initialize structures if needed
      if (!testHistoryByWord[wordId]) {
        testHistoryByWord[wordId] = [];
      }
      if (!scoreStatsByWord[wordId]) {
        scoreStatsByWord[wordId] = { totalPointsEarned: 0, totalMaxPoints: 0, scorePercent: 0 };
      }

      // Accumulate total points for historical score
      scoreStatsByWord[wordId].totalPointsEarned += pointsEarned;
      scoreStatsByWord[wordId].totalMaxPoints += maxPoints;

      // Keep last 3 attempts for traffic lights
      if (testHistoryByWord[wordId].length < 3) {
        testHistoryByWord[wordId].push({
          pointsEarned,
          maxPoints,
          answeredAt: tq.answered_at ?? new Date().toISOString(),
        });
      }
    });

    // Calculate score percentages
    Object.keys(scoreStatsByWord).forEach((wordId) => {
      const stats = scoreStatsByWord[wordId];
      stats.scorePercent = stats.totalMaxPoints > 0
        ? Math.round((stats.totalPointsEarned / stats.totalMaxPoints) * 100)
        : 0;
    });
  }

  // Default score stats for words with no test history
  const defaultScoreStats: WordScoreStats = {
    totalPointsEarned: 0,
    totalMaxPoints: 0,
    scorePercent: 0,
  };

  // Combine data
  const wordsWithDetails: WordWithDetails[] = (words || []).map((word) => {
    const progress = progressByWord[word.id];
    const exampleSentences = (word.example_sentences || []) as ExampleSentence[];
    const relatedWords = (word.related_word_ids || [])
      .map((id: string) => relatedWordsMap[id])
      .filter(Boolean);
    const testHistory = testHistoryByWord[word.id] || [];
    const scoreStats = scoreStatsByWord[word.id] || defaultScoreStats;

    return {
      ...word,
      sort_order: word.sort_order ?? 0,
      example_sentences: undefined, // Remove nested field
      exampleSentences,
      relatedWords,
      progress: progress || null,
      status: (progress?.status as WordStatus) || "not-started",
      testHistory,
      scoreStats,
    };
  });

  return {
    language,
    course: course ? extractCourse(course) : null,
    lesson: extractedLesson,
    words: wordsWithDetails,
    previousLesson,
    nextLesson,
    courseLessons: orderedLessons,
    stats: {
      totalWords: words?.length || 0,
      wordsStudied,
      wordsMastered,
      totalTimeSeconds,
      studyTimeSeconds,
      testTimeSeconds,
      averageTestScore,
    },
    isGuest: !user,
    userId: user?.id ?? null,
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
  let scoreStats: WordScoreStats = { totalPointsEarned: 0, totalMaxPoints: 0, scorePercent: 0 };

  if (user) {
    const { data: wordProgress } = await supabase
      .from("user_word_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("word_id", wordId)
      .single();

    progress = wordProgress || null;

    // Get ALL test attempts for this word to calculate historical score
    const { data: testQuestions } = await supabase
      .from("test_questions")
      .select("points_earned, max_points, answered_at")
      .eq("word_id", wordId)
      .order("answered_at", { ascending: false });

    // Calculate totals and build traffic lights (last 3 attempts)
    let totalPointsEarned = 0;
    let totalMaxPoints = 0;

    (testQuestions || []).forEach((tq, index) => {
      const pointsEarned = tq.points_earned ?? 0;
      const maxPoints = tq.max_points ?? 3;

      totalPointsEarned += pointsEarned;
      totalMaxPoints += maxPoints;

      // Keep last 3 for traffic lights
      if (index < 3) {
        testHistory.push({
          pointsEarned,
          maxPoints,
          answeredAt: tq.answered_at ?? new Date().toISOString(),
        });
      }
    });

    scoreStats = {
      totalPointsEarned,
      totalMaxPoints,
      scorePercent: totalMaxPoints > 0 ? Math.round((totalPointsEarned / totalMaxPoints) * 100) : 0,
    };
  }

  // Build word without nested relations
  const wordWithDetails: WordWithDetails = {
    id: word.id,
    language_id: word.language_id,
    headword: word.headword,
    lemma: word.lemma,
    english: word.english,
    alternate_answers: word.alternate_answers,
    alternate_english_answers: word.alternate_english_answers,
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
    developer_notes: word.developer_notes,
    picture_wrong: word.picture_wrong,
    picture_wrong_notes: word.picture_wrong_notes,
    picture_missing: word.picture_missing,
    picture_bad_svg: word.picture_bad_svg,
    memory_trigger_text: word.memory_trigger_text,
    memory_trigger_image_url: word.memory_trigger_image_url,
    flashcard_image_url: word.flashcard_image_url,
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
    scoreStats,
  };

  return {
    word: wordWithDetails,
    language,
    isGuest: !user,
  };
}

/**
 * Get words for an auto-lesson (My Notes, Best Words, Worst Words)
 */
async function getAutoLessonWords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lessonId: string,
  userId: string | null
): Promise<GetWordsResult> {
  const parsed = parseAutoLessonId(lessonId);

  if (!parsed || !userId) {
    return {
      language: null,
      course: null,
      lesson: null,
      words: [],
      previousLesson: null,
      nextLesson: null,
      courseLessons: [],
      stats: { totalWords: 0, wordsStudied: 0, wordsMastered: 0, totalTimeSeconds: 0, studyTimeSeconds: 0, testTimeSeconds: 0, averageTestScore: null },
      isGuest: !userId,
      userId,
    };
  }

  const { type, courseId } = parsed;

  // Fetch course with language
  const { data: course } = await supabase
    .from("courses")
    .select("*, languages(*)")
    .eq("id", courseId)
    .single();

  if (!course) {
    return {
      language: null,
      course: null,
      lesson: null,
      words: [],
      previousLesson: null,
      nextLesson: null,
      courseLessons: [],
      stats: { totalWords: 0, wordsStudied: 0, wordsMastered: 0, totalTimeSeconds: 0, studyTimeSeconds: 0, testTimeSeconds: 0, averageTestScore: null },
      isGuest: false,
      userId,
    };
  }

  const language = course.languages as Language | null;

  // Get all lessons for this course (for navigation)
  const { data: courseLessons } = await supabase
    .from("lessons")
    .select("id, number, title")
    .eq("course_id", courseId)
    .eq("is_published", true)
    .order("sort_order")
    .order("number");

  const orderedLessons = courseLessons ?? [];

  // Get all word IDs for this course
  const lessonIds = orderedLessons.map((l) => l.id);
  const { data: lessonWords } = await supabase
    .from("lesson_words")
    .select("word_id")
    .in("lesson_id", lessonIds);

  const courseWordIds = lessonWords?.map((lw) => lw.word_id).filter((id): id is string => id !== null) || [];

  if (courseWordIds.length === 0) {
    return buildAutoLessonResult(type, courseId, course, language, orderedLessons, [], userId);
  }

  // Get user's test score IDs for filtering test_questions
  const { data: userTestScores } = await supabase
    .from("user_test_scores")
    .select("id")
    .eq("user_id", userId);

  const testScoreIds = userTestScores?.map((ts) => ts.id) || [];

  // Fetch word IDs based on auto-lesson type
  let targetWordIds: string[] = [];

  if (type === "notes") {
    // Words with user notes
    const { data: wordsWithNotes } = await supabase
      .from("user_word_progress")
      .select("word_id")
      .eq("user_id", userId)
      .in("word_id", courseWordIds)
      .not("user_notes", "is", null);

    targetWordIds = wordsWithNotes?.map((w) => w.word_id).filter((id): id is string => id !== null) || [];
  } else {
    // Best or Worst words - need to calculate scores
    if (testScoreIds.length === 0) {
      return buildAutoLessonResult(type, courseId, course, language, orderedLessons, [], userId);
    }

    const { data: testQuestions } = await supabase
      .from("test_questions")
      .select("word_id, points_earned, max_points")
      .in("test_score_id", testScoreIds)
      .in("word_id", courseWordIds);

    // Calculate average score per word
    const wordScores: Record<string, { totalEarned: number; totalMax: number; avgPercent: number }> = {};
    testQuestions?.forEach((tq) => {
      if (!tq.word_id) return;
      if (!wordScores[tq.word_id]) {
        wordScores[tq.word_id] = { totalEarned: 0, totalMax: 0, avgPercent: 0 };
      }
      wordScores[tq.word_id].totalEarned += tq.points_earned ?? 0;
      wordScores[tq.word_id].totalMax += tq.max_points ?? 3;
    });

    // Calculate percentages and sort
    const sortedWords = Object.entries(wordScores)
      .map(([wordId, scores]) => ({
        wordId,
        avgPercent: scores.totalMax > 0 ? (scores.totalEarned / scores.totalMax) * 100 : 0,
      }))
      .sort((a, b) => type === "best" ? b.avgPercent - a.avgPercent : a.avgPercent - b.avgPercent)
      .slice(0, 20);

    targetWordIds = sortedWords.map((w) => w.wordId);
  }

  if (targetWordIds.length === 0) {
    return buildAutoLessonResult(type, courseId, course, language, orderedLessons, [], userId);
  }

  // Fetch full word data
  const { data: words } = await supabase
    .from("words")
    .select("*, example_sentences(*)")
    .in("id", targetWordIds);

  if (!words || words.length === 0) {
    return buildAutoLessonResult(type, courseId, course, language, orderedLessons, [], userId);
  }

  // Maintain the order from targetWordIds (important for best/worst)
  const wordMap = new Map(words.map((w) => [w.id, w]));
  const orderedWords = targetWordIds
    .map((id) => wordMap.get(id))
    .filter((w): w is NonNullable<typeof w> => w !== undefined);

  // Collect related word IDs
  const allRelatedWordIds = new Set<string>();
  orderedWords.forEach((word) => {
    word.related_word_ids?.forEach((id: string) => allRelatedWordIds.add(id));
  });

  // Fetch related words
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

  // Get user progress for these words
  const { data: wordProgress } = await supabase
    .from("user_word_progress")
    .select("*")
    .eq("user_id", userId)
    .in("word_id", targetWordIds);

  const progressByWord: Record<string, UserWordProgress> = {};
  let wordsStudied = 0;
  let wordsMastered = 0;

  wordProgress?.forEach((wp) => {
    if (wp.word_id) {
      progressByWord[wp.word_id] = wp;
    }
    if (wp.status === "learning" || wp.status === "mastered") {
      wordsStudied++;
    }
    if (wp.status === "mastered") {
      wordsMastered++;
    }
  });

  // Get test history (using testScoreIds fetched earlier)
  const { data: testQuestions } = testScoreIds.length > 0
    ? await supabase
        .from("test_questions")
        .select("word_id, points_earned, max_points, answered_at")
        .in("test_score_id", testScoreIds)
        .in("word_id", targetWordIds)
        .order("answered_at", { ascending: false })
    : { data: [] };

  const testHistoryByWord: Record<string, TestAttempt[]> = {};
  const scoreStatsByWord: Record<string, WordScoreStats> = {};

  testQuestions?.forEach((tq) => {
    const wordId = tq.word_id;
    if (!wordId) return;

    const pointsEarned = tq.points_earned ?? 0;
    const maxPoints = tq.max_points ?? 3;

    if (!testHistoryByWord[wordId]) {
      testHistoryByWord[wordId] = [];
    }
    if (!scoreStatsByWord[wordId]) {
      scoreStatsByWord[wordId] = { totalPointsEarned: 0, totalMaxPoints: 0, scorePercent: 0 };
    }

    scoreStatsByWord[wordId].totalPointsEarned += pointsEarned;
    scoreStatsByWord[wordId].totalMaxPoints += maxPoints;

    if (testHistoryByWord[wordId].length < 3) {
      testHistoryByWord[wordId].push({
        pointsEarned,
        maxPoints,
        answeredAt: tq.answered_at ?? new Date().toISOString(),
      });
    }
  });

  // Calculate score percentages
  Object.keys(scoreStatsByWord).forEach((wordId) => {
    const stats = scoreStatsByWord[wordId];
    stats.scorePercent = stats.totalMaxPoints > 0
      ? Math.round((stats.totalPointsEarned / stats.totalMaxPoints) * 100)
      : 0;
  });

  const defaultScoreStats: WordScoreStats = {
    totalPointsEarned: 0,
    totalMaxPoints: 0,
    scorePercent: 0,
  };

  // Build words with details
  const wordsWithDetails: WordWithDetails[] = orderedWords.map((word, index) => {
    const progress = progressByWord[word.id];
    const exampleSentences = (word.example_sentences || []) as ExampleSentence[];
    const relatedWords = (word.related_word_ids || [])
      .map((id: string) => relatedWordsMap[id])
      .filter(Boolean);
    const testHistory = testHistoryByWord[word.id] || [];
    const scoreStats = scoreStatsByWord[word.id] || defaultScoreStats;

    return {
      ...word,
      sort_order: index,
      example_sentences: undefined,
      exampleSentences,
      relatedWords,
      progress: progress || null,
      status: (progress?.status as WordStatus) || "not-started",
      testHistory,
      scoreStats,
    };
  });

  return buildAutoLessonResult(type, courseId, course, language, orderedLessons, wordsWithDetails, userId, {
    totalWords: wordsWithDetails.length,
    wordsStudied,
    wordsMastered,
    totalTimeSeconds: 0,
    studyTimeSeconds: 0,
    testTimeSeconds: 0,
    averageTestScore: null,
  });
}

/**
 * Helper to build the result object for auto-lessons
 */
function buildAutoLessonResult(
  type: AutoLessonType,
  courseId: string,
  course: Course & { languages?: unknown },
  language: Language | null,
  courseLessons: AdjacentLesson[],
  words: WordWithDetails[],
  userId: string | null,
  stats?: { totalWords: number; wordsStudied: number; wordsMastered: number; totalTimeSeconds: number; studyTimeSeconds: number; testTimeSeconds: number; averageTestScore: number | null }
): GetWordsResult {
  const lessonTitles: Record<AutoLessonType, { number: number; title: string; emoji: string }> = {
    notes: { number: 800, title: "My Notes", emoji: "📝" },
    best: { number: 801, title: "Best Words", emoji: "🏆" },
    worst: { number: 802, title: "Worst Words", emoji: "🎯" },
  };

  const def = lessonTitles[type];
  const now = new Date().toISOString();

  // Create virtual lesson object
  const virtualLesson: Lesson = {
    id: `auto-${type}-${courseId}`,
    course_id: courseId,
    number: def.number,
    title: def.title,
    emoji: def.emoji,
    word_count: words.length,
    is_published: true,
    sort_order: def.number,
    legacy_lesson_id: null,
    created_at: now,
    updated_at: now,
    created_by: null,
    updated_by: null,
  };

  // Extract course without nested relations
  const courseWithoutRelations: Course = {
    id: course.id,
    name: course.name,
    description: course.description,
    language_id: course.language_id,
    legacy_ref: course.legacy_ref,
    level: course.level,
    cefr_range: course.cefr_range,
    total_lessons: course.total_lessons,
    word_count: course.word_count,
    price_override_cents: course.price_override_cents,
    free_lessons: course.free_lessons,
    is_published: course.is_published,
    sort_order: course.sort_order,
    thumbnail_url: course.thumbnail_url,
    created_at: course.created_at,
    updated_at: course.updated_at,
    created_by: course.created_by,
    updated_by: course.updated_by,
  };

  return {
    language,
    course: courseWithoutRelations,
    lesson: virtualLesson,
    words,
    previousLesson: null, // Auto-lessons don't have prev/next
    nextLesson: null,
    courseLessons,
    stats: stats || { totalWords: 0, wordsStudied: 0, wordsMastered: 0, totalTimeSeconds: 0, studyTimeSeconds: 0, testTimeSeconds: 0, averageTestScore: null },
    isGuest: false,
    userId,
  };
}
