import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/static";

/**
 * Fallback used when `platform_config.auto_lesson_word_limit` is missing or
 * malformed. Kept in sync with the migration default in
 * `20260519000001_auto_lesson_word_limit.sql`.
 */
export const DEFAULT_AUTO_LESSON_WORD_LIMIT = 10;

/**
 * Maximum number of words included in any auto-generated lesson
 * (Best, Worst, Unmastered, Lost Mastery). Read once from `platform_config`
 * and shared by every call site so the All-Lessons summary, the lesson
 * detail page, the scheduler, and the anti-gaming check in test.ts all
 * agree on the same cap.
 *
 * Cached for 1 hour and invalidated by `updatePlatformConfig` via the
 * existing `platform-config` tag.
 */
export const getAutoLessonWordLimit = unstable_cache(
  async (): Promise<number> => {
    const supabase = createStaticClient();
    const { data } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", "auto_lesson_word_limit")
      .single();

    const raw = data?.value;
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      return Math.floor(raw);
    }
    return DEFAULT_AUTO_LESSON_WORD_LIMIT;
  },
  ["auto-lesson-word-limit"],
  { revalidate: 3600, tags: ["platform-config"] },
);
