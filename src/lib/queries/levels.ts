import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Level } from "@/types/aliases";

// ============================================================================
// TYPES
// ============================================================================

export interface LevelTier {
  levelNumber: number;
  slug: string;
  name: string;
  /** Hex badge colour, resolved client-side. */
  color: string;
  xpThreshold: number;
  lessonsMasteredThreshold: number;
}

export interface UserLevelData {
  /** The rank the user currently holds (from the cached, monotonic pointer). */
  current: LevelTier;
  /** The next rank up, or null when the user is at the top of the ladder. */
  next: LevelTier | null;
  lifetimeXp: number;
  lessonsMastered: number;
  /** Lifetime XP still needed to clear the next tier's XP gate (0 at max). */
  xpToNext: number;
  /** Lessons-mastered still needed to clear the next tier's gate (0 at max). */
  lessonsToNext: number;
  /** 0–1 progress on the XP gate toward the next tier; null at the top rank. */
  xpProgress: number | null;
  /** 0–1 progress on the lessons gate toward the next tier; null at the top rank. */
  lessonsProgress: number | null;
}

// ============================================================================
// QUERY
// ============================================================================

interface LevelRow {
  level_number: number;
  slug: string;
  name: string;
  color: string;
  xp_threshold: number;
  lessons_mastered_threshold: number;
}

/**
 * Resolve the signed-in user's rank for the profile rank block.
 *
 * The held tier comes from the cached `users.current_level` pointer (kept
 * monotonic by `update_daily_activity`), not a live recompute — so an admin
 * raising a threshold never demotes a user. Progress toward the next tier is
 * measured against the live `lifetime_xp` and cross-language lessons-mastered
 * count, mirroring the dual gate in `compute_user_level`.
 *
 * Returns null for guests (and if the ladder is somehow empty), so callers can
 * simply skip rendering the block.
 */
export async function getUserLevel(): Promise<UserLevelData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [ladderResult, userRowResult, masteredCountResult] = await Promise.all([
    supabase
      .from("levels")
      .select(
        "level_number, slug, name, color, xp_threshold, lessons_mastered_threshold"
      )
      .eq("enabled", true)
      .order("level_number", { ascending: true }),
    supabase
      .from("users")
      .select("current_level, lifetime_xp")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_lesson_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "mastered"),
  ]);

  const ladder = (ladderResult.data ?? []) as LevelRow[];
  if (ladder.length === 0) return null;

  const lifetimeXp = userRowResult.data?.lifetime_xp ?? 0;
  const lessonsMastered = masteredCountResult.count ?? 0;
  const currentLevelNumber = userRowResult.data?.current_level ?? 1;

  // Resolve the held tier from the cached pointer; fall back to the lowest
  // seeded tier if the cached number isn't in the (enabled) ladder.
  const currentRow =
    ladder.find((l) => l.level_number === currentLevelNumber) ?? ladder[0];
  const nextRow =
    ladder.find((l) => l.level_number > currentRow.level_number) ?? null;

  const current = toTier(currentRow);

  if (!nextRow) {
    return {
      current,
      next: null,
      lifetimeXp,
      lessonsMastered,
      xpToNext: 0,
      lessonsToNext: 0,
      xpProgress: null,
      lessonsProgress: null,
    };
  }

  const next = toTier(nextRow);

  // Span from the held tier's threshold to the next tier's. Guard against a
  // zero/negative span (mis-ordered thresholds) so the bar never divides by 0.
  const xpSpan = Math.max(1, next.xpThreshold - current.xpThreshold);
  const lessonsSpan = Math.max(
    1,
    next.lessonsMasteredThreshold - current.lessonsMasteredThreshold
  );

  return {
    current,
    next,
    lifetimeXp,
    lessonsMastered,
    xpToNext: Math.max(0, next.xpThreshold - lifetimeXp),
    lessonsToNext: Math.max(0, next.lessonsMasteredThreshold - lessonsMastered),
    xpProgress: clamp01((lifetimeXp - current.xpThreshold) / xpSpan),
    lessonsProgress: clamp01(
      (lessonsMastered - current.lessonsMasteredThreshold) / lessonsSpan
    ),
  };
}

// ============================================================================
// ADMIN
// ============================================================================

/**
 * Fetch the full rank ladder — including disabled tiers — for the admin CMS.
 * Uses the service-role client to bypass the public "enabled rows only" RLS
 * policy (mirrors getHelpEntriesAdmin). Server-only; never import client-side.
 */
export async function getAllLevelsAdmin(): Promise<Level[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("levels")
    .select("*")
    .order("level_number", { ascending: true });

  if (error) {
    console.error("Error fetching levels (admin):", error);
    return [];
  }

  return data ?? [];
}

// ============================================================================
// HELPERS
// ============================================================================

function toTier(row: LevelRow): LevelTier {
  return {
    levelNumber: row.level_number,
    slug: row.slug,
    name: row.name,
    color: row.color,
    xpThreshold: row.xp_threshold,
    lessonsMasteredThreshold: row.lessons_mastered_threshold,
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
