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
import { getAutoLessonWordLimit } from "./platformConfig";
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
  /** The test_sessions row this attempt belongs to (null if unknown). */
  testSessionId?: string | null;
  /** Position within the session for this word (1 = first attempt, 2 = second). */
  attemptNumber?: number;
  /** Points earned on this single attempt. */
  pointsEarned: number;
  /** Max points available on this single attempt. */
  maxPoints: number;
  /** answered_at for this single attempt. */
  answeredAt: string;
  /** True iff this attempt was full marks (mistakeCount=0, clueLevel=0). */
  isFullMarks?: boolean;
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

export type RelatedEntry = Pick<Word, "id" | "english" | "headword" | "memory_trigger_image_url">;

/**
 * Related entries grouped by `word_relationships.relationship_type`.
 * Each group renders as its own card in the study/test/detail sidebars.
 */
export type RelatedEntryGroups = {
  compound: RelatedEntry[];
  sentence: RelatedEntry[];
  grammar: RelatedEntry[];
};

const EMPTY_RELATED_GROUPS: RelatedEntryGroups = Object.freeze({
  compound: [],
  sentence: [],
  grammar: [],
}) as RelatedEntryGroups;

/** Allowed `relationship_type` values we render in the UI. */
const KNOWN_RELATIONSHIP_TYPES = ["compound", "sentence", "grammar"] as const;
type KnownRelationshipType = (typeof KNOWN_RELATIONSHIP_TYPES)[number];

function isKnownRelationshipType(t: unknown): t is KnownRelationshipType {
  return typeof t === "string" && (KNOWN_RELATIONSHIP_TYPES as readonly string[]).includes(t);
}

export interface WordWithDetails extends Word {
  /** Sort order within the current lesson (from lesson_words join table) */
  sort_order: number;
  exampleSentences: ExampleSentence[];
  /**
   * Cross-references from `word_relationships`, bucketed by relationship type.
   * Unknown types are ignored at read time so adding a new enum value
   * doesn't crash the UI.
   */
  relatedWords: RelatedEntryGroups;
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

  // Auto-lesson path doesn't use the standard `lessons` / `lesson_words`
  // fetches below, so resolve `user` on its own and bail early.
  if (isAutoLesson(lessonId)) {
    const {
      data: { user: autoUser },
    } = await supabase.auth.getUser();
    return getAutoLessonWords(supabase, lessonId, autoUser?.id || null);
  }

  // Phase 1: three independent reads in parallel — the previous serial
  // chain (`auth.getUser` → `lessons` → `lesson_words`) cost ~3 round-trips
  // even though none of these depend on each other (lesson_words only needs
  // the raw lessonId, not the resolved lesson row). The admin-test branch
  // below ignores `lessonWordsRaw` and rebuilds the word list dynamically,
  // so this is a cheap speculative fetch that pays off for every non-
  // admin-test lesson (i.e. >99% of traffic).
  const [
    { data: { user } },
    { data: lesson },
    { data: lessonWordsRaw, error: lessonWordsError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("lessons")
      .select("*, courses(*, languages(*))")
      .eq("id", lessonId)
      .single(),
    supabase
      .from("lesson_words")
      .select("sort_order, words(*, example_sentences(*))")
      .eq("lesson_id", lessonId)
      .order("sort_order"),
  ]);

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

  // Admin test lesson (lesson #0): dynamically pick the 4 lowest-scoring
  // studied words from the course instead of using static lesson_words.
  const isAdminTestLesson = lesson.number === 0 && user;

  let words: (Word & { example_sentences: ExampleSentence[]; sort_order: number })[] = [];
  let orderedLessons: AdjacentLesson[] = [];

