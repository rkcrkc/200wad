"use server";

import { createClient } from "@/lib/supabase/server";

import { revalidatePath } from "next/cache";
import {
  type Milestone,
  isValidMilestone,
  shouldCountAsMilestone,
  getNextMilestone,
  calculateNextTestDueAt,
} from "@/lib/utils/milestones";
import { updateLessonProgress } from "./study";
import { recordProgressAchievements } from "@/lib/notifications/achievements";
import {
  isAutoLesson,
  parseAutoLessonId,
  resolveLessonIdRef,
} from "@/lib/queries/lessons";
import { getAutoLessonWordLimit } from "@/lib/queries/platformConfig";
import type { TestType } from "@/types/test";

// ============================================================================
// TEST SESSION ACTIONS
// ============================================================================

export interface CreateTestSessionResult {
  sessionId: string | null;
  error: string | null;
}

/**
 * Create a new test session when entering Test Mode
 */
export async function createTestSession(
  lessonId: string
): Promise<CreateTestSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { sessionId: null, error: "User not authenticated" };
  }

  // Rate limiting: max 20 sessions per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentSessions } = await supabase
    .from("study_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("started_at", oneHourAgo);

  if (recentSessions && recentSessions > 20) {
    return { sessionId: null, error: "Rate limit exceeded. Please wait before starting another session." };
  }

  // Delete orphaned test sessions for this lesson (incomplete sessions that were never finished)
  // These are sessions where the user clicked "Take Test" but left before completing
  const lessonRef = resolveLessonIdRef(lessonId);

  let deleteQuery = supabase
    .from("study_sessions")
    .delete()
    .eq("user_id", user.id)
    .eq("session_type", "test")
    .is("ended_at", null);
  if (lessonRef.kind === "real") {
    deleteQuery = deleteQuery.eq("lesson_id", lessonRef.lessonId);
  } else if (lessonRef.kind === "auto") {
    deleteQuery = deleteQuery
      .eq("auto_lesson_type", lessonRef.autoLessonType)
      .eq("course_id", lessonRef.courseId);
  }
  await deleteQuery;

  // Build the insert payload so exactly one of `lesson_id` or
  // `(auto_lesson_type, course_id)` is populated — the table's mutual-
  // exclusion CHECK constraint rejects rows with both set.
  const sessionInsert: {
    user_id: string;
    lesson_id?: string;
    auto_lesson_type?: "notes" | "best" | "worst" | "unmastered" | "lost_mastery";
    course_id?: string;
    session_type: "test";
    started_at: string;
    words_studied: number;
    words_mastered: number;
  } = {
    user_id: user.id,
    session_type: "test",
    started_at: new Date().toISOString(),
    words_studied: 0,
    words_mastered: 0,
  };
  if (lessonRef.kind === "real") {
    sessionInsert.lesson_id = lessonRef.lessonId;
  } else if (lessonRef.kind === "auto") {
    sessionInsert.auto_lesson_type = lessonRef.autoLessonType;
    sessionInsert.course_id = lessonRef.courseId;
  }

  const { data, error } = await supabase
    .from("study_sessions")
    .insert(sessionInsert)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating test session:", error);
    return { sessionId: null, error: error.message };
  }

  return { sessionId: data.id, error: null };
}

// ============================================================================
// TEST COMPLETION
// ============================================================================

export interface TestQuestionResult {
  wordId: string;
  userAnswer: string;
  correctAnswer: string;
  clueLevel: 0 | 1 | 2;
  mistakeCount: number;
  pointsEarned: number;
  maxPoints: number;
  timeToAnswerMs?: number;
}

export interface TestStats {
  totalQuestions: number;
  correctAnswers: number;
  pointsEarned: number;
  maxPoints: number;
  scorePercent: number;
  durationSeconds: number;
  newWordsCount: number;
  newlyLearnedCount: number;
  masteredWordsCount: number;
  isRetest: boolean;
}

export interface CompleteTestSessionResult {
  success: boolean;
  testSessionId: string | null;
  /** Mastered word count scoped to the current course. */
  courseWordsMastered: number;
  /** True when this call returned an existing row instead of inserting. */
  deduplicated?: boolean;
  error: string | null;
}

