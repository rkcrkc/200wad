"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Milestone } from "@/lib/utils/milestones";

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
// WORD NOTES ACTIONS
// ============================================================================

/**
 * Save system notes for a word (admin only)
 * Updates the word's notes field directly
 */
export async function saveSystemNotes(
  wordId: string,
  notes: string | null
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // Check if user is admin
  const isAdmin = user.user_metadata?.role === "admin";
  if (!isAdmin) {
    return { success: false, error: "Admin access required" };
  }

  const { error } = await supabase
    .from("words")
    .update({ notes })
    .eq("id", wordId);

  if (error) {
    console.error("Error saving system notes:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
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
 * Batch save user notes for multiple words
 * Study mode only saves notes - progress/mastery is tracked in test mode only
 */
export async function batchSaveUserNotes(
  updates: Array<{
    wordId: string;
    userNotes?: string | null;
  }>
): Promise<{ success: boolean; error: string | null }> {
  // Only save notes for words that have notes
  const wordsWithNotes = updates.filter((u) => u.userNotes !== undefined && u.userNotes !== null);

  if (wordsWithNotes.length === 0) {
    return { success: true, error: null };
  }

  const results = await Promise.all(
    wordsWithNotes.map((update) => saveUserNotes(update.wordId, update.userNotes ?? null))
  );

  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    return {
      success: false,
      error: `Failed to save notes for ${failed.length} word(s)`,
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
 * Complete a study session - saves notes and records study time
 * Note: Study mode does NOT affect word mastery/streaks - only test mode does
 * Also sets the initial test milestone if this is the first time completing this lesson
 */
export async function completeStudySession(
  sessionId: string,
  lessonId: string,
  stats: {
    wordsStudied: number;
    durationSeconds: number;
  },
  pendingNotes: Array<{
    wordId: string;
    userNotes?: string | null;
  }>
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // Save any user notes
  if (pendingNotes.length > 0) {
    const batchResult = await batchSaveUserNotes(pendingNotes);
    if (!batchResult.success) {
      console.error("Failed to save user notes:", batchResult.error);
      // Continue anyway - we still want to record the session
    }
  }

  // Check if this is a real DB session (not a local/guest fallback)
  const isRealDbSession = !sessionId.startsWith("local_") && !sessionId.startsWith("guest_");

  if (isRealDbSession) {
    // End the study session in DB (just records time spent, no mastery stats)
    const sessionResult = await endStudySession(sessionId, {
      wordsStudied: stats.wordsStudied,
      wordsMastered: 0, // Study mode doesn't track mastery
      durationSeconds: stats.durationSeconds,
    });
    if (!sessionResult.success) {
      console.error("Failed to end study session:", sessionResult.error);
    }
  }

  // Update lesson progress to record study time
  const lessonResult = await updateLessonProgress(lessonId, stats.durationSeconds);
  if (!lessonResult.success) {
    return lessonResult;
  }

  // Set initial test milestone if this is the first time completing this lesson
  await setInitialMilestoneIfNeeded(user.id, lessonId);

  return { success: true, error: null };
}

/**
 * Set the initial test milestone for a lesson if not already set
 * Called when a user completes studying a lesson for the first time
 */
async function setInitialMilestoneIfNeeded(
  userId: string,
  lessonId: string
): Promise<void> {
  const supabase = await createClient();

  // Get existing lesson progress
  const { data: progress } = await supabase
    .from("user_lesson_progress")
    .select("id, next_milestone")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  // Only set milestone if it's not already set
  if (progress && !progress.next_milestone) {
    const now = new Date().toISOString();
    const initialMilestone: Milestone = "initial";

    await supabase
      .from("user_lesson_progress")
      .update({
        next_milestone: initialMilestone,
        next_test_due_at: now, // Initial test is due immediately
      })
      .eq("id", progress.id);
  }
}
