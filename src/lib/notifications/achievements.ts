/**
 * Achievement notification helpers.
 *
 * Centralises milestone definitions and the idempotency checks needed so
 * trigger sites (test completion, lesson completion) can fire achievement
 * notifications without worrying about double-sends.
 *
 * Idempotency relies on `notifications.data->>template_key` (auto-stamped by
 * `insertFromTemplate`) and, for milestone notifications, an additional
 * `data->>milestone` field we attach via dataOverrides.
 *
 * All functions swallow errors — achievement notifications are non-critical
 * and must never fail the parent flow (e.g. a test completion).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { insertFromTemplate } from "@/lib/notifications/template";

// ---------------------------------------------------------------------------
// Milestone constants
// ---------------------------------------------------------------------------

/** Word mastery milestones, ascending. Single template handles all. */
export const MILESTONES_WORDS_MASTERED = [25, 50, 100, 200, 500] as const;

/** Lesson completion milestones, ascending. Single template handles all. */
export const MILESTONES_LESSONS_COMPLETE = [5, 10, 25, 50] as const;

/**
 * Returns the highest milestone the user has currently reached, or null
 * if they haven't reached any. The fire helpers below are idempotent per
 * (template_key, milestone), so calling with the highest is sufficient
 * — earlier milestones are either already fired or will be skipped by
 * the idempotency check next time the count is re-checked.
 */
export function highestReachedMilestone(
  count: number,
  milestones: readonly number[]
): number | null {
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (count >= milestones[i]) return milestones[i];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Idempotent fire helpers
// ---------------------------------------------------------------------------

/**
 * Fire a notification only if the user has never received one with this
 * template_key. Used for first-time achievements (e.g. first_word_mastered)
 * and one-shot system notifications (e.g. welcome on signup).
 *
 * Errors are swallowed; never throws.
 */
export async function fireFirstTimeNotification(
  userId: string,
  key: string,
  overrides?: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();
  const { data: existing, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("data->>template_key", key)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      `fireOnceByKey('${key}') idempotency check failed:`,
      error.message
    );
    return;
  }
  if (existing) return;

  await insertFromTemplate(key, {
    userId,
    dataOverrides: overrides,
  });
}

/**
 * Fire a milestone notification only if the user hasn't received this
 * exact (template_key, milestone) combo. Allows the same template to
 * cover multiple milestones (25, 50, 100, ...) without spam.
 */
async function fireMilestone(
  userId: string,
  key: string,
  milestone: number,
  extra?: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();
  const { data: existing, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("data->>template_key", key)
    .eq("data->>milestone", String(milestone))
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      `fireMilestone('${key}', ${milestone}) idempotency check failed:`,
      error.message
    );
    return;
  }
  if (existing) return;

  await insertFromTemplate(key, {
    userId,
    // `count` powers the {count} placeholder in the template title/body;
    // `milestone` is what the idempotency key checks.
    dataOverrides: {
      ...extra,
      milestone,
      count: milestone,
    },
  });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export interface RecordProgressAchievementsInput {
  userId: string;
  /**
   * If a test just completed, supply its summary so we can detect a
   * first-time perfect score. Omit for non-test triggers.
   */
  testResult?: {
    scorePercent: number;
    isRetest: boolean;
  };
}

/**
 * Re-evaluates a user's mastery counts and fires any achievement notifications
 * that haven't been sent yet. Safe to call after any action that may have
 * promoted a word or lesson to "mastered" — only test completions actually do
 * so today, but calling this from study completion is a harmless no-op.
 *
 * Errors are logged and swallowed; never throws.
 */
export async function recordProgressAchievements(
  input: RecordProgressAchievementsInput
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { userId, testResult } = input;

    // Two cheap count queries with index on (user_id, status).
    const [{ count: lessonsCount }, { count: wordsCount }] = await Promise.all([
      supabase
        .from("user_lesson_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "mastered"),
      supabase
        .from("user_word_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "mastered"),
    ]);

    const masteredLessons = lessonsCount ?? 0;
    const masteredWords = wordsCount ?? 0;

    // First-time achievements
    if (masteredWords >= 1) {
      await fireFirstTimeNotification(userId, "achievement.first_word_mastered");
    }
    if (masteredLessons >= 1) {
      await fireFirstTimeNotification(userId, "achievement.first_lesson_complete");
    }
    if (
      testResult &&
      testResult.scorePercent === 100 &&
      !testResult.isRetest
    ) {
      await fireFirstTimeNotification(userId, "achievement.first_perfect_test");
    }

    // Milestone achievements (highest reached; idempotent per milestone)
    const wordsMilestone = highestReachedMilestone(
      masteredWords,
      MILESTONES_WORDS_MASTERED
    );
    if (wordsMilestone !== null) {
      await fireMilestone(
        userId,
        "achievement.words_mastered_milestone",
        wordsMilestone
      );
    }

    const lessonsMilestone = highestReachedMilestone(
      masteredLessons,
      MILESTONES_LESSONS_COMPLETE
    );
    if (lessonsMilestone !== null) {
      await fireMilestone(
        userId,
        "achievement.lessons_complete_milestone",
        lessonsMilestone
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("recordProgressAchievements failed:", message);
  }
}
