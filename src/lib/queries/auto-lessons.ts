/**
 * Pure (no server imports) helpers for auto-lesson IDs and selection logic.
 *
 * Lives in a separate module from `lessons.ts` so client components can
 * import these without dragging `@/lib/supabase/server` (and `next/headers`)
 * into the client bundle.
 */

// Auto-lesson types
export type AutoLessonType =
  | "notes"
  | "best"
  | "worst"
  | "unmastered"
  | "lost_mastery";

// Auto-lesson ID helpers
export function createAutoLessonId(type: AutoLessonType, courseId: string): string {
  return `auto-${type}-${courseId}`;
}

export function parseAutoLessonId(
  lessonId: string,
): { type: AutoLessonType; courseId: string } | null {
  const match = lessonId.match(
    /^auto-(notes|best|worst|unmastered|lost_mastery)-(.+)$/,
  );
  if (!match) return null;
  return { type: match[1] as AutoLessonType, courseId: match[2] };
}

export function isAutoLesson(lessonId: string): boolean {
  return lessonId.startsWith("auto-");
}

/**
 * All auto-lesson IDs for a given course.
 *
 * Auto-lesson tests (e.g. Worst Words) write `lesson_id =
 * "auto-{type}-{courseId}"` to `user_test_scores`, `study_sessions`, and
 * `test_questions` (via test_score_id). Course-scoped queries that filter
 * `.in("lesson_id", lessonIdsFromLessonsTable)` would otherwise silently
 * drop those rows. Spread this into the filter so auto-lesson activity is
 * counted alongside real-lesson activity.
 */
export function getAllAutoLessonIds(courseId: string): string[] {
  return AUTO_LESSON_DEFINITIONS.map((def) =>
    createAutoLessonId(def.type, courseId),
  );
}

/** Maximum words in the "Unmastered" auto-lesson (oldest learned-but-not-mastered first). */
export const UNMASTERED_LIMIT = 10;
/** Maximum words in the "Lost Mastery" auto-lesson. */
export const LOST_MASTERY_LIMIT = 20;

// Auto-lesson definitions. Order here defines the order returned from
// generateAutoLessons; the SpecialLessonsRow component re-orders for display.
export const AUTO_LESSON_DEFINITIONS: {
  type: AutoLessonType;
  number: number;
  title: string;
  emoji: string;
}[] = [
  { type: "notes", number: 800, title: "My Notes", emoji: "📝" },
  { type: "best", number: 801, title: "Best Words", emoji: "🏆" },
  { type: "worst", number: 802, title: "Worst Words", emoji: "🎯" },
  { type: "unmastered", number: 803, title: "Unmastered", emoji: "📚" },
  { type: "lost_mastery", number: 804, title: "Lost Mastery", emoji: "⚠️" },
];

export const AUTO_LESSON_META: Record<
  AutoLessonType,
  { number: number; title: string; emoji: string }
> = AUTO_LESSON_DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.type] = { number: def.number, title: def.title, emoji: def.emoji };
    return acc;
  },
  {} as Record<AutoLessonType, { number: number; title: string; emoji: string }>,
);

/**
 * Pick up to UNMASTERED_LIMIT word IDs that are at status "learned" and have
 * never been mastered. Sorted by learned_at ASC (oldest stuck-at-learned
 * first), with a stable word_id tiebreak so reloads return the same set.
 *
 * Defensive guard: also exclude rows where `correct_streak >= 3`. status and
 * correct_streak are written together by `updateWordTestProgress`, so they
 * should always agree — but if any row is out of sync (legacy data, manual
 * fix, partial reset), we don't want to surface a word that's effectively
 * mastered.
 */
export function selectUnmasteredWordIds(
  learnedRows: Array<{
    word_id: string;
    mastered_at: string | null;
    learned_at: string | null;
    correct_streak: number | null;
  }>,
): string[] {
  const candidates = learnedRows.filter(
    (r) => r.mastered_at === null && (r.correct_streak ?? 0) < 3,
  );
  candidates.sort((a, b) => {
    const aT = a.learned_at ?? "";
    const bT = b.learned_at ?? "";
    if (aT !== bT) return aT.localeCompare(bT); // ASC — oldest first
    return a.word_id.localeCompare(b.word_id);
  });
  return candidates.slice(0, UNMASTERED_LIMIT).map((r) => r.word_id);
}

/**
 * Pick up to LOST_MASTERY_LIMIT word IDs the user mastered before but has
 * since dropped to "learned". Sorted by last_studied_at DESC so the most
 * recent slips show first.
 *
 * Defensive guard: also exclude rows where `correct_streak >= 3`. See
 * `selectUnmasteredWordIds` for the rationale.
 */
export function selectLostMasteryWordIds(
  learnedRows: Array<{
    word_id: string;
    mastered_at: string | null;
    last_studied_at: string | null;
    correct_streak: number | null;
  }>,
): string[] {
  const candidates = learnedRows.filter(
    (r) => r.mastered_at !== null && (r.correct_streak ?? 0) < 3,
  );
  candidates.sort((a, b) => {
    const aT = a.last_studied_at ?? "";
    const bT = b.last_studied_at ?? "";
    if (aT !== bT) return bT.localeCompare(aT); // DESC — most recent first
    return a.word_id.localeCompare(b.word_id);
  });
  return candidates.slice(0, LOST_MASTERY_LIMIT).map((r) => r.word_id);
}
