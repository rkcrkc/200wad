import { createClient } from "@/lib/supabase/server";

// ============================================================================
// TYPES
// ============================================================================

export type AchievementCategory =
  | "progress"
  | "mastery"
  | "streak"
  | "social"
  | "special";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum" | null;

/**
 * Raw unlock criteria JSONB. Shape varies by `type` — see
 * `supabase/migrations/20260530000004_v1a_achievements_tables.sql` for the
 * documented shapes. We carry it through opaquely on each row so the UI can
 * render edge cases without us widening the type each time a new shape lands.
 */
export type UnlockCriteria = Record<string, unknown> | null;

/**
 * Slug-specific extras attached to a row by the query so the card can render
 * a richer unlocked state. Keep this narrow — one shape per slug, lazily
 * extended when a new visual treatment lands.
 */
export interface AchievementExtra {
  firstWord?: {
    id: string;
    headword: string;
    english: string;
    imageUrl: string | null;
  };
}

export interface AchievementForList {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  isMystery: boolean;
  coinReward: number;
  xpReward: number;
  displayOrder: number;
  unlockCriteria: UnlockCriteria;
  isUnlocked: boolean;
  unlockedAt: string | null;
  /** Current value for milestone-family progress strips. NULL when binary. */
  currentProgress: number | null;
  /** Threshold to display next to currentProgress. NULL when binary. */
  progressThreshold: number | null;
  /** Slug-specific extras for richer card rendering. */
  extra: AchievementExtra;
}

export interface UserAchievementAggregates {
  unlockedCount: number;
  totalCount: number;
  /**
   * Lifetime GROSS coins earned across all sources (achievements, tests,
   * daily goal, streaks…), read from the coin_transactions ledger — not a
   * theoretical sum of unlocked trophies' catalogue rewards.
   */
  totalCoinsEarned: number;
}

export interface GetAchievementsForUserResult {
  achievements: AchievementForList[];
  userAggregates: UserAchievementAggregates;
}

// ============================================================================
// QUERY
// ============================================================================

interface AchievementRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tier: string | null;
  is_mystery: boolean;
  coin_reward: number;
  xp_reward: number;
  display_order: number;
  unlock_criteria: unknown;
}

/**
 * Fetch the achievements catalogue + the current user's unlock state, plus
 * an `aggregates` object for the page header. Guests get the full catalogue
 * with everything locked and no mystery reveals.
 *
 * Computation:
 *   1. All enabled achievements ordered by (category, display_order)
 *   2. The current user's `user_achievements` rows (skipped when guest)
 *   3. Four user aggregates for the progress strips on locked milestone rows:
 *      - wordsLearned   (user_word_progress.learned_at non-null)
 *      - wordsMastered  (user_word_progress.mastered_at non-null)
 *      - lessonsMastered (user_lesson_progress.mastered_at non-null)
 *      - longestStreak  (users.longest_streak)
 *   4. Slug-specific extras (only when authenticated and trophy is unlocked):
 *      - first_word_learned: the headword + image of the user's earliest
 *        learned word, so the card can swap in a thumbnail.
 *
 * Mirrors the server-query pattern in `getUserLearningStats`.
 */
