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

/**
 * Credit an achievement's coin/XP reward and record the unlock via the
 * `unlock_achievement` RPC, WITHOUT firing its notification.
 *
 * Notifications are fired separately by the `fire*` helpers above, which carry
 * the richer `{count}` / `milestone` data the RPC's generic firing path lacks.
 * Passing `p_fire_notification: false` keeps coin crediting and notifying as
 * one logical event without double-notifying.
 *
 * Idempotent: the RPC no-ops on re-call for an already-unlocked (user, slug),
 * so repeat calls never double-credit. Errors are logged and swallowed.
 */
async function creditAchievement(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  slug: string
): Promise<void> {
  const { error } = await supabase.rpc("unlock_achievement", {
    p_user_id: userId,
    p_achievement_slug: slug,
    p_fire_notification: false,
  });
  if (error) {
    console.error(`creditAchievement('${slug}') failed:`, error.message);
  }
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

    // Three cheap count queries with index on (user_id, ...).
    // `learned` covers both learned and mastered (mastery requires learned
    // first), so we test for the learned timestamp being non-null rather than
    // status='learned' which would exclude already-mastered words.
    const [
      { count: lessonsCount },
      { count: wordsCount },
      { count: learnedCount },
    ] = await Promise.all([
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
      supabase
        .from("user_word_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("learned_at", "is", null),
    ]);

    const masteredLessons = lessonsCount ?? 0;
    const masteredWords = wordsCount ?? 0;
    const learnedWords = learnedCount ?? 0;

    // Pull every achievement's coin reward once so the notifications can render
    // the exact amount via the `{coins}` placeholder. The SQL unlock path
    // substitutes this itself, but the TS-fired templates below need it passed
    // explicitly. Keyed by slug — the source of truth — so copy never drifts
    // from the catalogue.
    const { data: coinRows } = await supabase
      .from("achievements")
      .select("slug, title, coin_reward");
    const coinBySlug = new Map<string, number>(
      (coinRows ?? []).map((r) => [r.slug, r.coin_reward ?? 0])
    );
    // Trophy display name, powering the `{title} unlocked!` notification title.
    // The SQL unlock path substitutes this itself; the TS-fired templates below
    // need it passed explicitly. Keyed by slug so copy never drifts from the
    // catalogue.
    const titleBySlug = new Map<string, string>(
      (coinRows ?? []).map((r) => [r.slug, r.title ?? ""])
    );

    // First-time achievements. Each fires its notification (idempotent on the
    // notifications table) AND credits coins + records the unlock via the RPC
    // with notifications suppressed (idempotent on the user_achievements
    // UNIQUE constraint). The catalogue slug can differ from the notification
    // template key — notably first_lesson_mastered vs first_lesson_complete.
    if (learnedWords >= 1) {
      await fireFirstTimeNotification(userId, "achievement.first_word_learned", {
        coins: coinBySlug.get("first_word_learned"),
        title: titleBySlug.get("first_word_learned"),
      });
      await creditAchievement(supabase, userId, "first_word_learned");
    }
    if (masteredWords >= 1) {
      await fireFirstTimeNotification(userId, "achievement.first_word_mastered", {
        coins: coinBySlug.get("first_word_mastered"),
        title: titleBySlug.get("first_word_mastered"),
      });
      await creditAchievement(supabase, userId, "first_word_mastered");
    }
    if (masteredLessons >= 1) {
      await fireFirstTimeNotification(userId, "achievement.first_lesson_complete", {
        coins: coinBySlug.get("first_lesson_mastered"),
        title: titleBySlug.get("first_lesson_mastered"),
      });
      await creditAchievement(supabase, userId, "first_lesson_mastered");
    }
    if (
      testResult &&
      testResult.scorePercent === 100 &&
      !testResult.isRetest
    ) {
      await fireFirstTimeNotification(userId, "achievement.first_perfect_test", {
        coins: coinBySlug.get("first_perfect_test"),
        title: titleBySlug.get("first_perfect_test"),
      });
      await creditAchievement(supabase, userId, "first_perfect_test");
    }

    // Milestone achievements. Notifications fire for the highest reached only
    // (existing behaviour), but coins are credited for EVERY milestone the user
    // has crossed so a multi-milestone jump never drops a reward — the RPC is
    // idempotent per slug, so already-credited milestones are no-ops.
    const wordsMilestone = highestReachedMilestone(
      masteredWords,
      MILESTONES_WORDS_MASTERED
    );
    if (wordsMilestone !== null) {
      await fireMilestone(
        userId,
        "achievement.words_mastered_milestone",
        wordsMilestone,
        {
          coins: coinBySlug.get(`words_mastered_${wordsMilestone}`),
          title: titleBySlug.get(`words_mastered_${wordsMilestone}`),
        }
      );
    }
    for (const milestone of MILESTONES_WORDS_MASTERED) {
      if (masteredWords >= milestone) {
        await creditAchievement(supabase, userId, `words_mastered_${milestone}`);
      }
    }

    const lessonsMilestone = highestReachedMilestone(
      masteredLessons,
      MILESTONES_LESSONS_COMPLETE
    );
    if (lessonsMilestone !== null) {
      await fireMilestone(
        userId,
        "achievement.lessons_complete_milestone",
        lessonsMilestone,
        {
          coins: coinBySlug.get(`lessons_complete_${lessonsMilestone}`),
          title: titleBySlug.get(`lessons_complete_${lessonsMilestone}`),
        }
      );
    }
    for (const milestone of MILESTONES_LESSONS_COMPLETE) {
      if (masteredLessons >= milestone) {
        await creditAchievement(supabase, userId, `lessons_complete_${milestone}`);
      }
    }

    // Leagues unlock — first-time-only, fires once the user has tested enough
    // distinct real lessons to cross the weekly-leagues enrolment gate. The
    // threshold mirrors the gate's platform_config key (default 3). Both the
    // notification (deduped on template_key) and the credit (deduped on the
    // user_achievements UNIQUE constraint) are idempotent, so a re-run after
    // unlock is a no-op.
    const { data: minLessonsRow } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", "min_lessons_tested_to_join_leagues")
      .maybeSingle();
    const leaguesThreshold =
      (minLessonsRow?.value as number | null) ?? 3;
    const { data: distinctLessonsTested } = await supabase.rpc(
      "get_distinct_lessons_tested",
      { p_user_id: userId }
    );
    if ((distinctLessonsTested ?? 0) >= leaguesThreshold) {
      await fireFirstTimeNotification(userId, "achievement.leagues_unlocked", {
        coins: coinBySlug.get("leagues_unlocked"),
        title: titleBySlug.get("leagues_unlocked"),
        count: distinctLessonsTested ?? leaguesThreshold,
      });
      await creditAchievement(supabase, userId, "leagues_unlocked");
    }

    // Hall of Fame — all-time XP rank is GLOBAL (p_language_id null). Permanent
    // once crossed; being overtaken later never revokes. Both fire for a #1
    // (also satisfies top-20).
    const { data: posRows } = await supabase.rpc("get_user_leaderboard_position", {
      p_user_id: userId,
      // Global (cross-language) scope: the SQL treats NULL as "all languages".
      // The generated arg type is non-nullable, so cast a real null through.
      p_language_id: null as unknown as string,
      p_metric: "xp",
      p_period: "all-time",
    });
    const rank = Array.isArray(posRows) ? Number(posRows[0]?.rank ?? 0) : 0;
    if (rank > 0) {
      if (rank <= 20) {
        await fireFirstTimeNotification(userId, "achievement.hall_of_fame_top20", {
          coins: coinBySlug.get("hall_of_fame_top20"),
          title: titleBySlug.get("hall_of_fame_top20"),
        });
        await creditAchievement(supabase, userId, "hall_of_fame_top20");
      }
      if (rank === 1) {
        await fireFirstTimeNotification(userId, "achievement.alltime_champion", {
          coins: coinBySlug.get("alltime_champion"),
          title: titleBySlug.get("alltime_champion"),
        });
        await creditAchievement(supabase, userId, "alltime_champion");
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("recordProgressAchievements failed:", message);
  }
}
