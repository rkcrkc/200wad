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

  // Delete orphaned sessions for this lesson (incomplete sessions that were never finished)
  // These are sessions where the user clicked "Study" but left before completing
  await supabase
    .from("study_sessions")
    .delete()
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .is("ended_at", null);

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
 * Developer data for debugging word content issues
 */
export interface DeveloperData {
  developer_notes: string | null;
  picture_wrong: boolean;
  picture_wrong_notes: string | null;
  picture_missing: boolean;
  picture_bad_svg: boolean;
  notes_in_memory_trigger: boolean;
}

/**
 * Save developer data for a word (admin only)
 * Used for debugging course content issues
 */
export async function saveDeveloperData(
  wordId: string,
  data: DeveloperData
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
    .update({
      developer_notes: data.developer_notes,
      picture_wrong: data.picture_wrong,
      picture_wrong_notes: data.picture_wrong ? data.picture_wrong_notes : null,
      picture_missing: data.picture_missing,
      picture_bad_svg: data.picture_bad_svg,
      notes_in_memory_trigger: data.notes_in_memory_trigger,
    })
    .eq("id", wordId);

  if (error) {
    console.error("Error saving developer data:", error);
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
// WORD STATUS TRANSITIONS (study mode)
// ============================================================================

/**
 * Mark words as "learning" when the user submits an answer in study mode.
 *
 * Transition rules — NEVER demote:
 *   - no existing row           → INSERT status='learning', learning_at=now()
 *   - existing not-started row  → UPDATE status='learning', learning_at=now()
 *   - existing learning row     → keep; backfill learning_at=now() if missing
 *   - existing mastered row     → keep; backfill learning_at=now() if missing
 *
 * `correct_streak`, `mastered_at`, `times_tested`, etc. are owned by test
 * mode and are intentionally NOT touched here. `learning_at` is only ever
 * set once — existing values are preserved.
 */
export async function markWordsAsLearning(
  wordIds: string[]
): Promise<{ success: boolean; error: string | null }> {
  if (wordIds.length === 0) {
    return { success: true, error: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // De-dupe the incoming list
  const uniqueWordIds = Array.from(new Set(wordIds));

  // Fetch any existing rows for these words
  const { data: existing, error: fetchError } = await supabase
    .from("user_word_progress")
    .select("id, word_id, status, learning_at")
    .eq("user_id", user.id)
    .in("word_id", uniqueWordIds);

  if (fetchError) {
    console.error("markWordsAsLearning: fetch failed", fetchError);
    return { success: false, error: fetchError.message };
  }

  const nowIso = new Date().toISOString();
  const existingByWordId = new Map(
    (existing || []).map((row) => [row.word_id, row])
  );

  // Bucket each word by the action it needs
  const toInsert: Array<{
    user_id: string;
    word_id: string;
    status: "learning";
    correct_streak: number;
    learning_at: string;
  }> = [];
  const rowsToPromote: string[] = []; // not-started → learning
  const rowsToBackfill: string[] = []; // learning/mastered missing learning_at

  for (const wordId of uniqueWordIds) {
    const row = existingByWordId.get(wordId);
    if (!row) {
      toInsert.push({
        user_id: user.id,
        word_id: wordId,
        status: "learning",
        correct_streak: 0,
        learning_at: nowIso,
      });
    } else if (row.status === "not-started") {
      rowsToPromote.push(row.id);
    } else if (!row.learning_at) {
      // Defensive backfill for pre-existing rows that predate the column
      rowsToBackfill.push(row.id);
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase
      .from("user_word_progress")
      .insert(toInsert);
    if (error) {
      console.error("markWordsAsLearning: insert failed", error);
      return { success: false, error: error.message };
    }
  }

  if (rowsToPromote.length > 0) {
    const { error } = await supabase
      .from("user_word_progress")
      .update({ status: "learning", learning_at: nowIso })
      .in("id", rowsToPromote);
    if (error) {
      console.error("markWordsAsLearning: promote failed", error);
      return { success: false, error: error.message };
    }
  }

  if (rowsToBackfill.length > 0) {
    const { error } = await supabase
      .from("user_word_progress")
      .update({ learning_at: nowIso })
      .in("id", rowsToBackfill);
    if (error) {
      console.error("markWordsAsLearning: backfill failed", error);
      return { success: false, error: error.message };
    }
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

  // Get lesson word count and course ID (for cache revalidation)
  const { data: lesson } = await supabase
    .from("lessons")
    .select("word_count, course_id")
    .eq("id", lessonId)
    .single();

  if (!lesson) {
    return { success: false, error: "Lesson not found" };
  }

  // Get all words in this lesson via junction table, including category
  const { data: lessonWords } = await supabase
    .from("lesson_words")
    .select("word_id, words(category)")
    .eq("lesson_id", lessonId);

  if (!lessonWords || lessonWords.length === 0) {
    return { success: false, error: "No words found in lesson" };
  }

  // Filter to testable words (exclude information pages)
  const testableWords = lessonWords.filter(
    (lw) => (lw.words as unknown as { category: string | null })?.category !== "information"
  );
  const testableWordIds = testableWords.map((lw) => lw.word_id);

  // Get user's progress for testable words only
  const { data: wordProgress } = await supabase
    .from("user_word_progress")
    .select("status")
    .eq("user_id", user.id)
    .in("word_id", testableWordIds);

  // Calculate stats using testable words as denominator
  const wordsMastered = wordProgress?.filter((wp) => wp.status === "mastered").length || 0;
  const wordsLearnedOrMastered = wordProgress?.filter((wp) => wp.status === "learned" || wp.status === "mastered").length || 0;
  const wordsStudied = wordProgress?.filter((wp) => wp.status !== "not-started").length || 0;
  const totalWords = testableWords.length;
  const completionPercent = totalWords > 0 ? Math.round((wordsMastered / totalWords) * 100) : 0;

  // Determine lesson status
  let lessonStatus: "not-started" | "learning" | "learned" | "mastered" = "not-started";
  if (completionPercent >= 100) {
    lessonStatus = "mastered";
  } else if (wordsLearnedOrMastered >= totalWords && totalWords > 0) {
    lessonStatus = "learned";
  } else if (wordsStudied > 0) {
    lessonStatus = "learning";
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
    words_learned: wordsLearnedOrMastered,
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

  // Revalidate all pages that display lesson/word stats
  revalidatePath(`/lesson/${lessonId}`);
  if (lesson.course_id) {
    revalidatePath(`/course/${lesson.course_id}`);
    revalidatePath(`/course/${lesson.course_id}/schedule`);
    revalidatePath(`/course/${lesson.course_id}/tests`);
    revalidatePath(`/course/${lesson.course_id}/progress`);
  }

  return { success: true, error: null };
}

/**
 * Complete a study session - saves notes, promotes answered words to
 * "learning", and records study time.
 *
 * Study mode does NOT affect mastery or streaks (that's test mode), but any
 * word the user submits an answer for transitions from "not-started" to
 * "learning" and stamps `learning_at`. Mastered/learning rows are never
 * demoted.
 *
 * Also sets the initial test milestone if this is the first time completing
 * this lesson.
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
  }>,
  answeredWordIds: string[] = []
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // Log and normalize zero-duration sessions
  const originalDuration = stats.durationSeconds;
  if (originalDuration === 0) {
    console.warn(`[Study Session] Zero-duration session detected`, {
      sessionId,
      lessonId,
      userId: user.id,
      wordsStudied: stats.wordsStudied,
    });

    // Round up to minimum 1 second
    stats.durationSeconds = 1;

    // Flag for analytics
    try {
      await supabase.from("activity_flags").insert({
        user_id: user.id,
        flag_type: "zero_duration_session",
        severity: "low",
        details: {
          sessionId,
          lessonId,
          wordsStudied: stats.wordsStudied,
          originalDuration,
          normalizedDuration: stats.durationSeconds,
        },
      });
    } catch { /* non-critical */ }
  }

  // Validate lesson exists and word count
  const { data: lessonData } = await supabase
    .from("lessons")
    .select("word_count")
    .eq("id", lessonId)
    .single();

  if (!lessonData) {
    return { success: false, error: "Lesson not found" };
  }

  if (stats.wordsStudied > (lessonData.word_count || 0)) {
    // Log anomaly but don't reject - could be legitimate edge case
    try {
      await supabase.from("activity_flags").insert({
        user_id: user.id,
        flag_type: "word_count_exceeded",
        severity: "low",
        details: { lessonId, claimed: stats.wordsStudied, lessonWordCount: lessonData.word_count },
      });
    } catch { /* non-critical */ }
  }

  // Validate duration is reasonable (at least 1 second per word studied)
  if (stats.wordsStudied > 0 && stats.durationSeconds < stats.wordsStudied * 1) {
    try {
      await supabase.from("activity_flags").insert({
        user_id: user.id,
        flag_type: "impossible_speed",
        severity: "medium",
        details: { lessonId, wordsStudied: stats.wordsStudied, durationSeconds: stats.durationSeconds, secondsPerWord: stats.durationSeconds / stats.wordsStudied },
      });
    } catch { /* non-critical */ }
  }

  // Save any user notes
  if (pendingNotes.length > 0) {
    const batchResult = await batchSaveUserNotes(pendingNotes);
    if (!batchResult.success) {
      console.error("Failed to save user notes:", batchResult.error);
      // Continue anyway - we still want to record the session
    }
  }

  // Promote any words the user submitted an answer for to "learning".
  // Runs AFTER note-saving so it can safely promote any rows that
  // `batchSaveUserNotes` inserted as "not-started" for notes-only updates.
  // Runs BEFORE `updateLessonProgress` so its aggregation sees the new
  // learning statuses.
  if (answeredWordIds.length > 0) {
    const learningResult = await markWordsAsLearning(answeredWordIds);
    if (!learningResult.success) {
      console.error(
        "Failed to mark words as learning:",
        learningResult.error
      );
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

  // Complete any pending referral (triggers credit on first lesson completion)
  try {
    const { completeReferralIfPending } = await import("./referrals");
    await completeReferralIfPending();
  } catch {
    // Non-critical — don't fail the session completion
  }

  // Record daily activity for leaderboard/streak tracking
  try {
    const { data: lesson } = await supabase
      .from("lessons")
      .select("course_id, courses(language_id)")
      .eq("id", lessonId)
      .single();

    const languageId = (lesson?.courses as { language_id: string } | null)?.language_id;
    if (languageId) {
      const { recordActivity } = await import("./activity");
      await recordActivity({
        languageId,
        wordsStudied: stats.wordsStudied,
        studyTimeSeconds: stats.durationSeconds,
      });
    }

    // Revalidate schedule page after milestone may have been set
    // (updateLessonProgress already revalidated, but setInitialMilestoneIfNeeded
    // may have written next_milestone/next_test_due_at after that)
    if (lesson?.course_id) {
      revalidatePath(`/course/${lesson.course_id}/schedule`);
    }
  } catch {
    // Non-critical — don't fail the session completion
  }

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
