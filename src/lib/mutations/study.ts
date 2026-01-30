"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// STUDY SESSION ACTIONS
// ============================================================================

export interface CreateStudySessionResult {
  sessionId: string | null;
  error: string | null;
}

/**
 * Create a new study session when entering Study Mode
 */
export async function createStudySession(
  lessonId: string
): Promise<CreateStudySessionResult> {
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
      session_type: "study",
      started_at: new Date().toISOString(),
      words_studied: 0,
      words_mastered: 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating study session:", error);
    return { sessionId: null, error: error.message };
  }

  return { sessionId: data.id, error: null };
}

export interface EndStudySessionResult {
  success: boolean;
  error: string | null;
}

/**
 * End a study session with final stats
 */
export async function endStudySession(
  sessionId: string,
  stats: {
    wordsStudied: number;
    wordsMastered: number;
    durationSeconds: number;
  }
): Promise<EndStudySessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const { error } = await supabase
    .from("study_sessions")
    .update({
      ended_at: new Date().toISOString(),
      words_studied: stats.wordsStudied,
      words_mastered: stats.wordsMastered,
      duration_seconds: stats.durationSeconds,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error ending study session:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// ============================================================================
// WORD PROGRESS ACTIONS
// ============================================================================

export interface UpdateWordProgressResult {
  success: boolean;
  newStatus: "not-started" | "studying" | "mastered" | null;
  error: string | null;
}

/**
 * Update progress for a single word after answering
 */
export async function updateWordProgress(
  wordId: string,
  isCorrect: boolean,
  userNotes?: string | null
): Promise<UpdateWordProgressResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, newStatus: null, error: "User not authenticated" };
  }

  // Get existing progress (may not exist for new words)
  const { data: existingProgress } = await supabase
    .from("user_word_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("word_id", wordId)
    .maybeSingle();

  const currentStreak = existingProgress?.correct_streak || 0;
  const newStreak = isCorrect ? currentStreak + 1 : 0;

  // Determine new status based on streak
  // Word is mastered after 3 correct answers in a row
  let newStatus: "not-started" | "studying" | "mastered" = "studying";
  if (newStreak >= 3) {
    newStatus = "mastered";
  }

  // Calculate next review date (simple spaced repetition)
  const now = new Date();
  let nextReviewAt: Date | null = null;
  if (newStatus === "mastered") {
    // Review in 1 day for newly mastered words
    nextReviewAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  } else if (isCorrect) {
    // Review in 4 hours if correct but not mastered
    nextReviewAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  } else {
    // Review in 1 hour if incorrect
    nextReviewAt = new Date(now.getTime() + 60 * 60 * 1000);
  }

  const progressData = {
    user_id: user.id,
    word_id: wordId,
    status: newStatus,
    correct_streak: newStreak,
    last_studied_at: now.toISOString(),
    next_review_at: nextReviewAt.toISOString(),
    mastered_at: newStatus === "mastered" ? now.toISOString() : existingProgress?.mastered_at || null,
    user_notes: userNotes !== undefined ? userNotes : existingProgress?.user_notes || null,
  };

  let error;
  if (existingProgress) {
    // Update existing record
    const result = await supabase
      .from("user_word_progress")
      .update(progressData)
      .eq("id", existingProgress.id);
    error = result.error;
  } else {
    // Insert new record
    const result = await supabase
      .from("user_word_progress")
      .insert(progressData);
    error = result.error;
  }

  if (error) {
    console.error("Error updating word progress:", error);
    return { success: false, newStatus: null, error: error.message };
  }

  return { success: true, newStatus, error: null };
}

/**
 * Save user notes for a word without affecting progress/streak
 * Used when user edits notes but hasn't answered yet
 */
