"use server";

/**
 * Word-progress chokepoint.
 *
 * Whenever `user_word_progress.status` is written, the matching
 * `user_lesson_progress` rows must be recomputed for every lesson
 * containing the touched words — otherwise lesson status drifts away
 * from the underlying word statuses. The most common drift case today
 * is an auto-lesson test (lost-mastery, unmastered, etc.) that masters
 * a word belonging to a real lesson the user hasn't reopened yet.
 *
 * This module exposes a single helper, `fanOutLessonProgress`, that
 * every status-affecting writer MUST call after writing word progress.
 * Allowed direct writers to `user_word_progress` today:
 *   - src/lib/mutations/study.ts
 *   - src/lib/mutations/test.ts
 *   - src/app/api/account/reset/route.ts  (whole-row delete; no fan-out needed)
 *
 * The CI guard at `scripts/check-user-word-progress-writes.mjs` enforces
 * that allowlist. New write sites outside it MUST go through this file
 * or be added to the allowlist with justification.
 *
 * Design note: this is post-write fan-out, not a wrapped writer. The
 * per-word writers (`updateWordTestProgress` etc.) carry test-specific
 * state machine logic (clue levels, streak math, status floors) that
 * doesn't generalize cleanly, so the chokepoint is enforced via call
 * convention + CI guard rather than by lifting the writes themselves.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { updateLessonProgress } from "./study";

export interface FanOutLessonProgressInput {
  userId: string;
  /** Words whose `user_word_progress` was just written. Deduped internally. */
  affectedWordIds: string[];
  /**
   * Real-lesson tests should pass the lessonId here so we skip it — the
   * caller has already invoked `updateLessonProgress(lessonId, durationSeconds)`
   * with the session's duration, and we must not double-count it.
   * Auto-lesson tests pass null/undefined.
   */
  excludeLessonId?: string | null;
}

export interface FanOutLessonProgressResult {
  /** Every real lesson whose `user_lesson_progress` we just recomputed. */
  updatedLessonIds: string[];
  /**
   * Subset of `updatedLessonIds` whose status just transitioned to
   * `mastered` (was non-mastered, is now mastered). Callers that fire
   * mastery celebrations should iterate this list.
   */
  newlyMasteredLessonIds: string[];
}

export async function fanOutLessonProgress(
  input: FanOutLessonProgressInput
): Promise<FanOutLessonProgressResult> {
  const empty: FanOutLessonProgressResult = {
    updatedLessonIds: [],
    newlyMasteredLessonIds: [],
  };

  const uniqueWordIds = Array.from(new Set(input.affectedWordIds.filter(Boolean)));
  if (uniqueWordIds.length === 0) return empty;

  const supabase = createAdminClient();

  // Find every lesson containing any of the affected words.
  const { data: rows, error } = await supabase
    .from("lesson_words")
    .select("lesson_id")
    .in("word_id", uniqueWordIds);
  if (error || !rows) {
    console.error(
      "[fanOutLessonProgress] lesson_words lookup failed:",
      error?.message
    );
    return empty;
  }

  const lessonIds = Array.from(
    new Set(
      rows
        .map((r) => r.lesson_id)
        .filter((id): id is string => Boolean(id))
    )
  ).filter((id) => id !== input.excludeLessonId);

  if (lessonIds.length === 0) return empty;

  // Recompute lesson progress for each. `updateLessonProgress(lessonId, 0)`
  // doesn't add to `total_study_time_seconds`, so this is safe to call
  // for lessons that weren't the session's primary lesson.
  const updatedLessonIds: string[] = [];
  const newlyMasteredLessonIds: string[] = [];

  for (const lessonId of lessonIds) {
    const res = await updateLessonProgress(lessonId, 0);
    if (!res.success) continue;
    updatedLessonIds.push(lessonId);
    if (res.status === "mastered" && res.previousStatus !== "mastered") {
      newlyMasteredLessonIds.push(lessonId);
    }
  }

  return { updatedLessonIds, newlyMasteredLessonIds };
}