/**
 * Complete a test session - saves test scores and updates word progress
 * @param intendedMilestone - The milestone this test was started for (from URL param), or null for self-initiated
 * @param direction - Direction this test ran in. Defaults to english-to-foreign (the historical default).
 */
export async function completeTestSession(
  sessionId: string,
  lessonId: string,
  inputStats: TestStats,
  inputQuestionResults: TestQuestionResult[],
  intendedMilestone?: string | null,
  direction: TestType = "english-to-foreign"
): Promise<CompleteTestSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, testSessionId: null, courseWordsMastered: 0, error: "User not authenticated" };
  }

  // Mutable copies so server-side re-scoring can override client values
  let stats = { ...inputStats };
  const questionResults = inputQuestionResults.map((q) => ({ ...q }));

  // Check if this is a real DB session (not a local/guest fallback)
  const isRealDbSession = !sessionId.startsWith("local_") && !sessionId.startsWith("guest_");

  // Log and normalize zero-duration tests
  const originalDuration = stats.durationSeconds;
  if (originalDuration === 0) {
    console.warn(`[Test Session] Zero-duration test detected`, {
      sessionId,
      lessonId,
      userId: user.id,
      totalQuestions: stats.totalQuestions,
      scorePercent: stats.scorePercent,
    });

    // Round up to minimum 1 second
    stats.durationSeconds = 1;

    // Flag for analytics
    try {
      await supabase.from("activity_flags").insert({
        user_id: user.id,
        flag_type: "zero_duration_test",
        severity: "low",
        details: {
          sessionId,
          lessonId,
          totalQuestions: stats.totalQuestions,
          scorePercent: stats.scorePercent,
          originalDuration,
          normalizedDuration: stats.durationSeconds,
        },
      });
    } catch { /* non-critical */ }
  }

  // Detect auto-lesson early so the validation code below can branch
  // correctly. Auto-lessons (e.g. `auto-worst-{courseId}`) aren't rows in
  // the `lessons` table and don't have entries in `lesson_words`, so the
  // standard checks would otherwise return "Lesson not found" and abort
  // the save before any score, question, or word-progress row is written.
  const autoInfo = isAutoLesson(lessonId) ? parseAutoLessonId(lessonId) : null;

  // --- Anti-gaming validations ---

  // Resolve the upper bound for the question-count sanity check. Real
  // lessons use their own `word_count`; auto-lessons cap their pool at the
  // admin-configurable `auto_lesson_word_limit` (shared with
  // AUTO_LESSON_DEFINITIONS and the `select_best_worst_words_for_course`
  // RPC's p_limit).
  let lessonWordCount: number;
  if (autoInfo) {
    lessonWordCount = await getAutoLessonWordLimit();
  } else {
    const { data: lessonData } = await supabase
      .from("lessons")
      .select("word_count")
      .eq("id", lessonId)
      .single();

    if (!lessonData) {
      return { success: false, testSessionId: null, courseWordsMastered: 0, error: "Lesson not found" };
    }
    lessonWordCount = lessonData.word_count || 0;
  }

  // Verify totalQuestions doesn't exceed lesson word count * 2 (testTwice mode)
  if (stats.totalQuestions > lessonWordCount * 2) {
    try {
      await supabase.from("activity_flags").insert({
        user_id: user.id,
        flag_type: "question_count_exceeded",
        severity: "medium",
        details: { lessonId, totalQuestions: stats.totalQuestions, lessonWordCount },
      });
    } catch { /* non-critical */ }
  }

  // Verify word IDs belong to the lesson (or, for auto-lessons, to the
  // course). Auto-lessons have no `lesson_words` rows of their own, so we
  // accept any word that's part of any lesson in the course.
  const wordIds = questionResults.map((q) => q.wordId);
  const uniqueWordIds = [...new Set(wordIds)];

  if (uniqueWordIds.length > 0) {
    let validWordIds: Set<string>;
    if (autoInfo) {
      const { data: courseWords } = await supabase
        .from("lesson_words")
        .select("word_id, lessons!inner(course_id)")
        .eq("lessons.course_id", autoInfo.courseId)
        .in("word_id", uniqueWordIds);
      validWordIds = new Set(
        (courseWords || [])
          .map((lw) => lw.word_id)
          .filter((id): id is string => id !== null)
      );
    } else {
      const { data: lessonWords } = await supabase
        .from("lesson_words")
        .select("word_id")
        .eq("lesson_id", lessonId)
        .in("word_id", uniqueWordIds);
      validWordIds = new Set((lessonWords || []).map((lw) => lw.word_id));
    }
    const invalidWordIds = uniqueWordIds.filter((id) => !validWordIds.has(id));

    if (invalidWordIds.length > 0) {
      try {
        await supabase.from("activity_flags").insert({
          user_id: user.id,
          flag_type: "word_id_mismatch",
          severity: "high",
          details: { lessonId, invalidWordIds },
          session_id: isRealDbSession ? sessionId : null,
        });
      } catch { /* non-critical */ }
      return { success: false, testSessionId: null, courseWordsMastered: 0, error: "Invalid word IDs detected" };
    }
  }

  // Server-side re-scoring
  if (questionResults.length > 0) {
    const { data: wordData } = await supabase
      .from("words")
      .select("id, headword, alternate_answers")
      .in("id", uniqueWordIds);

    if (wordData) {
      const wordMap = new Map(wordData.map((w) => [w.id, w]));

      const { serverScoreAllQuestions } = await import("@/lib/utils/serverScoring");
      const scoringInput = questionResults.map((q) => {
        const word = wordMap.get(q.wordId);
        const validAnswers = word
          ? [word.headword, ...(word.alternate_answers || [])]
          : [q.correctAnswer];
        return {
          wordId: q.wordId,
          userAnswer: q.userAnswer,
          correctAnswers: validAnswers,
          clueLevel: q.clueLevel,
          clientPointsEarned: q.pointsEarned,
          clientMaxPoints: q.maxPoints,
        };
      });

      const serverResults = serverScoreAllQuestions(scoringInput);

      if (serverResults.hasMismatches) {
        // Log the mismatch
        try {
          await supabase.from("activity_flags").insert({
            user_id: user.id,
            flag_type: "score_mismatch",
            severity: "medium",
            details: JSON.parse(JSON.stringify({
              lessonId,
              clientPoints: stats.pointsEarned,
              serverPoints: serverResults.totalPointsEarned,
              mismatches: serverResults.results.filter((r) => !r.clientMatchesServer),
            })),
            session_id: isRealDbSession ? sessionId : null,
          });
        } catch { /* non-critical */ }

        // Use server values
        stats = {
          ...stats,
          pointsEarned: serverResults.totalPointsEarned,
          maxPoints: serverResults.totalMaxPoints,
          scorePercent: serverResults.totalMaxPoints > 0
            ? Math.round((serverResults.totalPointsEarned / serverResults.totalMaxPoints) * 100)
            : 0,
        };

        // Update question results with server values
        for (let i = 0; i < questionResults.length; i++) {
          questionResults[i] = {
            ...questionResults[i],
            pointsEarned: serverResults.results[i].serverPointsEarned,
            maxPoints: serverResults.results[i].serverMaxPoints,
            mistakeCount: serverResults.results[i].serverMistakeCount,
          };
        }
      }
    }
  }

  // Verify minimum time per question (2 seconds)
  if (stats.totalQuestions > 0 && stats.durationSeconds < stats.totalQuestions * 2) {
    try {
      await supabase.from("activity_flags").insert({
        user_id: user.id,
        flag_type: "impossible_speed",
        severity: "medium",
        details: {
          lessonId,
          totalQuestions: stats.totalQuestions,
          durationSeconds: stats.durationSeconds,
          secondsPerQuestion: stats.durationSeconds / stats.totalQuestions,
        },
        session_id: isRealDbSession ? sessionId : null,
      });
    } catch { /* non-critical */ }
  }

  // --- End anti-gaming validations ---

  // 1. End the study session in DB
  if (isRealDbSession) {
    const { error: sessionError } = await supabase
      .from("study_sessions")
      .update({
        ended_at: new Date().toISOString(),
        words_studied: stats.totalQuestions,
        words_mastered: stats.masteredWordsCount,
        duration_seconds: stats.durationSeconds,
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (sessionError) {
      console.error("Error ending test session:", sessionError);
      // Continue anyway - we still want to save the test score
    }
  }

  // 2. Determine the milestone for this test
  const milestoneResult = await determineMilestone(
    user.id,
    lessonId,
    intendedMilestone
  );

  // Helper: compute the modal-facing vocab count when returning a dedup'd
  // row. Auto-lessons aren't in `lessons`, so derive courseId from autoInfo.
  const computeDedupeVocabCount = async (): Promise<number> => {
    let dedupeCourseId: string | null = null;
    if (autoInfo) {
      dedupeCourseId = autoInfo.courseId;
    } else {
      const { data: lessonForCourse } = await supabase
        .from("lessons")
        .select("course_id")
        .eq("id", lessonId)
        .single();
      dedupeCourseId = lessonForCourse?.course_id ?? null;
    }
    if (!dedupeCourseId) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- function not yet in generated types
    const { data: vocabCount } = await (supabase.rpc as any)("get_course_vocab_count", {
      p_user_id: user.id,
      p_course_id: dedupeCourseId,
    });
    return (vocabCount as number) || 0;
  };

  // 3. Idempotency guard: a test_sessions row already linked to this
  // study_sessions.id means a previous completeTestSession call already
  // saved this submission. Replaces the old 30-second time window, which
  // silently swallowed legitimate fast retests.
  if (isRealDbSession) {
    const { data: existingScore } = await supabase
      .from("test_sessions")
      .select("id")
      .eq("study_session_id", sessionId)
      .maybeSingle();

    if (existingScore) {
      const dedupeVocabCount = await computeDedupeVocabCount();
      return {
        success: true,
        testSessionId: existingScore.id,
        courseWordsMastered: dedupeVocabCount,
        deduplicated: true,
        error: null,
      };
    }
  }

  // 4. Create test session record. Like the study_sessions write above,
  // exactly one of `lesson_id` or `(auto_lesson_type, course_id)` must be
  // populated. `study_session_id` is the canonical idempotency key.
  const scoreRef = resolveLessonIdRef(lessonId);
  const testSessionInsert: {
    user_id: string;
    lesson_id?: string;
    auto_lesson_type?: "notes" | "best" | "worst" | "unmastered" | "lost_mastery";
    course_id?: string;
    milestone: string;
    total_questions: number;
    correct_answers: number;
    points_earned: number;
    max_points: number;
    score_percent: number;
    duration_seconds: number;
    new_words_count: number;
    learned_words_count: number;
    mastered_words_count: number;
    is_retest: boolean;
    taken_at: string;
    direction: TestType;
    study_session_id?: string;
  } = {
    user_id: user.id,
    milestone: milestoneResult.recordedMilestone,
    total_questions: stats.totalQuestions,
    correct_answers: stats.correctAnswers,
    points_earned: stats.pointsEarned,
    max_points: stats.maxPoints,
    score_percent: stats.scorePercent,
    duration_seconds: stats.durationSeconds,
    new_words_count: stats.newWordsCount,
    learned_words_count: stats.newlyLearnedCount,
    mastered_words_count: stats.masteredWordsCount,
    is_retest: stats.isRetest,
    taken_at: new Date().toISOString(),
    direction,
  };
  if (scoreRef.kind === "real") {
    testSessionInsert.lesson_id = scoreRef.lessonId;
  } else if (scoreRef.kind === "auto") {
    testSessionInsert.auto_lesson_type = scoreRef.autoLessonType;
    testSessionInsert.course_id = scoreRef.courseId;
  }
  if (isRealDbSession) {
    testSessionInsert.study_session_id = sessionId;
  }

  const { data: testScore, error: testScoreError } = await supabase
    .from("test_sessions")
    .insert(testSessionInsert)
    .select("id")
    .single();

  if (testScoreError) {
    // 23505 = unique_violation on study_session_id: another concurrent call
    // beat us to the insert. Re-fetch by the idempotency key so the contract
    // stays idempotent (same shape as the pre-check hit).
    if (testScoreError.code === "23505" && isRealDbSession) {
      const { data: existing } = await supabase
        .from("test_sessions")
        .select("id")
        .eq("study_session_id", sessionId)
        .maybeSingle();
      if (existing) {
        const dedupeVocabCount = await computeDedupeVocabCount();
        return {
          success: true,
          testSessionId: existing.id,
          courseWordsMastered: dedupeVocabCount,
          deduplicated: true,
          error: null,
        };
      }
    }
    console.error("Error creating test score:", testScoreError);
    return { success: false, testSessionId: null, courseWordsMastered: 0, error: testScoreError.message };
  }

  // 4. Save individual test question results. attempt_number disambiguates
  // multiple rows for the same (test_session_id, word_id) — a Test Twice
  // session writes one row per attempt. We count per-word as we go so a
  // single client-side word with two attempts gets 1 then 2.
  if (questionResults.length > 0) {
    const attemptCounts = new Map<string, number>();
    const questionsToInsert = questionResults.map((q) => {
      const next = (attemptCounts.get(q.wordId) ?? 0) + 1;
      attemptCounts.set(q.wordId, next);
      return {
        test_session_id: testScore.id,
        word_id: q.wordId,
        user_answer: q.userAnswer,
        correct_answer: q.correctAnswer,
        clue_level: q.clueLevel,
        mistake_count: q.mistakeCount,
        points_earned: q.pointsEarned,
        max_points: q.maxPoints,
        time_to_answer_ms: q.timeToAnswerMs || null,
        answered_at: new Date().toISOString(),
        attempt_number: next,
      };
    });

    const { error: questionsError } = await supabase
      .from("test_questions")
      .insert(questionsToInsert);

    if (questionsError) {
      console.error("Error saving test questions:", questionsError);
      // Continue anyway - main score is saved
    }
  }

  // 5. Update word progress — one streak attempt per `test_questions` row.
  // A Test Twice session writes two rows for the same word and therefore
  // contributes two streak ticks (one per attempt). Traffic-light strips
  // and streak/status share this per-row unit so they cannot drift.
  let wordProgressFailures = 0;
  for (const q of questionResults) {
    try {
      const result = await updateWordTestProgress(
        user.id,
        q.wordId,
        q.clueLevel,
        q.mistakeCount,
        q.pointsEarned
      );
      if (!result.success) {
        wordProgressFailures++;
      }
    } catch (err) {
      wordProgressFailures++;
      console.error(`Unexpected error updating word progress for ${q.wordId}:`, err);
    }
  }
  if (wordProgressFailures > 0) {
    console.warn(`[Test Session] ${wordProgressFailures}/${questionResults.length} word progress updates failed`);
  }

  // 5b. Recalculate lesson progress (words_mastered count) from updated word
  // progress. Auto-lessons (auto-{type}-{courseId}) aren't rows in `lessons`
  // and don't have a `user_lesson_progress` summary — their stats are derived
  // live from per-word progress, and their test_score row is already saved.
  // (`autoInfo` is computed earlier alongside the validation branch.)
  if (!autoInfo) {
    const lessonProgressResult = await updateLessonProgress(lessonId, stats.durationSeconds);
    if (!lessonProgressResult.success) {
      console.error("Error updating lesson progress:", lessonProgressResult.error);
      // Continue anyway - test score is already saved
    }
  }

  // 5c. Fire any achievement notifications the user just unlocked. Internally
  // idempotent — safe to call on every test completion. Errors are swallowed
  // so they never block the test flow.
  await recordProgressAchievements({
    userId: user.id,
    testResult: {
      scorePercent: stats.scorePercent,
      isRetest: stats.isRetest,
    },
  });

  // 6. Advance milestone schedule if this counted as a milestone test
  if (milestoneResult.shouldAdvance && milestoneResult.completedMilestone) {
    await advanceMilestoneSchedule(
      user.id,
      lessonId,
      milestoneResult.completedMilestone
    );
  }

  // Fetch course info for activity recording and mastered word count.
  // Auto-lessons aren't in `lessons`, so derive course_id from the parsed
  // auto-lesson ID and look up the language directly on the course.
  let courseId: string | null = null;
  let languageId: string | null = null;
  if (autoInfo) {
    courseId = autoInfo.courseId;
    const { data: courseRow } = await supabase
      .from("courses")
      .select("language_id")
      .eq("id", courseId)
      .single();
    languageId = courseRow?.language_id ?? null;
  } else {
    const { data: lessonWithCourse } = await supabase
      .from("lessons")
      .select("course_id, courses(language_id)")
      .eq("id", lessonId)
      .single();
    courseId = lessonWithCourse?.course_id ?? null;
    languageId = (lessonWithCourse?.courses as { language_id: string } | null)?.language_id ?? null;
  }

  // Record daily activity for leaderboard/streak tracking
  try {
    if (languageId) {
      const { recordActivity } = await import("./activity");
      await recordActivity({
        languageId,
        wordsStudied: stats.totalQuestions,
        wordsMastered: stats.masteredWordsCount,
        testPointsEarned: stats.pointsEarned,
        testMaxPoints: stats.maxPoints,
        studyTimeSeconds: stats.durationSeconds,
      });
    }
  } catch {
    // Non-critical — don't fail the session completion
  }

  // 7. Get learned+mastered word count scoped to this course via DB function
  // (avoids massive .in() clause that exceeds PostgREST URL length limits)
  let courseWordsMastered = 0;
  if (courseId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- function not yet in generated types
    const { data: vocabCount, error: rpcError } = await (supabase.rpc as any)("get_course_vocab_count", {
      p_user_id: user.id,
      p_course_id: courseId,
    });
    if (rpcError) {
      console.error("[Test Session] get_course_vocab_count RPC error:", rpcError);
    }
    console.log("[Test Session] courseVocab:", { courseId, userId: user.id, vocabCount, type: typeof vocabCount });
    courseWordsMastered = (vocabCount as number) || 0;
  } else {
    console.warn("[Test Session] No courseId found for lesson", lessonId);
  }

  // Revalidate all pages that display lesson/word stats
  revalidatePath(`/lesson/${lessonId}`);
  if (courseId) {
    revalidatePath(`/course/${courseId}`);
    revalidatePath(`/course/${courseId}/schedule`);
    revalidatePath(`/course/${courseId}/tests`);
    revalidatePath(`/course/${courseId}/progress`);
  }

  return { success: true, testSessionId: testScore.id, courseWordsMastered, error: null };
}

/**
 * Determine what milestone this test should be recorded as
 */
async function determineMilestone(
  userId: string,
  lessonId: string,
  intendedMilestone?: string | null
): Promise<{
  recordedMilestone: string;
  shouldAdvance: boolean;
  completedMilestone: Milestone | null;
}> {
  const supabase = await createClient();

  // Get the lesson's current milestone schedule
  const { data: progress } = await supabase
    .from("user_lesson_progress")
    .select("next_milestone, next_test_due_at")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const nextMilestone = progress?.next_milestone;
  const nextTestDueAt = progress?.next_test_due_at
    ? new Date(progress.next_test_due_at)
    : null;
  const now = new Date();

  // Case 1: Intended milestone was explicitly passed (from scheduler or lesson completion modal)
  if (intendedMilestone && isValidMilestone(intendedMilestone)) {
    // If the intended milestone matches the scheduled next milestone, advance the schedule
    if (intendedMilestone === nextMilestone) {
      return {
        recordedMilestone: intendedMilestone,
        shouldAdvance: true,
        completedMilestone: intendedMilestone,
      };
    }
    // Otherwise record as the intended milestone but don't advance (e.g., retaking a past test)
    return {
      recordedMilestone: intendedMilestone,
      shouldAdvance: false,
      completedMilestone: null,
    };
  }

  // Case 2: Self-initiated test (no intended milestone) - check if close enough to count
  if (
    nextMilestone &&
    isValidMilestone(nextMilestone) &&
    shouldCountAsMilestone(nextMilestone, nextTestDueAt, now)
  ) {
    return {
      recordedMilestone: nextMilestone,
      shouldAdvance: true,
      completedMilestone: nextMilestone,
    };
  }

  // Case 3: Self-initiated test that doesn't count as milestone
  return {
    recordedMilestone: "other",
    shouldAdvance: false,
    completedMilestone: null,
  };
}

/**
 * Advance the milestone schedule after completing a milestone test.
 *
 * This only touches milestone scheduling fields — it must NOT overwrite
 * `status`, `words_mastered`, or `completion_percent`, which are the
 * canonical outputs of `updateLessonProgress` and are always refreshed
 * earlier in `completeTestSession`. Overwriting `status` here used to
 * silently demote freshly-mastered lessons back to "learning".
 *
 * Safe to use .update() (not upsert) because `completeTestSession` always
 * runs `updateLessonProgress` first, which creates the row if missing.
 */
async function advanceMilestoneSchedule(
  userId: string,
  lessonId: string,
  completedMilestone: Milestone
): Promise<void> {
  const supabase = await createClient();
  const now = new Date();

  const nextMilestone = getNextMilestone(completedMilestone);
  const nextTestDueAt = calculateNextTestDueAt(completedMilestone, now);

  const { error } = await supabase
    .from("user_lesson_progress")
    .update({
      next_milestone: nextMilestone,
      next_test_due_at: nextTestDueAt?.toISOString() || null,
    })
    .eq("user_id", userId)
    .eq("lesson_id", lessonId);

  if (error) {
    console.error(`Error advancing milestone schedule for lesson ${lessonId}:`, error);
  }
}

// ============================================================================
// WORD PROGRESS UPDATES
// ============================================================================

/**
 * Update word progress after a test attempt
 */
async function updateWordTestProgress(
  userId: string,
  wordId: string,
  clueLevel: 0 | 1 | 2,
  mistakeCount: number,
  pointsEarned: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get existing progress
  const { data: existingProgress } = await supabase
    .from("user_word_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("word_id", wordId)
    .maybeSingle();

  const now = new Date();
  // Full marks only: no mistakes AND no clues used (3/3 points)
  const isCorrect = mistakeCount === 0 && clueLevel === 0;

  // Calculate new values
  const currentTimesTested = existingProgress?.times_tested || 0;
  const currentTotalPoints = existingProgress?.total_points_earned || 0;
  const currentBestClueLevel = existingProgress?.best_clue_level ?? 2;
  const currentStreak = existingProgress?.correct_streak || 0;
  const currentStatus = (existingProgress?.status as "not-started" | "learning" | "learned" | "mastered" | undefined) || "not-started";

  // Best clue level is the minimum clue level used for a correct answer
  // Lower is better (0 = no clues needed)
  let newBestClueLevel = currentBestClueLevel;
  if (isCorrect && clueLevel < currentBestClueLevel) {
    newBestClueLevel = clueLevel;
  }

  // Update streak
  const newStreak = isCorrect ? currentStreak + 1 : 0;

  // Determine new status
  // Rules:
  //   - 3+ correct in a row → mastered
  //   - Correct answer → learned (first correct = learned)
  //   - Was learned/mastered + wrong answer → learned (floor — never drops below learned)
  //   - Was learning + wrong answer → learning (floor)
  //   - Wrong answer on a not-started word → stay not-started (prevents gibberish-test promotion)
  let newStatus: "not-started" | "learning" | "learned" | "mastered";
  if (newStreak >= 3) {
    newStatus = "mastered";
  } else if (isCorrect) {
    newStatus = "learned";
  } else if (currentStatus === "learned" || currentStatus === "mastered") {
    newStatus = "learned"; // floor: never drop below learned
  } else if (currentStatus === "learning") {
    newStatus = "learning"; // floor: never drop below learning
  } else {
    newStatus = "not-started";
  }

  // Preserve the first-time mastery timestamp — never overwrite once set.
  const masteredAt =
    newStatus === "mastered"
      ? existingProgress?.mastered_at || now.toISOString()
      : existingProgress?.mastered_at || null;

  // Preserve the first-time learned timestamp — immutable once set.
  const learnedAt =
    (newStatus === "learned" || newStatus === "mastered")
      ? existingProgress?.learned_at || now.toISOString()
      : existingProgress?.learned_at || null;

  // Preserve the first-time learning timestamp — never overwrite once set.
  const learningAt =
    newStatus !== "not-started"
      ? existingProgress?.learning_at || now.toISOString()
      : existingProgress?.learning_at || null;

  const progressData = {
    user_id: userId,
    word_id: wordId,
    status: newStatus,
    correct_streak: newStreak,
    times_tested: currentTimesTested + 1,
    total_points_earned: currentTotalPoints + pointsEarned,
    best_clue_level: newBestClueLevel,
    last_mistake_count: mistakeCount,
    last_studied_at: now.toISOString(),
    mastered_at: masteredAt,
    learned_at: learnedAt,
    learning_at: learningAt,
  };

  if (existingProgress) {
    const { error } = await supabase
      .from("user_word_progress")
      .update(progressData)
      .eq("id", existingProgress.id);
    if (error) {
      console.error(`Error updating word progress for word ${wordId}:`, error);
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("user_word_progress")
      .insert(progressData);
    if (error) {
      console.error(`Error inserting word progress for word ${wordId}:`, error);
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}
