"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
}

export interface CompleteTestSessionResult {
  success: boolean;
  testScoreId: string | null;
  error: string | null;
}

/**
 * Complete a test session - saves test scores and updates word progress
 */
export async function completeTestSession(
  sessionId: string,
  lessonId: string,
  stats: TestStats,
  questionResults: TestQuestionResult[]
): Promise<CompleteTestSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, testScoreId: null, error: "User not authenticated" };
  }

  // Check if this is a real DB session (not a local/guest fallback)
  const isRealDbSession = !sessionId.startsWith("local_") && !sessionId.startsWith("guest_");

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

  // 2. Create test score record
  const { data: testScore, error: testScoreError } = await supabase
    .from("user_test_scores")
    .insert({
      user_id: user.id,
      lesson_id: lessonId,
      milestone: "other",
      total_questions: stats.totalQuestions,
      correct_answers: stats.correctAnswers,
      points_earned: stats.pointsEarned,
      max_points: stats.maxPoints,
      score_percent: stats.scorePercent,
      duration_seconds: stats.durationSeconds,
      new_words_count: stats.newWordsCount,
      mastered_words_count: stats.masteredWordsCount,
      taken_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (testScoreError) {
    console.error("Error creating test score:", testScoreError);
    return { success: false, testScoreId: null, error: testScoreError.message };
  }

  // 3. Save individual test question results
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

  // 4. Update word progress for each tested word
  for (const question of questionResults) {
    await updateWordTestProgress(
      user.id,
      question.wordId,
      question.clueLevel,
      question.mistakeCount,
      question.pointsEarned
    );
  }

  // Revalidate lesson pages
  revalidatePath(`/lesson/${lessonId}`);

  return { success: true, testScoreId: testScore.id, error: null };
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

  // Best clue level is the minimum clue level used for a correct answer
  // Lower is better (0 = no clues needed)
  let newBestClueLevel = currentBestClueLevel;
  if (isCorrect && clueLevel < currentBestClueLevel) {
    newBestClueLevel = clueLevel;
  }

  // Update streak
  const newStreak = isCorrect ? currentStreak + 1 : 0;

  // Determine new status
  let newStatus: "not-started" | "studying" | "mastered" = "studying";
  if (newStreak >= 3) {
    newStatus = "mastered";
  }

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
    mastered_at: newStatus === "mastered" ? now.toISOString() : existingProgress?.mastered_at || null,
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
