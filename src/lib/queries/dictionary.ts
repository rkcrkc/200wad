import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/utils";
import { Word, Language } from "@/types/database";

// ============================================================================
// Types
// ============================================================================

export type WordStatus = "not-started" | "learning" | "learned" | "mastered";

export interface DictionaryWord {
  id: string;
  english: string;
  headword: string;
  partOfSpeech: string | null;
  category: string | null;
  imageUrl: string | null;
  status: WordStatus;
  lessonId: string | null;
  lessonTitle: string | null;
  lessonNumber: number | null;
}

export interface GetDictionaryResult {
  words: DictionaryWord[];
  language: Language | null;
  stats: {
    totalWords: number;
    wordsStudied: number;
    wordsMastered: number;
  };
  isGuest: boolean;
}

// ============================================================================
// Main Query
// ============================================================================

/**
 * Get dictionary words based on filter type
 * @param courseId - The current course ID
 * @param filter - "my-words" | "course" | "all"
 */
export async function getDictionaryWords(
  courseId: string,
  filter: "my-words" | "course" | "all" = "all"
): Promise<GetDictionaryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      words: [],
      language: null,
      stats: { totalWords: 0, wordsStudied: 0, wordsMastered: 0 },
      isGuest: true,
    };
  }

  // Get course info to determine language
  const { data: course } = await supabase
    .from("courses")
    .select("id, language_id, languages(*)")
    .eq("id", courseId)
    .single();

  if (!course) {
    return {
      words: [],
      language: null,
      stats: { totalWords: 0, wordsStudied: 0, wordsMastered: 0 },
      isGuest: false,
    };
  }

  const language = course.languages as Language | null;
  const languageId = course.language_id;

  if (!languageId) {
    return {
      words: [],
      language: null,
      stats: { totalWords: 0, wordsStudied: 0, wordsMastered: 0 },
      isGuest: false,
    };
  }

  let words: DictionaryWord[] = [];

  if (filter === "my-words") {
    // Get words user has progress on (paginate to avoid 1000-row cap)
    // Include all testable items (everything except information pages)
    const progressWords = await fetchAllRows((from, to) =>
      supabase
        .from("user_word_progress")
        .select(`
          word_id,
          status,
          words!inner(
            id,
            english,
            headword,
            part_of_speech,
            category,
            memory_trigger_image_url,
            language_id
          )
        `)
        .eq("user_id", user.id)
        .not("status", "is", null)
        .neq("words.category", "information")
        .range(from, to)
    );

    if (progressWords.length > 0) {
      // Get lesson info for these words. We drop the word_id filter because
      // power users may have 1000+ progress rows — passing that many UUIDs
      // through `.in("word_id", …)` creates a ~55KB URL that PostgREST
      // silently returns empty for. Instead fetch the full lesson_words
      // table (paginated) and intersect client-side via the wordId Set.
      const wordIdSet = new Set<string>(
        progressWords.map((p) => (p.words as any).id).filter((id: unknown): id is string => !!id)
      );
      const lessonWords = await fetchAllRows<{
        word_id: string | null;
        lesson_id: string | null;
        lessons: { id: string; title: string; number: number } | null;
      }>(
        (from, to) =>
          supabase
            .from("lesson_words")
            .select("word_id, lesson_id, lessons(id, title, number)")
            .range(from, to),
        { label: "getDictionaryWords:my-words:lesson_words" }
      );

      const lessonMap = new Map(
        lessonWords
          .filter((lw) => lw.word_id && wordIdSet.has(lw.word_id))
          .map((lw) => [
            lw.word_id,
            lw.lessons as { id: string; title: string; number: number } | null,
          ])
      );

      words = progressWords
        .filter((p) => (p.words as any).language_id === languageId)
        .map((p) => {
          const word = p.words as any;
          const lesson = lessonMap.get(word.id);
          return {
            id: word.id,
            english: word.english,
            headword: word.headword,
            partOfSpeech: word.part_of_speech,
            category: word.category,
            imageUrl: word.memory_trigger_image_url,
            status: (p.status as WordStatus) || "not-started",
            lessonId: lesson?.id || null,
            lessonTitle: lesson?.title || null,
            lessonNumber: lesson?.number || null,
          };
        });
    }
  } else if (filter === "course") {
    // First get lesson IDs for this course (small set, safe to use .in())
    const { data: courseLessons } = await supabase
      .from("lessons")
      .select("id")
      .eq("course_id", courseId)
      .eq("is_published", true);

    if (courseLessons && courseLessons.length > 0) {
      const lessonIds = courseLessons.map((l) => l.id);

      // Get all words in those lessons (paginate to avoid 1000-row cap)
      // Include all testable items (everything except information pages)
      const lessonWords = await fetchAllRows((from, to) =>
        supabase
          .from("lesson_words")
          .select(`
            word_id,
            lesson_id,
            lessons(id, title, number),
            words!inner(
              id,
              english,
              headword,
              part_of_speech,
              category,
              memory_trigger_image_url
            )
          `)
          .in("lesson_id", lessonIds)
          .neq("words.category", "information")
          .order("sort_order")
          .range(from, to)
      );

      if (lessonWords.length > 0) {
        // Scope by user_id only. Filtering by word_id pushes 1k+ UUIDs through
        // PostgREST and silently returns empty on long URLs for big courses.
        // fetchAllRows paginates so the 1000-row cap is handled.
        const allProgress = await fetchAllRows<{ word_id: string | null; status: string | null }>(
          (from, to) =>
            supabase
              .from("user_word_progress")
              .select("word_id, status")
              .eq("user_id", user.id)
              .range(from, to)
        );

        const progressMap = new Map(
          allProgress.map((p) => [p.word_id, p.status as WordStatus])
        );

        // De-duplicate words (a word may appear in multiple lessons)
        const seenWordIds = new Set<string>();
        words = lessonWords
          .filter((lw) => {
            const wordId = (lw.words as any).id;
            if (seenWordIds.has(wordId)) return false;
            seenWordIds.add(wordId);
            return true;
          })
          .map((lw) => {
            const word = lw.words as any;
            const lesson = lw.lessons as { id: string; title: string; number: number } | null;
            return {
              id: word.id,
              english: word.english,
              headword: word.headword,
              partOfSpeech: word.part_of_speech,
              category: word.category,
              imageUrl: word.memory_trigger_image_url,
              status: progressMap.get(word.id) || "not-started",
              lessonId: lesson?.id || null,
              lessonTitle: lesson?.title || null,
              lessonNumber: lesson?.number || null,
            };
          });
      }
    }
  } else {
    // Get all words in the language (paginate to avoid 1000-row cap)
    // "All {Language}" = every entry for the language (words, facts, sentences,
    // phrases, information pages). This is the canonical landing spot for any
    // cross-course search result.
    const allWords = await fetchAllRows((from, to) =>
      supabase
        .from("words")
        .select("id, english, headword, part_of_speech, category, memory_trigger_image_url")
        .eq("language_id", languageId)
        .order("english")
        .range(from, to)
    );

    if (allWords.length > 0) {
      // Scope by user_id only. Filtering by word_id pushes ~1500 UUIDs through
      // PostgREST (all language words), which creates a ~55KB URL and silently
      // returns empty — this was the original 66dfae0 regression. Paginate via
      // .range() so the 1,000-row max-rows cap doesn't drop rows for power
      // users; we intersect with language words client-side via the progressMap.
      const allProgress = await fetchAllRows<{ word_id: string | null; status: string | null }>(
        (from, to) =>
          supabase
            .from("user_word_progress")
            .select("word_id, status")
            .eq("user_id", user.id)
            .range(from, to),
        { label: "getDictionaryWords:all:user_word_progress" }
      );

      const progressMap = new Map(
        allProgress.map((p) => [p.word_id, p.status as WordStatus])
      );

      // Get ALL lesson_words for this language's words (paginate)
      const allLessonWords = await fetchAllRows((from, to) =>
        supabase
          .from("lesson_words")
          .select("word_id, lesson_id, lessons(id, title, number)")
          .range(from, to)
      );

      const lessonMap = new Map(
        allLessonWords.map((lw) => [
          lw.word_id,
          lw.lessons as { id: string; title: string; number: number } | null,
        ])
      );

      words = allWords.map((word) => {
        const lesson = lessonMap.get(word.id);
        return {
          id: word.id,
          english: word.english,
          headword: word.headword,
          partOfSpeech: word.part_of_speech,
          category: word.category,
          imageUrl: word.memory_trigger_image_url,
          status: progressMap.get(word.id) || "not-started",
          lessonId: lesson?.id || null,
          lessonTitle: lesson?.title || null,
          lessonNumber: lesson?.number || null,
        };
      });
    }
  }

  // Calculate stats
  const stats = {
    totalWords: words.length,
    wordsStudied: words.filter((w) => w.status !== "not-started").length,
    wordsMastered: words.filter((w) => w.status === "mastered").length,
  };

  return {
    words,
    language,
    stats,
    isGuest: false,
  };
}
