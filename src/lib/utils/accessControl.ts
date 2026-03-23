/**
 * Access control utility for lesson/course access.
 * Determines whether a user can access a given lesson based on
 * free lesson thresholds and active subscriptions.
 */

import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export type AccessResult = {
  hasAccess: boolean;
  reason: "free" | "subscription" | "locked";
  subscriptionType?: "course" | "language" | "all-languages";
};

export interface LessonAccessInfo {
  lessonNumber: number;
}

export interface CourseAccessInfo {
  id: string;
  language_id: string | null;
  free_lessons: number | null;
}

// ============================================================================
// Platform Config Helpers
// ============================================================================

/**
 * Get a platform config value by key.
 * Uses the server Supabase client (RLS: public read).
 */
export async function getPlatformConfig<T = unknown>(
  key: string
): Promise<T | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", key)
    .single();

  return data?.value as T | null;
}

/**
 * Get the default free lessons count from platform config.
 */
export async function getDefaultFreeLessons(): Promise<number> {
  const value = await getPlatformConfig<number>("default_free_lessons");
  return value ?? 10;
}

/**
 * Get the enabled subscription tiers.
 */
export async function getEnabledTiers(): Promise<string[]> {
  const value = await getPlatformConfig<string[]>("enabled_tiers");
  return value ?? ["language", "all-languages"];
}

// ============================================================================
// Access Control
// ============================================================================

/**
 * Check if a user can access a specific lesson within a course.
 *
 * @param userId - The user's UUID, or null for guest/unauthenticated
 * @param lesson - The lesson info (only number is needed)
 * @param course - The course info (id, language_id, free_lessons)
 * @returns AccessResult with hasAccess boolean and reason
 */
export async function canAccessLesson(
  userId: string | null,
  lesson: LessonAccessInfo,
  course: CourseAccessInfo
): Promise<AccessResult> {
  const freeLessons = course.free_lessons ?? (await getDefaultFreeLessons());

  if (lesson.lessonNumber <= freeLessons) {
    return { hasAccess: true, reason: "free" };
  }

  if (!userId) {
    return { hasAccess: false, reason: "locked" };
  }

  const supabase = await createClient();
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(
      "type, status, target_id, current_period_end, cancel_at_period_end"
    )
    .eq("user_id", userId)
    .in("status", ["active", "cancelled"]);

  if (!subscriptions || subscriptions.length === 0) {
    return { hasAccess: false, reason: "locked" };
  }

  const now = new Date();

  for (const sub of subscriptions) {
    if (sub.status === "cancelled") {
      if (
        !sub.current_period_end ||
        new Date(sub.current_period_end) <= now
      ) {
        continue;
      }
    }

    if (sub.type === "all-languages") {
      return {
        hasAccess: true,
        reason: "subscription",
        subscriptionType: "all-languages",
      };
    }

    if (sub.type === "language" && sub.target_id === course.language_id) {
      return {
        hasAccess: true,
        reason: "subscription",
        subscriptionType: "language",
      };
    }

    if (sub.type === "course" && sub.target_id === course.id) {
      return {
        hasAccess: true,
        reason: "subscription",
        subscriptionType: "course",
      };
    }
  }

  return { hasAccess: false, reason: "locked" };
}

/**
 * Batch check: get access status for all lessons in a course.
 * More efficient than calling canAccessLesson for each lesson individually
 * because it makes only one DB query for subscriptions.
 *
 * @param userId - The user's UUID, or null for guest
 * @param course - The course info
 * @param lessonNumbers - Array of lesson numbers to check
 * @returns Map of lesson number to AccessResult
 */
export async function getLessonAccessMap(
  userId: string | null,
  course: CourseAccessInfo,
  lessonNumbers: number[]
): Promise<Map<number, AccessResult>> {
  const result = new Map<number, AccessResult>();
  const freeLessons = course.free_lessons ?? (await getDefaultFreeLessons());

  let subscriptionAccess: AccessResult | null = null;

  if (userId) {
    const supabase = await createClient();
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("type, status, target_id, current_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "cancelled"]);

    const now = new Date();

    if (subscriptions) {
      for (const sub of subscriptions) {
        if (
          sub.status === "cancelled" &&
          (!sub.current_period_end ||
            new Date(sub.current_period_end) <= now)
        ) {
          continue;
        }

        if (sub.type === "all-languages") {
          subscriptionAccess = {
            hasAccess: true,
            reason: "subscription",
            subscriptionType: "all-languages",
          };
          break;
        }
        if (
          sub.type === "language" &&
          sub.target_id === course.language_id
        ) {
          subscriptionAccess = {
            hasAccess: true,
            reason: "subscription",
            subscriptionType: "language",
          };
          break;
        }
        if (sub.type === "course" && sub.target_id === course.id) {
          subscriptionAccess = {
            hasAccess: true,
            reason: "subscription",
            subscriptionType: "course",
          };
          break;
        }
      }
    }
  }

  for (const num of lessonNumbers) {
    if (num <= freeLessons) {
      result.set(num, { hasAccess: true, reason: "free" });
    } else if (subscriptionAccess) {
      result.set(num, subscriptionAccess);
    } else {
      result.set(num, { hasAccess: false, reason: "locked" });
    }
  }

  return result;
}
