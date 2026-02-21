import { createClient } from "@/lib/supabase/server";
import { WordsBrowserClient } from "./WordsBrowserClient";

const PAGE_SIZE = 100;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface Language {
  id: string;
  name: string;
  code: string;
}

interface Course {
  id: string;
  name: string;
  language_id: string | null;
}

interface LessonInfo {
  id: string;
  number: number;
  title: string;
  emoji: string | null;
  course_id: string | null;
}

interface WordWithLessons {
  id: string;
  headword: string;
  lemma: string;
  english: string;
  alternate_answers: string[] | null;
  language_id: string;
  category: string | null;
  part_of_speech: string | null;
  gender: string | null;
  transitivity: string | null;
  is_irregular: boolean | null;
  grammatical_number: string | null;
  notes: string | null;
  admin_notes: string | null;
  memory_trigger_text: string | null;
  memory_trigger_image_url: string | null;
  audio_url_english: string | null;
  audio_url_foreign: string | null;
  audio_url_trigger: string | null;
  created_at: string | null;
  language: Language | null;
  lessons: LessonInfo[];
}

interface SearchParams {
  letter?: string;
  page?: string;
  language?: string;
  course?: string;
  search?: string;
}

async function getData(searchParams: SearchParams) {
  const supabase = await createClient();

  const letter = searchParams.letter || "A";
  const page = parseInt(searchParams.page || "1", 10);
  const languageId = searchParams.language || "";
  const courseId = searchParams.course || "";
  const searchQuery = searchParams.search || "";

  // Fetch all languages
  const { data: languages } = await supabase
    .from("languages")
    .select("id, name, code")
    .order("sort_order");

  // Fetch all courses
  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, language_id")
    .order("sort_order");

  // Fetch all lessons for the "add to lesson" dropdown
  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id, number, title, emoji, course_id")
    .order("number");

  // Build the base query for words
  let wordsQuery = supabase
    .from("words")
    .select(`
      id,
      headword,
      lemma,
      english,
      alternate_answers,
      language_id,
      category,
      part_of_speech,
      gender,
      transitivity,
      is_irregular,
      grammatical_number,
      notes,
      admin_notes,
      memory_trigger_text,
      memory_trigger_image_url,
      audio_url_english,
      audio_url_foreign,
      audio_url_trigger,
      created_at,
      language:languages(id, name, code)
    `, { count: "exact" });

  // Apply language filter
  if (languageId) {
    wordsQuery = wordsQuery.eq("language_id", languageId);
  }

  // Apply search or letter filter
  if (searchQuery.trim()) {
    // Search across headword, english, lemma
    wordsQuery = wordsQuery.or(`headword.ilike.%${searchQuery}%,english.ilike.%${searchQuery}%,lemma.ilike.%${searchQuery}%`);
  } else {
    // Filter by starting letter
    const nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1);
    wordsQuery = wordsQuery.gte("headword", letter.toLowerCase()).lt("headword", nextLetter.toLowerCase());
  }

  // Order and paginate
  const offset = (page - 1) * PAGE_SIZE;
  wordsQuery = wordsQuery.order("headword").range(offset, offset + PAGE_SIZE - 1);

  const { data: words, count: totalCount } = await wordsQuery;

  // Get word IDs for lesson lookup
  const wordIds = (words || []).map((w) => w.id);

  // Fetch lesson associations for these words only
  let lessonWords: { word_id: string; lesson: LessonInfo | null }[] = [];
  if (wordIds.length > 0) {
    const { data: lw } = await supabase
      .from("lesson_words")
      .select(`
        word_id,
        lesson:lessons(id, number, title, emoji, course_id)
      `)
      .in("word_id", wordIds);
    lessonWords = lw || [];
  }

  // Build word -> lessons map
  const wordLessonsMap: Record<string, LessonInfo[]> = {};
  lessonWords.forEach((lw) => {
    const wordId = lw.word_id;
    const lesson = lw.lesson as LessonInfo | null;
    if (wordId && lesson) {
      if (!wordLessonsMap[wordId]) {
        wordLessonsMap[wordId] = [];
      }
      wordLessonsMap[wordId].push(lesson);
    }
  });

  // If filtering by course, filter words client-side (for now)
  let filteredWords = (words || []).map((word) => ({
    ...word,
    language: word.language as Language | null,
    lessons: wordLessonsMap[word.id] || [],
  }));

  if (courseId) {
    filteredWords = filteredWords.filter((w) =>
      w.lessons.some((l) => l.course_id === courseId)
    );
  }

  // Get letter counts for the alphabet tabs (with current language filter) - run in parallel
  const letterCountPromises = ALPHABET.map(async (l) => {
    let countQuery = supabase
      .from("words")
      .select("id", { count: "exact", head: true });

    if (languageId) {
      countQuery = countQuery.eq("language_id", languageId);
    }

    const nextL = String.fromCharCode(l.charCodeAt(0) + 1);
    countQuery = countQuery.gte("headword", l.toLowerCase()).lt("headword", nextL.toLowerCase());

    const { count } = await countQuery;
    return { letter: l, count: count || 0 };
  });

  const letterCountResults = await Promise.all(letterCountPromises);
  const letterCounts: Record<string, number> = {};
  letterCountResults.forEach(({ letter, count }) => {
    letterCounts[letter] = count;
  });

  // Get total words count
  let totalWordsQuery = supabase
    .from("words")
    .select("id", { count: "exact", head: true });
  if (languageId) {
    totalWordsQuery = totalWordsQuery.eq("language_id", languageId);
  }
  const { count: totalWords } = await totalWordsQuery;

  return {
    languages: languages || [],
    courses: courses || [],
    lessons: allLessons || [],
    words: filteredWords,
    totalCount: totalCount || 0,
    totalWords: totalWords || 0,
    letterCounts,
    currentLetter: letter,
    currentPage: page,
    pageSize: PAGE_SIZE,
    languageId,
    courseId,
    searchQuery,
  };
}

export default async function WordsBrowserPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const data = await getData(params);

  return (
    <WordsBrowserClient
      languages={data.languages}
      courses={data.courses}
      lessons={data.lessons}
      words={data.words}
      totalCount={data.totalCount}
      totalWords={data.totalWords}
      letterCounts={data.letterCounts}
      currentLetter={data.currentLetter}
      currentPage={data.currentPage}
      pageSize={data.pageSize}
      languageId={data.languageId}
      courseId={data.courseId}
      searchQuery={data.searchQuery}
    />
  );
}
