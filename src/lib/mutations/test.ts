"use server";

import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ALL_ROWS, warnIfTruncated } from "@/lib/supabase/utils";
import { revalidatePath } from "next/cache";
import {
  type Milestone,
  isValidMilestone,
  shouldCountAsMilestone,
  getNextMilestone,
  calculateNextTestDueAt,
} from "@/lib/utils/milestones";
import { updateLessonProgress } from "./study";

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

  // Auto-end orphaned test sessions for this lesson
  await supabase
    .from("study_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .eq("session_type", "test")
    .is("ended_at", null);

  const { data, error } = await supabase
    .from("study_sessions")
    .insert({
      user_id: user.id,
      lesson_id: lessonId,
      session_type: "test",
      started_at: new Date().toISOString(),
      words_studied: 0,
      words_mastered: 0,
    })
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
  masteredWordsCount: number;
  isRetest: boolean;
}

export interface CompleteTestSessionResult {
  success: boolean;
  testScoreId: string | null;
  /** Mastered word count scoped to the current course. */
  courseWordsMastered: number;
  error: string | null;
}

/**
 * Complete a test session - saves test scores and updates word progress
 * @param intendedMilestone - The milestone this test was started for (from URL param), or null for self-initiated
 */
export async function completeTestSession(
  sessionId: string,
  lessonId: string,
  inputStats: TestStats,
  inputQuestionResults: TestQuestionResult[],
  intendedMilestone?: string | null
): Promise<CompleteTestSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, testScoreId: null, courseWordsMastered: 0, error: "User not authenticated" };
  }

  // Mutable copies so server-side re-scoring can override client values
  let stats = { ...inputStats };
  let questionResults = inputQuestionResults.map((q) => ({ ...q }));

  // Check if this is a real DB session (not a local/guest fallback)
  const isRealDbSession = !sessionId.startsWith("local_") && !sessionId.startsWith("guest_");

  // --- Anti-gaming validations ---

  // Validate lesson exists and get word count
  const { data: lessonData } = await supabase
    .from("lessons")
    .select("word_count")
    .eq("id", lessonId)
    .single();

  if (!lessonData) {
    return { success: false, testScoreId: null, courseWordsMastered: 0, error: "Lesson not found" };
  }

  // Verify totalQuestions doesn't exceed lesson word count * 2 (testTwice mode)
  if (stats.totalQuestions > (lessonData.word_count || 0) * 2) {
    try {
      await supabase.from("activity_flags").insert({
        user_id: user.id,
        flag_type: "question_count_exceeded",
        severity: "medium",
        details: { lessonId, totalQuestions: stats.totalQuestions, lessonWordCount: lessonData.word_count },
      });
    } catch { /* non-critical */ }
  }

  // Verify word IDs belong to the lesson
  const wordIds = questionResults.map((q) => q.wordId);
  const uniqueWordIds = [...new Set(wordIds)];

  if (uniqueWordIds.length > 0) {
    const { data: lessonWords } = await supabase
      .from("lesson_words")
      .select("word_id")
      .eq("lesson_id", lessonId)
      .in("word_id", uniqueWordIds);

    const validWordIds = new Set((lessonWords || []).map((lw) => lw.word_id));
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
      return { success: false, testScoreId: null, courseWordsMastered: 0, error: "Invalid word IDs detected" };
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

  // 3. Create test score record
  const { data: testScore, error: testScoreError } = await supabase
    .from("user_test_scores")
    .insert({
      user_id: user.id,
      lesson_id: lessonId,
      milestone: milestoneResult.recordedMilestone,
      total_questions: stats.totalQuestions,
      correct_answers: stats.correctAnswers,
      points_earned: stats.pointsEarned,
      max_points: stats.maxPoints,
      score_percent: stats.scorePercent,
      duration_seconds: stats.durationSeconds,
      new_words_count: stats.newWordsCount,
      mastered_words_count: stats.masteredWordsCount,
      is_retest: stats.isRetest,
      taken_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (testScoreError) {
    console.error("Error creating test score:", testScoreError);
    return { success: false, testScoreId: null, courseWordsMastered: 0, error: testScoreError.message };
  }

  // 4. Save individual test question results
  if (questionResults.length > 0) {
    const questionsToInsert = questionResults.map((q) => ({
      test_score_id: testScore.id,
      word_id: q.wordId,
      user_answer: q.userAnswer,
      correct_answer: q.correctAnswer,
      clue_level: q.clueLevel,
      mistake_count: q.mistakeCount,
      points_earned: q.pointsEarned,
      max_points: q.maxPoints,
      time_to_answer_ms: q.timeToAnswerMs || null,
      answered_at: new Date().toISOString(),
    }));

    const { error: questionsError } = await supabase
      .from("test_questions")
      .insert(questionsToInsert);

    if (questionsError) {
      console.error("Error saving test questions:", questionsError);
      // Continue anyway - main score is saved
    }
  }

  // 5. Update word progress for each tested word
  for (const question of questionResults) {
    await updateWordTestProgress(
      user.id,
      question.wordId,
      question.clueLevel,
      question.mistakeCount,
      question.pointsEarned
    );
  }

  // 5b. Recalculate lesson progress (words_mastered count) from updated word progress
  await updateLessonProgress(lessonId, stats.durationSeconds);

  // 6. Advance milestone schedule if this counted as a milestone test
  if (milestoneResult.shouldAdvance && milestoneResult.completedMilestone) {
    await advanceMilestoneSchedule(
      user.id,
      lessonId,
      milestoneResult.completedMilestone
    );
  }

  // Fetch course info for activity recording and mastered word count
  const { data: lessonWithCourse } = await supabase
    .from("lessons")
    .select("course_id, courses(language_id)")
    .eq("id", lessonId)
    .single();

  // Record daily activity for leaderboard/streak tracking
  try {
    const languageId = (lessonWithCourse?.courses as { language_id: string } | null)?.language_id;
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

  // 7. Get mastered word count scoped to this course
  const courseId = lessonWithCourse?.course_id;
  let courseWordsMastered = 0;
  if (courseId) {
    // Get all word IDs in this course via lesson_words junction
    const { data: courseWords } = await supabase
      .from("lesson_words")
      .select("word_id, lessons!inner(course_id), words(category)")
      .eq("lessons.course_id", courseId)
      .limit(SUPABASE_ALL_ROWS);
    warnIfTruncated("completeTestSession:lesson_words", courseWords?.length ?? 0);

    if (courseWords && courseWords.length > 0) {
      // Exclude information pages from course word count
      const testableWords = courseWords.filter(
        (cw) => (cw.words as unknown as { category: string | null })?.category !== "information"
      );
      const courseWordIds = new Set(testableWords.map((cw) => cw.word_id));
      const { count } = await supabase
        .from("user_word_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "mastered")
        .in("word_id", [...courseWordIds]);
      courseWordsMastered = count || 0;
    }
  }

  // Revalidate lesson pages
  revalidatePath(`/lesson/${lessonId}`);

  return { success: true, testScoreId: testScore.id, courseWordsMastered, error: null };
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

  await supabase
    .from("user_lesson_progress")
    .update({
      next_milestone: nextMilestone,
      next_test_due_at: nextTestDueAt?.toISOString() || null,
    })
    .eq("user_id", userId)
    .eq("lesson_id", lessonId);
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
): Promise<void> {
  const supabase = await createClient();

  // Get existing progress
  const { data: existingProgress } = await supabase
    .from("user_word_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("word_id", wordId)
    .maybeSingle();

  const now = new Date();
  const isCorrect = mistakeCount === 0;

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
    await supabase
      .from("user_word_progress")
      .update(progressData)
      .eq("id", existingProgress.id);
  } else {
    await supabase
      .from("user_word_progress")
      .insert(progressData);
  }
}