export async function getAchievementsForUser(): Promise<GetAchievementsForUserResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const achievementsResult = await supabase
    .from("achievements")
    .select(
      "id, slug, title, description, category, tier, is_mystery, coin_reward, xp_reward, display_order, unlock_criteria"
    )
    .eq("enabled", true)
    .order("category", { ascending: true })
    .order("display_order", { ascending: true });

  const achievementRows = (achievementsResult.data ?? []) as AchievementRow[];

  // Guest path: full catalogue, all locked, no mystery reveals, no extras.
  if (!user) {
    const guestRows: AchievementForList[] = achievementRows.map((row) =>
      toListItem(
        row,
        null,
        {
          wordsLearned: 0,
          wordsMastered: 0,
          lessonsMastered: 0,
          longestStreak: 0,
          lessonsTested: 0,
          leaguePodiumFinishes: 0,
          leagueWins: 0,
        },
        {}
      )
    );

    return {
      achievements: guestRows,
      userAggregates: {
        unlockedCount: 0,
        totalCount: guestRows.length,
        totalCoinsEarned: 0,
      },
    };
  }

  // Authenticated path: fetch unlock rows + the four scalar aggregates +
  // any slug-specific extras (first learned word for the first_word_learned
  // trophy) in parallel.
  const [
    userAchievementsResult,
    wordsLearnedResult,
    wordsMasteredResult,
    lessonsMasteredResult,
    userRowResult,
    firstLearnedWordResult,
    firstMasteredWordResult,
    coinsEarnedResult,
    lessonsTestedResult,
    leagueStatsResult,
  ] = await Promise.all([
    supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", user.id),
    supabase
      .from("user_word_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("learned_at", "is", null),
    supabase
      .from("user_word_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("mastered_at", "is", null),
    supabase
      .from("user_lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("mastered_at", "is", null),
    supabase
      .from("users")
      .select("longest_streak")
      .eq("id", user.id)
      .maybeSingle(),
    // Earliest learned word for the user, for the first_word_learned card.
    // PostgREST nested-select inflates a `words` object on the row.
    supabase
      .from("user_word_progress")
      .select(
        "word_id, learned_at, words!inner(id, headword, english, flashcard_image_url)"
      )
      .eq("user_id", user.id)
      .not("learned_at", "is", null)
      .order("learned_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    // Earliest mastered word for the user, for the first_word_mastered card.
    supabase
      .from("user_word_progress")
      .select(
        "word_id, mastered_at, words!inner(id, headword, english, flashcard_image_url)"
      )
      .eq("user_id", user.id)
      .not("mastered_at", "is", null)
      .order("mastered_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    // Lifetime gross coins earned across all sources (ledger sum).
    supabase.rpc("get_lifetime_coins_earned"),
    // Distinct real lessons tested — backs the leagues_unlocked progress bar.
    supabase.rpc("get_distinct_lessons_tested", { p_user_id: user.id }),
    // League placement stats — backs the league_*_reached / podium / wins bars.
    supabase.rpc("get_league_achievement_stats", { p_user_id: user.id }),
  ]);

  const unlockedMap = new Map<string, string>();
  for (const row of userAchievementsResult.data ?? []) {
    unlockedMap.set(row.achievement_id, row.unlocked_at);
  }

  const ls = Array.isArray(leagueStatsResult.data)
    ? leagueStatsResult.data[0]
    : null;

  const aggregates: UserScalarAggregates = {
    wordsLearned: wordsLearnedResult.count ?? 0,
    wordsMastered: wordsMasteredResult.count ?? 0,
    lessonsMastered: lessonsMasteredResult.count ?? 0,
    longestStreak: userRowResult.data?.longest_streak ?? 0,
    lessonsTested: (lessonsTestedResult.data as number | null) ?? 0,
    leaguePodiumFinishes: Number(ls?.podium_finishes ?? 0),
    leagueWins: Number(ls?.wins ?? 0),
  };

  // Resolve the slug-specific extras keyed by slug. The first-learned and
  // first-mastered cards share the same word-thumbnail shape.
  const extrasBySlug: Record<string, AchievementExtra> = {};

  const firstLearnedWord = parseFirstWordRow(firstLearnedWordResult.data);
  if (firstLearnedWord) {
    extrasBySlug["first_word_learned"] = { firstWord: firstLearnedWord };
  }

  const firstMasteredWord = parseFirstWordRow(firstMasteredWordResult.data);
  if (firstMasteredWord) {
    extrasBySlug["first_word_mastered"] = { firstWord: firstMasteredWord };
  }

  const items: AchievementForList[] = achievementRows.map((row) =>
    toListItem(
      row,
      unlockedMap.get(row.id) ?? null,
      aggregates,
      extrasBySlug[row.slug] ?? {}
    )
  );

  const unlockedCount = items.filter((i) => i.isUnlocked).length;
  const totalCoinsEarned = Number(coinsEarnedResult.data ?? 0);

  return {
    achievements: items,
    userAggregates: {
      unlockedCount,
      totalCount: items.length,
      totalCoinsEarned,
    },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Normalise a `user_word_progress` row carrying a nested `words` object (from a
 * PostgREST inner-join) into the `firstWord` extra shape. Returns null when the
 * user has no qualifying word yet.
 */
function parseFirstWordRow(
  data: unknown
): NonNullable<AchievementExtra["firstWord"]> | null {
  const row = data as
    | {
        words:
          | {
              id: string;
              headword: string;
              english: string;
              flashcard_image_url: string | null;
            }
          | null;
      }
    | null;
  const word = row?.words ?? null;
  if (!word) return null;
  return {
    id: word.id,
    headword: word.headword,
    english: word.english,
    imageUrl: word.flashcard_image_url,
  };
}

interface UserScalarAggregates {
  wordsLearned: number;
  wordsMastered: number;
  lessonsMastered: number;
  longestStreak: number;
  lessonsTested: number;
  leaguePodiumFinishes: number;
  leagueWins: number;
}

/**
 * Resolve a row's `(currentProgress, progressThreshold)` from its
 * `unlock_criteria` and the four user aggregates. Returns `(null, null)` for
 * binary / non-milestone criteria — the UI just shows "Locked" for those.
 */
function resolveProgress(
  criteria: UnlockCriteria,
  aggregates: UserScalarAggregates
): { currentProgress: number | null; progressThreshold: number | null } {
  if (!criteria) return { currentProgress: null, progressThreshold: null };

  const type = (criteria as { type?: unknown }).type;
  const threshold = (criteria as { threshold?: unknown }).threshold;

  if (typeof type !== "string") {
    return { currentProgress: null, progressThreshold: null };
  }
  if (typeof threshold !== "number") {
    return { currentProgress: null, progressThreshold: null };
  }

  if (type === "word_count") {
    const metric = (criteria as { metric?: unknown }).metric;
    if (metric === "learned") {
      return {
        currentProgress: aggregates.wordsLearned,
        progressThreshold: threshold,
      };
    }
    if (metric === "mastered") {
      return {
        currentProgress: aggregates.wordsMastered,
        progressThreshold: threshold,
      };
    }
    return { currentProgress: null, progressThreshold: null };
  }

  if (type === "lesson_count") {
    const metric = (criteria as { metric?: unknown }).metric;
    if (metric === "mastered" || metric === undefined) {
      return {
        currentProgress: aggregates.lessonsMastered,
        progressThreshold: threshold,
      };
    }
    return { currentProgress: null, progressThreshold: null };
  }

  if (type === "day_streak") {
    return {
      currentProgress: aggregates.longestStreak,
      progressThreshold: threshold,
    };
  }

  if (type === "lessons_tested") {
    return {
      currentProgress: aggregates.lessonsTested,
      progressThreshold: threshold,
    };
  }

  if (type === "league_podium_finishes") {
    return {
      currentProgress: aggregates.leaguePodiumFinishes,
      progressThreshold: threshold,
    };
  }

  if (type === "league_wins") {
    return {
      currentProgress: aggregates.leagueWins,
      progressThreshold: threshold,
    };
  }

  // alltime_rank_reached intentionally falls through -> binary (rank isn't a
  // fill-up bar).
  // perfect_session, lesson_mastered, mystery / special criteria are binary.
  return { currentProgress: null, progressThreshold: null };
}

function toListItem(
  row: AchievementRow,
  unlockedAt: string | null,
  aggregates: UserScalarAggregates,
  extra: AchievementExtra
): AchievementForList {
  const { currentProgress, progressThreshold } = resolveProgress(
    row.unlock_criteria as UnlockCriteria,
    aggregates
  );

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category as AchievementCategory,
    tier: row.tier as AchievementTier,
    isMystery: row.is_mystery,
    coinReward: row.coin_reward,
    xpReward: row.xp_reward,
    displayOrder: row.display_order,
    unlockCriteria: row.unlock_criteria as UnlockCriteria,
    isUnlocked: unlockedAt !== null,
    unlockedAt,
    currentProgress,
    progressThreshold,
    extra,
  };
}
