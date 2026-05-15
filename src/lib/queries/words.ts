import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ALL_ROWS, fetchAllRows, warnIfTruncated } from "@/lib/supabase/utils";
import {
  Course,
  ExampleSentence,
  Language,
  Lesson,
  UserWordProgress,
  Word,
} from "@/types/database";
import {
  isAutoLesson,
  parseAutoLessonId,
  AutoLessonType,
  selectUnmasteredWordIds,
  selectLostMasteryWordIds,
  AUTO_LESSON_META,
} from "./lessons";
import { getTipsForWords, type TipForWord } from "./tips";

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

export type WordStatus = "not-started" | "learning" | "learned" | "mastered";

/**
 * Read-time defense against status / streak drift.
 *
 * `updateWordTestProgress` (src/lib/mutations/test.ts) writes `status` and
 * `correct_streak` atomically: any row with `status='mastered'` should also
 * have `correct_streak >= 3`. Two repair migrations
 * (20260510000001 / 20260510000002) bring the persisted state in line with
 * this invariant. This helper enforces it at read time so the user-facing
 * badge / counts stay self-consistent even if a future regression
 * reintroduces drift before another migration runs.
 */
function effectiveWordStatus(
  progress: Pick<UserWordProgress, "status" | "correct_streak"> | null | undefined,
): WordStatus {
  const stored = (progress?.status as WordStatus | undefined) || "not-started";
  if (stored === "mastered" && (progress?.correct_streak || 0) < 3) {
    return "learned";
  }
  return stored;
}

export interface TestAttempt {
  /** The aggregated test_score row this attempt belongs to (null if unknown). */
  testScoreId?: string | null;
  /** Sum of points earned across all directions in this single test. */
  pointsEarned: number;
  /** Sum of max points across all directions in this single test. */
  maxPoints: number;
  /** Most recent answered_at across the directions in this test. */
  answeredAt: string;
  /** True iff every direction in this test was full marks (mistakeCount=0, clueLevel=0). */
  isFullMarks?: boolean;
  /** Lesson the test was taken in (null for ad-hoc tests without a linked lesson) */
  lessonId?: string | null;
  lessonTitle?: string | null;
  lessonNumber?: number | null;
  lessonEmoji?: string | null;
}

