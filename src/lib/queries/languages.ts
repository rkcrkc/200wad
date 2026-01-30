import { createClient } from "@/lib/supabase/server";
import { Language, UserLanguage } from "@/types/database";

export interface LanguageWithProgress extends Language {
  courseCount: number;
  totalWords: number;
  wordsLearned: number;
  progressPercent: number;
  isCurrentLanguage: boolean;
}

export interface GetLanguagesResult {
  languages: LanguageWithProgress[];
  isGuest: boolean;
}

export async function getLanguages(): Promise<GetLanguagesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all languages
  const { data: languages, error: langError } = await supabase
    .from("languages")
    .select("*")
    .order("sort_order");

  if (langError) {
    console.error("Error fetching languages:", langError);
    return { languages: [], isGuest: !user };
  }

  // Fetch course counts per language
  const { data: courses } = await supabase
    .from("courses")
    .select("id, language_id");

  // Build course count map
  const courseCountByLanguage: Record<string, number> = {};
  courses?.forEach((course) => {
    if (course.language_id) {
      courseCountByLanguage[course.language_id] =
        (courseCountByLanguage[course.language_id] || 0) + 1;
    }
  });

  // Count actual words per language (via words -> lessons -> courses)
  const { data: wordCounts } = await supabase
    .from("words")
    .select(`
      id,
      lessons!inner(
        courses!inner(
          language_id
        )
      )
    `);

  // Build word count map from actual words
  const wordCountByLanguage: Record<string, number> = {};
  wordCounts?.forEach((word) => {
    const langId = (word.lessons as any)?.courses?.language_id;
    if (langId) {
      wordCountByLanguage[langId] = (wordCountByLanguage[langId] || 0) + 1;
    }
  });

  // Fetch user progress if authenticated
  let userLanguages: UserLanguage[] = [];
  let wordsLearnedByLanguage: Record<string, number> = {};

  if (user) {
    // Get user's languages
    const { data: userLangs } = await supabase
      .from("user_languages")
      .select("*")
      .eq("user_id", user.id);

    userLanguages = userLangs || [];

    // Get words learned per language (via lessons -> courses -> languages)
    // This is a complex query, so we'll do it step by step
    const { data: wordProgress } = await supabase
      .from("user_word_progress")
      .select(
        `
        word_id,
        status,
        words!inner(
          lesson_id,
          lessons!inner(
            course_id,
            courses!inner(
              language_id
            )
          )
        )
      `
      )
      .eq("user_id", user.id)
      .in("status", ["studying", "mastered"]);

    // Count words by language
    wordProgress?.forEach((wp) => {
      const langId = (wp.words as any)?.lessons?.courses?.language_id;
      if (langId) {
        wordsLearnedByLanguage[langId] =
          (wordsLearnedByLanguage[langId] || 0) + 1;
      }
    });
  }

  // Combine data
  const languagesWithProgress: LanguageWithProgress[] = (languages || []).map(
    (lang) => {
      const totalWords = wordCountByLanguage[lang.id] || 0;
      const wordsLearned = wordsLearnedByLanguage[lang.id] || 0;
      const userLang = userLanguages.find((ul) => ul.language_id === lang.id);

      return {
        ...lang,
        courseCount: courseCountByLanguage[lang.id] || 0,
        totalWords,
        wordsLearned,
        progressPercent: totalWords > 0 ? Math.round((wordsLearned / totalWords) * 100) : 0,
        isCurrentLanguage: userLang?.is_current || false,
      };
    }
  );

  return {
    languages: languagesWithProgress,
    isGuest: !user,
  };
}