  if (isAdminTestLesson && lesson.course_id) {
    // Admin-test path: courseLessons is needed *before* the word selection
    // chain (its lesson IDs scope `test_questions`), so keep its fetch here.
    // This branch is rare (lesson #0 only) and inherently serial.
    const { data: courseLessonsAdmin } = await supabase
      .from("lessons")
      .select("id, number, title")
      .eq("course_id", lesson.course_id)
      .eq("is_published", true)
      .order("sort_order")
      .order("number");
    orderedLessons = courseLessonsAdmin ?? [];
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

    // Get test scores scoped to this course. Auto-lesson rows have
    // `lesson_id IS NULL` and live under `course_id`, so combine the real-
    // lesson UUID set with a `course_id` predicate via `.or()`.
    const courseScopeOr =
      allLessonIds.length > 0
        ? `lesson_id.in.(${allLessonIds.join(",")}),course_id.eq.${lesson.course_id}`
        : `course_id.eq.${lesson.course_id}`;
    const { data: userTestScores } = await supabase
      .from("test_sessions")
      .select("id")
      .eq("user_id", user.id)
      .or(courseScopeOr);

    const testSessionIds = userTestScores?.map((ts) => ts.id) || [];

    let targetWordIds: string[] = [];

    if (testSessionIds.length > 0) {
      // Paginate via fetchAllRows — PostgREST silently caps at 1,000 rows,
      // and a power user can easily exceed that across all course tests.
      // Truncating here would skew the worst-word pick.
      const testQuestions = await fetchAllRows<{ word_id: string | null; points_earned: number | null }>(
        (from, to) =>
          supabase
            .from("test_questions")
            .select("word_id, points_earned")
            .in("test_session_id", testSessionIds)
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
    // Standard path: reuse the `lesson_words` payload already fetched in
    // Phase 1. The previous serial refetch here was redundant.
    if (lessonWordsError) {
      console.error("Error fetching words:", lessonWordsError);
      return {
        language,
        course: course ? extractCourse(course) : null,
        lesson: extractedLesson,
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

    words = lessonWordsRaw?.map((lw) => ({
      ...(lw.words as Word & { example_sentences: ExampleSentence[] }),
      sort_order: lw.sort_order ?? 0,
    })) || [];
  }

  // Related entries are fetched from `word_relationships` (typed), keyed on
  // the source word_id. The vestigial `words.related_word_ids` array is no
  // longer read — it cannot encode `relationship_type` and was never
  // populated.
  const wordIds = words.map((w) => w.id);

  // Phase 2: every remaining read happens concurrently. The previous code
  // ran six sequential awaits (courseLessons → relatedWords → tips →
  // userWordProgress → study/test time → testQuestions); each one round-
  // tripped to Postgres before the next could start. None of them actually
  // depend on each other once `words` is in hand, so a single Promise.all
  // collapses the waterfall.
  //
  // `null` from a conditional branch means "skip" — destructure with the
  // optional-chaining pattern below.
  const [
    courseLessonsResp,
    relatedWordsResp,
    tipsResult,
    wordProgressResp,
    studySessionsResp,
    testScoresResp,
    testQuestionsResp,
  ] = await Promise.all([
    isAdminTestLesson || !lesson.course_id
      ? Promise.resolve(null)
      : supabase
          .from("lessons")
          .select("id, number, title")
          .eq("course_id", lesson.course_id)
          .eq("is_published", true)
          .order("sort_order")
          .order("number"),
    wordIds.length > 0
      ? supabase
          .from("word_relationships")
          .select(
            `word_id, relationship_type, related:words!word_relationships_related_word_id_fkey(id, english, headword, memory_trigger_image_url)`
          )
          .in("word_id", wordIds)
      : Promise.resolve(null),
    getTipsForWords(wordIds, user?.id ?? null),
    user && words.length > 0
      ? supabase
          .from("user_word_progress")
          .select("*")
          .eq("user_id", user.id)
          .in("word_id", wordIds)
      : Promise.resolve(null),
    user
      ? supabase
          .from("study_sessions")
          .select("duration_seconds")
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId)
      : Promise.resolve(null),
    user
      ? supabase
          .from("test_sessions")
          .select("duration_seconds, score_percent")
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId)
      : Promise.resolve(null),
    user && words.length > 0
      ? supabase
          .from("test_questions")
          .select(
            "word_id, points_earned, max_points, mistake_count, clue_level, answered_at, test_session_id, attempt_number"
          )
          .in("word_id", wordIds)
          .order("answered_at", { ascending: false })
      : Promise.resolve(null),
  ]);

  // Standard branch picks up courseLessons from the parallel batch; admin
  // branch populated it above.
  if (!isAdminTestLesson) {
    orderedLessons = (courseLessonsResp?.data ?? []) as AdjacentLesson[];
  }

  // Compute previous/next lesson navigation.
  const currentIndex = orderedLessons.findIndex((l) => l.id === lesson.id);
  const hasMultiple = orderedLessons.length > 1;
  // Loop: first lesson → previous = last; last lesson → next = first.
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

  // Build the related-entries map: word_id → grouped entries.
  // One DB row per (word_id, related_word_id, relationship_type) — bucket
  // each into its group. Unknown relationship_type values are dropped.
  const relatedGroupsByWord: Record<string, RelatedEntryGroups> = {};
  (relatedWordsResp?.data ?? []).forEach((row) => {
    const sourceId = row.word_id;
    const related = row.related as RelatedEntry | null;
    if (!sourceId || !related) return;
    if (!isKnownRelationshipType(row.relationship_type)) return;
    let groups = relatedGroupsByWord[sourceId];
    if (!groups) {
      groups = { compound: [], sentence: [], grammar: [] };
      relatedGroupsByWord[sourceId] = groups;
    }
    groups[row.relationship_type].push(related);
  });

  const { tipsByWordId, dismissedTipIds } = tipsResult;

  // Build progress map + studied/learned/mastered counts.
  const progressByWord: Record<string, UserWordProgress> = {};
  let wordsStudied = 0;
  let wordsLearned = 0;
  let wordsMastered = 0;

  if (user && words.length > 0) {
    const infoWordIds = new Set(
      words.filter((w) => w.category === "information").map((w) => w.id)
    );

    (wordProgressResp?.data ?? []).forEach((wp) => {
      const wordId = wp.word_id;
      if (wordId) {
        progressByWord[wordId] = wp;
      }
      // Exclude information pages from studied/mastered counts.
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

  // Aggregate study/test time and average test score.
  const studySessions = studySessionsResp?.data ?? [];
  const testScores = testScoresResp?.data ?? [];
  const studyTimeSeconds = studySessions.reduce(
    (sum, ss) => sum + (ss.duration_seconds || 0),
    0
  );
  const testTimeSeconds = testScores.reduce(
    (sum, ts) => sum + (ts.duration_seconds || 0),
    0
  );
  const totalTimeSeconds = studyTimeSeconds + testTimeSeconds;
  const averageTestScore = testScores.length > 0
    ? Math.round(
        testScores.reduce((sum, ts) => sum + (ts.score_percent || 0), 0) /
          testScores.length
      )
    : null;

  // Aggregate test history. We used to embed
  // `test_sessions(lesson_id, auto_lesson_type, course_id, lessons(...))`
  // here to populate per-attempt lesson metadata on `TestAttempt`, but no UI
  // consumer reads those fields — the traffic-light dots and aggregate stats
  // only need `pointsEarned`/`maxPoints`/`answeredAt`. Dropping the embed
  // removes a PostgREST FK resolution + nested join from the per-lesson page
  // load.
  const testHistoryByWord: Record<string, TestAttempt[]> = {};
  const scoreStatsByWord: Record<string, WordScoreStats> = {};

  if (user && words.length > 0) {
    // Emit one TestAttempt per `test_questions` row. Test Twice contributes
    // two rows per word (attempt 1 + attempt 2). Traffic-light strips and
    // streak math share this per-row unit so they cannot drift.
    const byWord = new Map<string, TestAttempt[]>();
    (testQuestionsResp?.data ?? []).forEach((tq) => {
      const wordId = tq.word_id;
      if (!wordId) return;
      const pointsEarned = tq.points_earned ?? 0;
      const maxPoints = tq.max_points ?? 3;
      const mistakeCount = tq.mistake_count ?? 0;
      const clueLevel = tq.clue_level ?? 0;
      const answeredAt = tq.answered_at ?? new Date().toISOString();
      const attempt: TestAttempt = {
        testSessionId: tq.test_session_id ?? null,
        attemptNumber: tq.attempt_number,
        pointsEarned,
        maxPoints,
        answeredAt,
        isFullMarks: mistakeCount === 0 && clueLevel === 0,
      };
      const list = byWord.get(wordId);
      if (list) list.push(attempt);
      else byWord.set(wordId, [attempt]);
    });

    byWord.forEach((attempts, wordId) => {
      // Most recent first; tiebreak by attempt_number DESC so a Test Twice
      // session's 2nd attempt sorts ahead of its 1st when answered_at is
      // identical down to the millisecond.
      attempts.sort((x, y) => {
        if (x.answeredAt !== y.answeredAt) return x.answeredAt > y.answeredAt ? -1 : 1;
        return (y.attemptNumber ?? 0) - (x.attemptNumber ?? 0);
      });
      testHistoryByWord[wordId] = attempts;
      const totalPointsEarned = attempts.reduce((s, a) => s + a.pointsEarned, 0);
      const totalMaxPoints = attempts.reduce((s, a) => s + a.maxPoints, 0);
      scoreStatsByWord[wordId] = {
        totalPointsEarned,
        totalMaxPoints,
        scorePercent: totalMaxPoints > 0
          ? Math.round((totalPointsEarned / totalMaxPoints) * 100)
          : 0,
        // timesTested = number of attempts (one per row).
        timesTested: attempts.length,
      };
    });
  }

  // Default score stats for words with no test history.
  const defaultScoreStats: WordScoreStats = {
    totalPointsEarned: 0,
    totalMaxPoints: 0,
    scorePercent: 0,
    timesTested: 0,
  };

  // Combine data
  const wordsWithDetails: WordWithDetails[] = words.map((word) => {
    const progress = progressByWord[word.id];
    const exampleSentences = (word.example_sentences || []) as ExampleSentence[];
    const relatedWords = relatedGroupsByWord[word.id] ?? EMPTY_RELATED_GROUPS;
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

  // Fetch related entries from word_relationships, grouped by type.
  const relatedWords: RelatedEntryGroups = { compound: [], sentence: [], grammar: [] };
  {
    const { data: relRows } = await supabase
      .from("word_relationships")
      .select(
        `relationship_type, related:words!word_relationships_related_word_id_fkey(id, english, headword, memory_trigger_image_url)`
      )
      .eq("word_id", wordId);

    (relRows ?? []).forEach((row) => {
      const related = row.related as RelatedEntry | null;
      if (!related) return;
      if (!isKnownRelationshipType(row.relationship_type)) return;
      relatedWords[row.relationship_type].push(related);
    });
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

    // Get ALL test attempts for this word. One TestAttempt per
    // `test_questions` row — Test Twice contributes two rows.
    const { data: testQuestions } = await supabase
      .from("test_questions")
      .select("points_earned, max_points, mistake_count, clue_level, answered_at, test_session_id, attempt_number")
      .eq("word_id", wordId)
      .order("answered_at", { ascending: false });

    testHistory = (testQuestions ?? [])
      .map((tq) => {
        const pointsEarned = tq.points_earned ?? 0;
        const maxPoints = tq.max_points ?? 3;
        const mistakeCount = tq.mistake_count ?? 0;
        const clueLevel = tq.clue_level ?? 0;
        const answeredAt = tq.answered_at ?? new Date().toISOString();
        return {
          testSessionId: tq.test_session_id ?? null,
          attemptNumber: tq.attempt_number,
          pointsEarned,
          maxPoints,
          answeredAt,
          isFullMarks: mistakeCount === 0 && clueLevel === 0,
        } satisfies TestAttempt;
      })
      .sort((x, y) => {
        if (x.answeredAt !== y.answeredAt) return x.answeredAt > y.answeredAt ? -1 : 1;
        return (y.attemptNumber ?? 0) - (x.attemptNumber ?? 0);
      });

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

  // Phase 1: every read that depends only on (courseId, userId) fans out at
  // once — course metadata, all course lessons for nav, and the
  // auto-lesson-scoped time/score stats. Previously this was a 3-step
  // waterfall (course → courseLessons → parallel(study/test)). After
  // migration 20260516000002, auto-lesson rows in `study_sessions` /
  // `test_sessions` have `lesson_id IS NULL` and live under
  // `(auto_lesson_type, course_id)`, so we filter by the discriminator
  // pair instead of the legacy text id.
  const [
    courseResp,
    courseLessonsResp,
    autoStudySessionsResult,
    autoTestScoresResult,
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("*, languages(*)")
      .eq("id", courseId)
      .single(),
    supabase
      .from("lessons")
      .select("id, number, title")
      .eq("course_id", courseId)
      .eq("is_published", true)
      .order("sort_order")
      .order("number"),
    supabase
      .from("study_sessions")
      .select("duration_seconds")
      .eq("user_id", userId)
      .eq("auto_lesson_type", type)
      .eq("course_id", courseId),
    supabase
      .from("test_sessions")
      .select("duration_seconds, score_percent")
      .eq("user_id", userId)
      .eq("auto_lesson_type", type)
      .eq("course_id", courseId),
  ]);

  const course = courseResp.data;

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
  const orderedLessons = courseLessonsResp.data ?? [];

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

    const autoLessonWordLimit = await getAutoLessonWordLimit();
    targetWordIds =
      type === "unmastered"
        ? selectUnmasteredWordIds(learnedRows, autoLessonWordLimit)
        : selectLostMasteryWordIds(learnedRows, autoLessonWordLimit);
  } else {
    // Best or Worst words — aggregated in Postgres via the
    // `select_best_worst_words_for_course` RPC so the All-Lessons summary,
    // the scheduler, and this page always agree, and so per-word test
    // history isn't filtered through the current course's lesson_ids
    // (see the migration for the full rationale).
    const autoLessonWordLimit = await getAutoLessonWordLimit();
    const { data: rpcRows } = await supabase.rpc(
      "select_best_worst_words_for_course",
      { p_course_id: courseId, p_type: type, p_limit: autoLessonWordLimit },
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

  // Maintain the order from targetWordIds (important for best/worst).
  // Also filter out info-category pages as defense-in-depth: the best/worst
  // RPC excludes them at the source (migration 20260514000004), but doing it
  // here as well means a future RPC regression — or any other code path that
  // produces targetWordIds — can't leak info pages into the study/test UI.
  const wordMap = new Map(words.map((w) => [w.id, w]));
  const orderedWords = targetWordIds
    .map((id) => wordMap.get(id))
    .filter((w): w is NonNullable<typeof w> => w !== undefined)
    .filter((w) => w.category !== "information");

  // Final fan-out: related words, user progress, and per-word test history
  // all only depend on the resolved word/target sets, so a single Promise.all
  // replaces the previous three sequential awaits.
  //
  // Test-history note: `test_questions` is the source of truth for traffic
  // lights and average scores — one row per attempt (Test Twice writes two
  // rows). Scope to this user via the inner join on `test_sessions`.
  // Filtering by lesson_id would hide attempts whose original lesson was
  // unpublished, renumbered, or moved, even though the word-level score
  // history is still valid.
  const orderedWordIds = orderedWords.map((w) => w.id);
  const [relatedWordsResp, wordProgressResp, testQuestionsResp] = await Promise.all([
    orderedWordIds.length > 0
      ? supabase
          .from("word_relationships")
          .select(
            `word_id, relationship_type, related:words!word_relationships_related_word_id_fkey(id, english, headword, memory_trigger_image_url)`
          )
          .in("word_id", orderedWordIds)
      : Promise.resolve(null),
    supabase
      .from("user_word_progress")
      .select("*")
      .eq("user_id", userId)
      .in("word_id", targetWordIds),
    targetWordIds.length > 0
      ? supabase
          .from("test_questions")
          .select(
            "word_id, points_earned, max_points, mistake_count, clue_level, answered_at, test_session_id, attempt_number, test_sessions!inner(user_id)"
          )
          .eq("test_sessions.user_id", userId)
          .in("word_id", targetWordIds)
          .order("answered_at", { ascending: false })
      : Promise.resolve(null),
  ]);

  const relatedGroupsByWord: Record<string, RelatedEntryGroups> = {};
  (relatedWordsResp?.data ?? []).forEach((row) => {
    const sourceId = row.word_id;
    const related = row.related as RelatedEntry | null;
    if (!sourceId || !related) return;
    if (!isKnownRelationshipType(row.relationship_type)) return;
    let groups = relatedGroupsByWord[sourceId];
    if (!groups) {
      groups = { compound: [], sentence: [], grammar: [] };
      relatedGroupsByWord[sourceId] = groups;
    }
    groups[row.relationship_type].push(related);
  });

  const wordProgress = wordProgressResp.data;
  const testQuestions = testQuestionsResp?.data ?? [];

  const progressByWord: Record<string, UserWordProgress> = {};
  let wordsStudied = 0;
  let wordsLearned = 0;
  let wordsMastered = 0;

  // Build set of info page word IDs to exclude from stats.
  const autoInfoWordIds = new Set(
    (words || []).filter((w) => w.category === "information").map((w) => w.id)
  );

  wordProgress?.forEach((wp) => {
    if (wp.word_id) {
      progressByWord[wp.word_id] = wp;
    }
    // Exclude information pages from studied/mastered counts.
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

  const testHistoryByWord: Record<string, TestAttempt[]> = {};
  const scoreStatsByWord: Record<string, WordScoreStats> = {};

  // One TestAttempt per `test_questions` row — Test Twice contributes two
  // attempts per word.
  const byWord = new Map<string, TestAttempt[]>();
  testQuestions?.forEach((tq) => {
    const wordId = tq.word_id;
    if (!wordId) return;
    const pointsEarned = tq.points_earned ?? 0;
    const maxPoints = tq.max_points ?? 3;
    const mistakeCount = tq.mistake_count ?? 0;
    const clueLevel = tq.clue_level ?? 0;
    const answeredAt = tq.answered_at ?? new Date().toISOString();
    const attempt: TestAttempt = {
      testSessionId: tq.test_session_id ?? null,
      attemptNumber: tq.attempt_number,
      pointsEarned,
      maxPoints,
      answeredAt,
      isFullMarks: mistakeCount === 0 && clueLevel === 0,
    };
    const list = byWord.get(wordId);
    if (list) list.push(attempt);
    else byWord.set(wordId, [attempt]);
  });

  byWord.forEach((attempts, wordId) => {
    attempts.sort((x, y) => {
      if (x.answeredAt !== y.answeredAt) return x.answeredAt > y.answeredAt ? -1 : 1;
      return (y.attemptNumber ?? 0) - (x.attemptNumber ?? 0);
    });
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
    const relatedWords = relatedGroupsByWord[word.id] ?? EMPTY_RELATED_GROUPS;
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