export interface WordScoreStats {
  /** Total points earned across all test attempts */
  totalPointsEarned: number;
  /** Total max points available across all test attempts */
  totalMaxPoints: number;
  /** Historical score as percentage (0-100) */
  scorePercent: number;
  /** Number of times this word has been tested */
  timesTested: number;
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
  /** Contextual tips linked to this word */
  tips: TipForWord[];
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
    wordsLearned: number;
    wordsMastered: number;
    totalTimeSeconds: number;
    studyTimeSeconds: number;
    testTimeSeconds: number;
    averageTestScore: number | null;
  };
  isGuest: boolean;
  userId: string | null;
  /** Tip IDs the user has dismissed (for filtering in study mode) */
  dismissedTipIds: string[];
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
      stats: { totalWords: 0, wordsStudied: 0, wordsLearned: 0, wordsMastered: 0, totalTimeSeconds: 0, studyTimeSeconds: 0, testTimeSeconds: 0, averageTestScore: null },
      isGuest: !user,
      userId: user?.id ?? null,
      dismissedTipIds: [],
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

  // Admin test lesson (lesson #0): dynamically pick the 4 lowest-scoring
  // studied words from the course instead of using static lesson_words.
  const isAdminTestLesson = lesson.number === 0 && user;

  let words: (Word & { example_sentences: ExampleSentence[]; sort_order: number })[];

  if (isAdminTestLesson && lesson.course_id) {
    // Get all word IDs in this course. Paginate via .range() — PostgREST's
    // 1,000-row max-rows cap silently truncates single-request responses.
    const allLessonIds = orderedLessons.map((l) => l.id);
    const allLessonWords = await fetchAllRows<{ word_id: string | null }>(
      (from, to) =>
        supabase
          .from("lesson_words")
          .select("word_id")
          .in("lesson_id", allLessonIds)
          .range(from, to),
      { label: "getWords:adminTest:lesson_words" }
    );

    const courseWordIds = allLessonWords.map((lw) => lw.word_id).filter((id): id is string => id !== null);

    // Get test scores scoped to this course
    const { data: userTestScores } = await supabase
      .from("user_test_scores")
      .select("id")
      .eq("user_id", user.id)
      .in("lesson_id", allLessonIds);

    const testScoreIds = userTestScores?.map((ts) => ts.id) || [];

    let targetWordIds: string[] = [];

    if (testScoreIds.length > 0) {
      // Paginate via fetchAllRows — PostgREST silently caps at 1,000 rows,
      // and a power user can easily exceed that across all course tests.
      // Truncating here would skew the worst-word pick.
      const testQuestions = await fetchAllRows<{ word_id: string | null; points_earned: number | null }>(
        (from, to) =>
          supabase
            .from("test_questions")
            .select("word_id, points_earned")
            .in("test_score_id", testScoreIds)
            .order("id", { ascending: true })
            .range(from, to),
        { label: "getWords:adminTest:test_questions" }
      );

      // Available is always 3 per attempt; clues reduce points earned, not the max.
      const wordScores: Record<string, { totalEarned: number; totalMax: number }> = {};
      testQuestions.forEach((tq) => {
        if (!tq.word_id) return;
        if (!wordScores[tq.word_id]) {
          wordScores[tq.word_id] = { totalEarned: 0, totalMax: 0 };
        }
        wordScores[tq.word_id].totalEarned += tq.points_earned ?? 0;
        wordScores[tq.word_id].totalMax += 3;
      });

      // Pick 4 words with worst average score (only from studied words)
      targetWordIds = Object.entries(wordScores)
        .filter(([id]) => courseWordIds.includes(id))
        .map(([wordId, scores]) => ({
          wordId,
          avgPercent: scores.totalMax > 0 ? (scores.totalEarned / scores.totalMax) * 100 : 0,
        }))
        .sort((a, b) => a.avgPercent - b.avgPercent)
        .slice(0, 4)
        .map((w) => w.wordId);
    }

    if (targetWordIds.length > 0) {
      const { data: dynamicWords } = await supabase
        .from("words")
        .select("*, example_sentences(*)")
        .in("id", targetWordIds);

      // Maintain worst-first order
      const wordMap = new Map((dynamicWords || []).map((w) => [w.id, w]));
      words = targetWordIds
        .map((id, i) => {
          const w = wordMap.get(id);
          return w ? { ...w, example_sentences: w.example_sentences as ExampleSentence[], sort_order: i } : null;
        })
        .filter((w): w is NonNullable<typeof w> => w !== null);
    } else {
      words = [];
    }
  } else {
    // Standard path: fetch words from lesson_words join table
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
        stats: { totalWords: 0, wordsStudied: 0, wordsLearned: 0, wordsMastered: 0, totalTimeSeconds: 0, studyTimeSeconds: 0, testTimeSeconds: 0, averageTestScore: null },
        isGuest: !user,
        userId: user?.id ?? null,
        dismissedTipIds: [],
      };
    }

    words = lessonWords?.map((lw) => ({
      ...(lw.words as Word & { example_sentences: ExampleSentence[] }),
      sort_order: lw.sort_order ?? 0,
    })) || [];
  }

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

  // Fetch tips for all words in this lesson
  const wordIds = (words || []).map((w) => w.id);
  const { tipsByWordId, dismissedTipIds } = await getTipsForWords(wordIds, user?.id ?? null);

  // Get user's word progress if authenticated
  let progressByWord: Record<string, UserWordProgress> = {};
  let wordsStudied = 0;
  let wordsLearned = 0;
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

    // Build set of info page word IDs to exclude from stats
    const infoWordIds = new Set(
      (words || []).filter((w) => w.category === "information").map((w) => w.id)
    );

    wordProgress?.forEach((wp) => {
      const wordId = wp.word_id;
      if (wordId) {
        progressByWord[wordId] = wp;
      }
      // Exclude information pages from studied/mastered counts
      if (wordId && infoWordIds.has(wordId)) return;
      const effective = effectiveWordStatus(wp);
      if (effective === "learning" || effective === "learned" || effective === "mastered") {
        wordsStudied++;
      }
      if (effective === "learned" || effective === "mastered") {
        wordsLearned++;
      }
      if (effective === "mastered") {
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
      .select(
        "word_id, points_earned, max_points, mistake_count, clue_level, answered_at, test_score_id, user_test_scores(lesson_id, lessons(id, title, emoji, number))"
      )
      .in("word_id", words.map((w) => w.id))
      .order("answered_at", { ascending: false });

    // Aggregate by (wordId, testScoreId) — one TestAttempt per test, not per
    // direction. See `TestAttempt` doc for the unit semantics.
    type Agg = {
      pointsEarned: number;
      maxPoints: number;
      mistakeCount: number;
      maxClueLevel: number;
      answeredAt: string;
      lessonId: string | null;
      lessonTitle: string | null;
      lessonNumber: number | null;
      lessonEmoji: string | null;
    };
    const byWordTest = new Map<string, Map<string, Agg>>();

    testQuestions?.forEach((tq) => {
      const wordId = tq.word_id;
      if (!wordId) return;
      const tsId = tq.test_score_id ?? "_unknown_";

      const pointsEarned = tq.points_earned ?? 0;
      // Available is always 3 per attempt-direction; clues reduce points
      // earned, not the max.
      const maxPoints = tq.max_points ?? 3;
      const mistakeCount = tq.mistake_count ?? 0;
      const clueLevel = tq.clue_level ?? 0;
      const answeredAt = tq.answered_at ?? new Date().toISOString();

      const lesson = (tq as { user_test_scores?: { lessons?: { id: string; title: string; emoji: string | null; number: number } | null } | null })
        .user_test_scores?.lessons ?? null;

      let wordMap = byWordTest.get(wordId);
      if (!wordMap) {
        wordMap = new Map();
        byWordTest.set(wordId, wordMap);
      }
      const existing = wordMap.get(tsId);
      if (existing) {
        existing.pointsEarned += pointsEarned;
        existing.maxPoints += maxPoints;
        existing.mistakeCount += mistakeCount;
        if (clueLevel > existing.maxClueLevel) existing.maxClueLevel = clueLevel;
        if (answeredAt > existing.answeredAt) existing.answeredAt = answeredAt;
      } else {
        wordMap.set(tsId, {
          pointsEarned,
          maxPoints,
          mistakeCount,
          maxClueLevel: clueLevel,
          answeredAt,
          lessonId: lesson?.id ?? null,
          lessonTitle: lesson?.title ?? null,
          lessonNumber: lesson?.number ?? null,
          lessonEmoji: lesson?.emoji ?? null,
        });
      }
    });

    // Flatten per-test aggregates into TestAttempt[] (most-recent-first) and
    // recompute scoreStats from the aggregated per-test rows.
    byWordTest.forEach((wordMap, wordId) => {
      const attempts: TestAttempt[] = Array.from(wordMap.entries())
        .map(([tsId, a]) => ({
          testScoreId: tsId === "_unknown_" ? null : tsId,
          pointsEarned: a.pointsEarned,
          maxPoints: a.maxPoints,
          answeredAt: a.answeredAt,
          isFullMarks: a.mistakeCount === 0 && a.maxClueLevel === 0,
          lessonId: a.lessonId,
          lessonTitle: a.lessonTitle,
          lessonNumber: a.lessonNumber,
          lessonEmoji: a.lessonEmoji,
        }))
        .sort((x, y) => (y.answeredAt > x.answeredAt ? 1 : y.answeredAt < x.answeredAt ? -1 : 0));

      testHistoryByWord[wordId] = attempts;

      const totalPointsEarned = attempts.reduce((s, a) => s + a.pointsEarned, 0);
      const totalMaxPoints = attempts.reduce((s, a) => s + a.maxPoints, 0);
      scoreStatsByWord[wordId] = {
        totalPointsEarned,
        totalMaxPoints,
        scorePercent: totalMaxPoints > 0
          ? Math.round((totalPointsEarned / totalMaxPoints) * 100)
          : 0,
        // timesTested counts distinct tests (aligns with user_word_progress
        // after the backfill migration).
        timesTested: attempts.length,
      };
    });
  }

  // Default score stats for words with no test history
  const defaultScoreStats: WordScoreStats = {
    totalPointsEarned: 0,
    totalMaxPoints: 0,
    scorePercent: 0,
    timesTested: 0,
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
    const tips = tipsByWordId[word.id] || [];

    return {
      ...word,
      sort_order: word.sort_order ?? 0,
      example_sentences: undefined, // Remove nested field
      exampleSentences,
      relatedWords,
      progress: progress || null,
      status: effectiveWordStatus(progress),
      testHistory,
      scoreStats,
      tips,
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
      totalWords: words?.filter((w) => w.category !== "information").length || 0,
      wordsStudied,
      wordsLearned,
      wordsMastered,
      totalTimeSeconds,
      studyTimeSeconds,
      testTimeSeconds,
      averageTestScore,
    },
    isGuest: !user,
    userId: user?.id ?? null,
    dismissedTipIds,
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
  let scoreStats: WordScoreStats = { totalPointsEarned: 0, totalMaxPoints: 0, scorePercent: 0, timesTested: 0 };

  if (user) {
    const { data: wordProgress } = await supabase
      .from("user_word_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("word_id", wordId)
      .single();

    progress = wordProgress || null;

    // Get ALL test attempts for this word, aggregated per `test_score_id`
    // (one TestAttempt per test, not per direction).
    const { data: testQuestions } = await supabase
      .from("test_questions")
      .select("points_earned, max_points, mistake_count, clue_level, answered_at, test_score_id")
      .eq("word_id", wordId)
      .order("answered_at", { ascending: false });

    type Agg = {
      pointsEarned: number;
      maxPoints: number;
      mistakeCount: number;
      maxClueLevel: number;
      answeredAt: string;
    };
    const byTest = new Map<string, Agg>();
    (testQuestions || []).forEach((tq) => {
      const tsId = tq.test_score_id ?? "_unknown_";
      const pointsEarned = tq.points_earned ?? 0;
      const maxPoints = tq.max_points ?? 3;
      const mistakeCount = tq.mistake_count ?? 0;
      const clueLevel = tq.clue_level ?? 0;
      const answeredAt = tq.answered_at ?? new Date().toISOString();
      const existing = byTest.get(tsId);
      if (existing) {
        existing.pointsEarned += pointsEarned;
        existing.maxPoints += maxPoints;
        existing.mistakeCount += mistakeCount;
        if (clueLevel > existing.maxClueLevel) existing.maxClueLevel = clueLevel;
        if (answeredAt > existing.answeredAt) existing.answeredAt = answeredAt;
      } else {
        byTest.set(tsId, {
          pointsEarned,
          maxPoints,
          mistakeCount,
          maxClueLevel: clueLevel,
          answeredAt,
        });
      }
    });

    testHistory = Array.from(byTest.entries())
      .map(([tsId, a]) => ({
        testScoreId: tsId === "_unknown_" ? null : tsId,
        pointsEarned: a.pointsEarned,
        maxPoints: a.maxPoints,
        answeredAt: a.answeredAt,
        isFullMarks: a.mistakeCount === 0 && a.maxClueLevel === 0,
      }))
      .sort((x, y) => (y.answeredAt > x.answeredAt ? 1 : y.answeredAt < x.answeredAt ? -1 : 0));

    const totalPointsEarned = testHistory.reduce((s, a) => s + a.pointsEarned, 0);
    const totalMaxPoints = testHistory.reduce((s, a) => s + a.maxPoints, 0);

    scoreStats = {
      totalPointsEarned,
      totalMaxPoints,
      scorePercent: totalMaxPoints > 0 ? Math.round((totalPointsEarned / totalMaxPoints) * 100) : 0,
      timesTested: testHistory.length,
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
    notes_in_memory_trigger: word.notes_in_memory_trigger,
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
    tips: [],
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
      stats: { totalWords: 0, wordsStudied: 0, wordsLearned: 0, wordsMastered: 0, totalTimeSeconds: 0, studyTimeSeconds: 0, testTimeSeconds: 0, averageTestScore: null },
      isGuest: !userId,
      userId,
      dismissedTipIds: [],
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
      stats: { totalWords: 0, wordsStudied: 0, wordsLearned: 0, wordsMastered: 0, totalTimeSeconds: 0, studyTimeSeconds: 0, testTimeSeconds: 0, averageTestScore: null },
      isGuest: false,
      userId,
      dismissedTipIds: [],
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

  // Time spent and average score for THIS auto-lesson only — auto-lesson IDs
  // (e.g. "auto-worst-{courseId}") are stored verbatim in study_sessions.lesson_id
  // and user_test_scores.lesson_id when the user studies/tests the auto-lesson
  // standalone, so the same query pattern as real lessons works here.
  const [autoStudySessionsResult, autoTestScoresResult] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("duration_seconds")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId),
    supabase
      .from("user_test_scores")
      .select("duration_seconds, score_percent")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId),
  ]);

  const autoStudyTimeSeconds = (autoStudySessionsResult.data || []).reduce(
    (sum, ss) => sum + (ss.duration_seconds || 0),
    0
  );
  const autoLessonTestScores = autoTestScoresResult.data || [];
  const autoTestTimeSeconds = autoLessonTestScores.reduce(
    (sum, ts) => sum + (ts.duration_seconds || 0),
    0
  );
  const autoTotalTimeSeconds = autoStudyTimeSeconds + autoTestTimeSeconds;
  const autoAverageTestScore = autoLessonTestScores.length > 0
    ? Math.round(
        autoLessonTestScores.reduce((sum, ts) => sum + (ts.score_percent || 0), 0) /
          autoLessonTestScores.length
      )
    : null;

  const autoTimeStats = {
    totalWords: 0,
    wordsStudied: 0,
    wordsLearned: 0,
    wordsMastered: 0,
    totalTimeSeconds: autoTotalTimeSeconds,
    studyTimeSeconds: autoStudyTimeSeconds,
    testTimeSeconds: autoTestTimeSeconds,
    averageTestScore: autoAverageTestScore,
  };

  // Get all word IDs for this course. Paginate via .range() — PostgREST's
  // 1,000-row max-rows cap silently truncates single-request responses.
  const lessonIds = orderedLessons.map((l) => l.id);
  const lessonWords = await fetchAllRows<{ word_id: string | null }>(
    (from, to) =>
      supabase
        .from("lesson_words")
        .select("word_id")
        .in("lesson_id", lessonIds)
        .range(from, to),
    { label: "getAutoLessonWords:lesson_words" }
  );

  const courseWordIds = lessonWords.map((lw) => lw.word_id).filter((id): id is string => id !== null);

  if (courseWordIds.length === 0) {
    return buildAutoLessonResult(type, courseId, course, language, orderedLessons, [], userId, autoTimeStats);
  }

  // Fetch word IDs based on auto-lesson type
  let targetWordIds: string[] = [];

  if (type === "notes") {
    // Words with user notes. No word_id filter — pushing ~1k UUIDs through
    // PostgREST silently returns empty on long URLs. `user_notes is not null`
    // already bounds this to a small set; intersect client-side.
    const { data: wordsWithNotes } = await supabase
      .from("user_word_progress")
      .select("word_id")
      .eq("user_id", userId)
      .not("user_notes", "is", null);

    const courseWordIdSet = new Set(courseWordIds);
    targetWordIds = wordsWithNotes
      ?.map((w) => w.word_id)
      .filter((id): id is string => id !== null && courseWordIdSet.has(id)) || [];
  } else if (type === "unmastered" || type === "lost_mastery") {
    // Both selectors operate on rows where status='learned'. Fetch once and
    // pass to the shared helper so this page agrees with the All-Lessons
    // summary on which words land in each lesson.
    const learnedProgress = await fetchAllRows<{
      word_id: string | null;
      mastered_at: string | null;
      learned_at: string | null;
      last_studied_at: string | null;
      correct_streak: number | null;
    }>(
      (from, to) =>
        supabase
          .from("user_word_progress")
          .select("word_id, mastered_at, learned_at, last_studied_at, correct_streak")
          .eq("user_id", userId)
          .eq("status", "learned")
          .range(from, to),
      { label: `getAutoLessonWords:${type}:user_word_progress` },
    );

    const courseWordIdSet = new Set(courseWordIds);
    const learnedRows = learnedProgress
      .filter((r) => r.word_id !== null && courseWordIdSet.has(r.word_id))
      .map((r) => ({
        word_id: r.word_id as string,
        mastered_at: r.mastered_at,
        learned_at: r.learned_at,
        last_studied_at: r.last_studied_at,
        correct_streak: r.correct_streak,
      }));

    targetWordIds =
      type === "unmastered"
        ? selectUnmasteredWordIds(learnedRows)
        : selectLostMasteryWordIds(learnedRows);
  } else {
    // Best or Worst words — aggregated in Postgres via the
    // `select_best_worst_words_for_course` RPC so the All-Lessons summary,
    // the scheduler, and this page always agree, and so per-word test
    // history isn't filtered through the current course's lesson_ids
    // (see the migration for the full rationale).
    const { data: rpcRows } = await supabase.rpc(
      "select_best_worst_words_for_course",
      { p_course_id: courseId, p_type: type, p_limit: 20 },
    );
    targetWordIds = (rpcRows ?? [])
      .map((r) => r.word_id)
      .filter((id): id is string => !!id);
  }

  if (targetWordIds.length === 0) {
    return buildAutoLessonResult(type, courseId, course, language, orderedLessons, [], userId, autoTimeStats);
  }

  // Fetch full word data
  const { data: words } = await supabase
    .from("words")
    .select("*, example_sentences(*)")
    .in("id", targetWordIds);

  if (!words || words.length === 0) {
    return buildAutoLessonResult(type, courseId, course, language, orderedLessons, [], userId, autoTimeStats);
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
  let wordsLearned = 0;
  let wordsMastered = 0;

  // Build set of info page word IDs to exclude from stats
  const autoInfoWordIds = new Set(
    (words || []).filter((w) => w.category === "information").map((w) => w.id)
  );

  wordProgress?.forEach((wp) => {
    if (wp.word_id) {
      progressByWord[wp.word_id] = wp;
    }
    // Exclude information pages from studied/mastered counts
    if (wp.word_id && autoInfoWordIds.has(wp.word_id)) return;
    const effective = effectiveWordStatus(wp);
    if (effective === "learning" || effective === "learned" || effective === "mastered") {
      wordsStudied++;
    }
    if (effective === "learned" || effective === "mastered") {
      wordsLearned++;
    }
    if (effective === "mastered") {
      wordsMastered++;
    }
  });

  // Get test history for these words. Per-word `test_questions` is the source
  // of truth for traffic lights and average scores — aggregate by word_id only
  // and scope to this user via the inner join on user_test_scores. Filtering
  // by lesson_id (via testScoreIds) would hide attempts whose original lesson
  // was unpublished, renumbered, or moved, even though the word-level score
  // history is still valid.
  const { data: testQuestions } = targetWordIds.length > 0
    ? await supabase
        .from("test_questions")
        .select(
          "word_id, points_earned, max_points, mistake_count, clue_level, answered_at, test_score_id, user_test_scores!inner(user_id)"
        )
        .eq("user_test_scores.user_id", userId)
        .in("word_id", targetWordIds)
        .order("answered_at", { ascending: false })
    : { data: [] };

  const testHistoryByWord: Record<string, TestAttempt[]> = {};
  const scoreStatsByWord: Record<string, WordScoreStats> = {};

  // Aggregate per (wordId, testScoreId) so each TestAttempt represents one
  // test (not one direction).
  type Agg = {
    pointsEarned: number;
    maxPoints: number;
    mistakeCount: number;
    maxClueLevel: number;
    answeredAt: string;
  };
  const byWordTest = new Map<string, Map<string, Agg>>();

  testQuestions?.forEach((tq) => {
    const wordId = tq.word_id;
    if (!wordId) return;
    const tsId = tq.test_score_id ?? "_unknown_";

    const pointsEarned = tq.points_earned ?? 0;
    const maxPoints = tq.max_points ?? 3;
    const mistakeCount = tq.mistake_count ?? 0;
    const clueLevel = tq.clue_level ?? 0;
    const answeredAt = tq.answered_at ?? new Date().toISOString();

    let wordMap = byWordTest.get(wordId);
    if (!wordMap) {
      wordMap = new Map();
      byWordTest.set(wordId, wordMap);
    }
    const existing = wordMap.get(tsId);
    if (existing) {
      existing.pointsEarned += pointsEarned;
      existing.maxPoints += maxPoints;
      existing.mistakeCount += mistakeCount;
      if (clueLevel > existing.maxClueLevel) existing.maxClueLevel = clueLevel;
      if (answeredAt > existing.answeredAt) existing.answeredAt = answeredAt;
    } else {
      wordMap.set(tsId, {
        pointsEarned,
        maxPoints,
        mistakeCount,
        maxClueLevel: clueLevel,
        answeredAt,
      });
    }
  });

  byWordTest.forEach((wordMap, wordId) => {
    const attempts: TestAttempt[] = Array.from(wordMap.entries())
      .map(([tsId, a]) => ({
        testScoreId: tsId === "_unknown_" ? null : tsId,
        pointsEarned: a.pointsEarned,
        maxPoints: a.maxPoints,
        answeredAt: a.answeredAt,
        isFullMarks: a.mistakeCount === 0 && a.maxClueLevel === 0,
      }))
      .sort((x, y) => (y.answeredAt > x.answeredAt ? 1 : y.answeredAt < x.answeredAt ? -1 : 0));

    testHistoryByWord[wordId] = attempts;

    const totalPointsEarned = attempts.reduce((s, a) => s + a.pointsEarned, 0);
    const totalMaxPoints = attempts.reduce((s, a) => s + a.maxPoints, 0);
    scoreStatsByWord[wordId] = {
      totalPointsEarned,
      totalMaxPoints,
      scorePercent: totalMaxPoints > 0
        ? Math.round((totalPointsEarned / totalMaxPoints) * 100)
        : 0,
      timesTested: attempts.length,
    };
  });

  const defaultScoreStats: WordScoreStats = {
    totalPointsEarned: 0,
    totalMaxPoints: 0,
    scorePercent: 0,
    timesTested: 0,
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
      status: effectiveWordStatus(progress),
      testHistory,
      scoreStats,
      tips: [],
    };
  });

  return buildAutoLessonResult(type, courseId, course, language, orderedLessons, wordsWithDetails, userId, {
    totalWords: wordsWithDetails.filter((w) => w.category !== "information").length,
    wordsStudied,
    wordsLearned,
    wordsMastered,
    totalTimeSeconds: autoTotalTimeSeconds,
    studyTimeSeconds: autoStudyTimeSeconds,
    testTimeSeconds: autoTestTimeSeconds,
    averageTestScore: autoAverageTestScore,
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
  stats?: { totalWords: number; wordsStudied: number; wordsLearned: number; wordsMastered: number; totalTimeSeconds: number; studyTimeSeconds: number; testTimeSeconds: number; averageTestScore: number | null }
): GetWordsResult {
  const def = AUTO_LESSON_META[type];
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
    stats: stats || { totalWords: 0, wordsStudied: 0, wordsLearned: 0, wordsMastered: 0, totalTimeSeconds: 0, studyTimeSeconds: 0, testTimeSeconds: 0, averageTestScore: null },
    isGuest: false,
    userId,
    dismissedTipIds: [],
  };
}
