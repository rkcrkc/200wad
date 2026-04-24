import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/utils";
import { Language, UserLanguage } from "@/types/database";

export interface LanguageWithProgress extends Language {
  courseCount: number;
  totalWords: number;
  wordsLearned: number;
  progressPercent: number;
  isCurrentLanguage: boolean;
  /** Computed status based on word progress */
  status: "not-started" | "learning" | "mastered";
}

export interface GetLanguagesOptions {
  visibleOnly?: boolean;
}

export interface GetLanguagesResult {
  languages: LanguageWithProgress[];
  isGuest: boolean;
}

export async function getLanguages(options: GetLanguagesOptions = { visibleOnly: true }): Promise<GetLanguagesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch languages (filtered by visibility if requested)
  let query = supabase
    .from("languages")
    .select("*")
    .order("sort_order");

  if (options.visibleOnly) {
    query = query.eq("is_visible", true);
  }

  const { data: languages, error: langError } = await query;

  if (langError) {
    console.error("Error fetching languages:", langError);
    return { languages: [], isGuest: !user };
  }

  // Fetch published course counts per language
  const { data: courses } = await supabase
    .from("courses")
    .select("id, language_id")
    .eq("is_published", true);

  // Build course count map
  const courseCountByLanguage: Record<string, number> = {};
  courses?.forEach((course) => {
    if (course.language_id) {
      courseCountByLanguage[course.language_id] =
        (courseCountByLanguage[course.language_id] || 0) + 1;
    }
  });

  // Count testable words per language directly via words.language_id (excludes
  // information pages — they are not part of learnable vocabulary totals).
  const { data: wordCounts } = await supabase
    .from("words")
    .select("id, language_id")
    .neq("category", "information");

  const wordCountByLanguage: Record<string, number> = {};
  wordCounts?.forEach((word) => {
    if (word.language_id) {
      wordCountByLanguage[word.language_id] =
        (wordCountByLanguage[word.language_id] || 0) + 1;
    }
  });

  // Fetch user progress if authenticated
  let userLanguages: UserLanguage[] = [];
  const wordsLearnedByLanguage: Record<string, number> = {};

  if (user) {
    // Get user's languages
    const { data: userLangs } = await supabase
      .from("user_languages")
      .select("*")
      .eq("user_id", user.id);

    userLanguages = userLangs || [];

    // Get words in learning/mastered status, joined directly via words.language_id.
    // user_word_progress has a unique (user_id, word_id) constraint so each row is
    // already a distinct word — no extra dedupe needed.
    // Explicit limit + truncation warning prevents Supabase's default 1000-row
    // cap from silently dropping progress for power users with many languages.
    // Paginate via .range() — PostgREST's server-side max-rows cap (1,000)
    // silently truncates single-request responses, which would under-count
    // learned words for power users studying multiple languages.
    const wordProgress = await fetchAllRows<{
      word_id: string | null;
      status: string | null;
      words: { language_id: string; category: string | null } | null;
    }>(
      (from, to) =>
        supabase
          .from("user_word_progress")
          .select(
            `
            word_id,
            status,
            words!inner(
              language_id,
              category
            )
          `
          )
          .eq("user_id", user.id)
          .in("status", ["learning", "learned", "mastered"])
          .range(from, to),
      { label: "getLanguages:user_word_progress" }
    );

    wordProgress.forEach((wp) => {
      const w = wp.words as { language_id: string; category: string | null } | null;
      if (!w || w.category === "information") return;
      if (w.language_id) {
        wordsLearnedByLanguage[w.language_id] =
          (wordsLearnedByLanguage[w.language_id] || 0) + 1;
      }
    });
  }

  // Combine data
  const languagesWithProgress: LanguageWithProgress[] = (languages || []).map(
    (lang) => {
      const totalWords = wordCountByLanguage[lang.id] || 0;
      const wordsLearned = wordsLearnedByLanguage[lang.id] || 0;
      const userLang = userLanguages.find((ul) => ul.language_id === lang.id);

      // Compute status from word progress
      const status: "not-started" | "learning" | "mastered" =
        wordsLearned >= totalWords && totalWords > 0
          ? "mastered"
          : wordsLearned > 0
            ? "learning"
            : "not-started";

      return {
        ...lang,
        courseCount: courseCountByLanguage[lang.id] || 0,
        totalWords,
        wordsLearned,
        progressPercent: totalWords > 0 ? Math.round((wordsLearned / totalWords) * 100) : 0,
        isCurrentLanguage: userLang?.is_current || false,
        status,
      };
    }
  );

  return {
    languages: languagesWithProgress,
    isGuest: !user,
  };
}