export async function saveUserNotes(
  wordId: string,
  userNotes: string | null
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // Get existing progress (may not exist for new words)
  const { data: existingProgress } = await supabase
    .from("user_word_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("word_id", wordId)
    .maybeSingle();

  let error;
  if (existingProgress) {
    // Update only the notes field
    const result = await supabase
      .from("user_word_progress")
      .update({ user_notes: userNotes })
      .eq("id", existingProgress.id);
    error = result.error;
  } else {
    // Insert new record with notes only (status stays not-started)
    const result = await supabase
      .from("user_word_progress")
      .insert({
        user_id: user.id,
        word_id: wordId,
        status: "not-started",
        correct_streak: 0,
        user_notes: userNotes,
      });
    error = result.error;
  }

  if (error) {
    console.error("Error saving user notes:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Batch update word progress for multiple words
 * Used when exiting a lesson to save all pending progress
 */
export async function batchUpdateWordProgress(
  updates: Array<{
    wordId: string;
    isCorrect: boolean;
    userNotes?: string | null;
    hasAnswered?: boolean;
  }>
): Promise<{ success: boolean; error: string | null }> {
  const results = await Promise.all(
    updates.map((update) => {
      // If user hasn't answered but has notes, just save the notes
      if (update.hasAnswered === false && update.userNotes !== undefined) {
        return saveUserNotes(update.wordId, update.userNotes);
      }
      // Otherwise update full progress
      return updateWordProgress(update.wordId, update.isCorrect, update.userNotes);
    })
  );

  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    return {
      success: false,
      error: `Failed to update ${failed.length} word(s)`,
    };
  }

  return { success: true, error: null };
}

// ============================================================================
// LESSON PROGRESS ACTIONS
// ============================================================================

export interface UpdateLessonProgressResult {
  success: boolean;
  error: string | null;
}

/**
 * Update lesson progress by aggregating word progress
 */
export async function updateLessonProgress(
  lessonId: string,
  additionalTimeSeconds: number = 0
): Promise<UpdateLessonProgressResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // Get lesson word count
  const { data: lesson } = await supabase
    .from("lessons")
    .select("word_count")
    .eq("id", lessonId)
    .single();

  if (!lesson) {
    return { success: false, error: "Lesson not found" };
  }

  // Get all words in this lesson
  const { data: words } = await supabase
    .from("words")
    .select("id")
    .eq("lesson_id", lessonId);

  if (!words || words.length === 0) {
    return { success: false, error: "No words found in lesson" };
  }

  // Get user's progress for all words in this lesson
  const { data: wordProgress } = await supabase
    .from("user_word_progress")
    .select("status")
    .eq("user_id", user.id)
    .in(
      "word_id",
      words.map((w) => w.id)
    );

  // Calculate stats
  const wordsMastered = wordProgress?.filter((wp) => wp.status === "mastered").length || 0;
  const wordsStudied = wordProgress?.filter((wp) => wp.status !== "not-started").length || 0;
  const totalWords = lesson.word_count || words.length;
  const completionPercent = totalWords > 0 ? Math.round((wordsMastered / totalWords) * 100) : 0;

  // Determine lesson status
  let lessonStatus: "not-started" | "studying" | "mastered" = "not-started";
  if (completionPercent >= 100) {
    lessonStatus = "mastered";
  } else if (wordsStudied > 0) {
    lessonStatus = "studying";
  }

  // Get existing lesson progress (may not exist for new lessons)
  const { data: existingProgress } = await supabase
    .from("user_lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const currentTotalTime = existingProgress?.total_study_time_seconds || 0;

  const progressData = {
    user_id: user.id,
    lesson_id: lessonId,
    status: lessonStatus,
    completion_percent: completionPercent,
    words_mastered: wordsMastered,
    total_study_time_seconds: currentTotalTime + additionalTimeSeconds,
    last_studied_at: new Date().toISOString(),
  };

  let error;
  if (existingProgress) {
    const result = await supabase
      .from("user_lesson_progress")
      .update(progressData)
      .eq("id", existingProgress.id);
    error = result.error;
  } else {
    const result = await supabase
      .from("user_lesson_progress")
      .insert(progressData);
    error = result.error;
  }

  if (error) {
    console.error("Error updating lesson progress:", error);
    return { success: false, error: error.message };
  }

  // Revalidate lesson pages
  revalidatePath(`/lesson/${lessonId}`);

  return { success: true, error: null };
}

/**
 * Complete a study session - ends the session and updates lesson progress
 */
export async function completeStudySession(
  sessionId: string,
  lessonId: string,
  stats: {
    wordsStudied: number;
    wordsMastered: number;
    durationSeconds: number;
  },
  pendingUpdates: Array<{
    wordId: string;
    isCorrect: boolean;
    userNotes?: string | null;
    hasAnswered?: boolean;
  }>
): Promise<{ success: boolean; error: string | null }> {
  // First, save all pending word progress
  if (pendingUpdates.length > 0) {
    const batchResult = await batchUpdateWordProgress(pendingUpdates);
    if (!batchResult.success) {
      console.error("Failed to save word progress:", batchResult.error);
      // Continue anyway - we still want to update lesson progress
    }
  }

  // Check if this is a real DB session (not a local/guest fallback)
  const isRealDbSession = !sessionId.startsWith("local_") && !sessionId.startsWith("guest_");
  
  if (isRealDbSession) {
    // End the study session in DB
    const sessionResult = await endStudySession(sessionId, stats);
    if (!sessionResult.success) {
      console.error("Failed to end study session:", sessionResult.error);
      // Continue anyway - we still want to update lesson progress
    }
  }

  // Always update lesson progress (aggregates from word progress)
  const lessonResult = await updateLessonProgress(lessonId, stats.durationSeconds);
  if (!lessonResult.success) {
    return lessonResult;
  }

  return { success: true, error: null };
}
