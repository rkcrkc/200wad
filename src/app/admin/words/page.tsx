import { createClient } from "@/lib/supabase/server";
import { WordsBrowserClient } from "./WordsBrowserClient";

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
  language_id: string;
  part_of_speech: string | null;
  gender: string | null;
  transitivity: string | null;
  is_irregular: boolean | null;
  grammatical_number: string | null;
  notes: string | null;
  memory_trigger_text: string | null;
  memory_trigger_image_url: string | null;
  audio_url_english: string | null;
  audio_url_foreign: string | null;
  audio_url_trigger: string | null;
  created_at: string | null;
  language: Language | null;
  lessons: LessonInfo[];
}

async function getData() {
  const supabase = await createClient();

  // Fetch all languages
  const { data: languages, error: languagesError } = await supabase
    .from("languages")
    .select("id, name, code")
    .order("sort_order");

  if (languagesError) {
    console.error("Error fetching languages:", languagesError);
  }

  // Fetch all courses
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id, name, language_id")
    .order("sort_order");

  if (coursesError) {
    console.error("Error fetching courses:", coursesError);
  }

  // Fetch all words with their language
  const { data: words, error: wordsError } = await supabase
    .from("words")
    .select(`
      id,
      headword,
      lemma,
      english,
      language_id,
      part_of_speech,
      gender,
      transitivity,
      is_irregular,
      grammatical_number,
      notes,
      memory_trigger_text,
      memory_trigger_image_url,
      audio_url_english,
      audio_url_foreign,
      audio_url_trigger,
      created_at,
      language:languages(id, name, code)
    `)
    .order("headword");

  if (wordsError) {
    console.error("Error fetching words:", wordsError);
    return {
      languages: languages || [],
      courses: courses || [],
      words: [],
    };
  }

  // Fetch all lesson_words associations
  const { data: lessonWords, error: lessonWordsError } = await supabase
    .from("lesson_words")
    .select(`
      word_id,
      lesson:lessons(id, number, title, emoji, course_id)
    `);

  if (lessonWordsError) {
    console.error("Error fetching lesson_words:", lessonWordsError);
  }

  // Build a map of word_id -> lessons
  const wordLessonsMap: Record<string, LessonInfo[]> = {};
  (lessonWords || []).forEach((lw) => {
    const wordId = lw.word_id;
    const lesson = lw.lesson as LessonInfo | null;
    if (wordId && lesson) {
      if (!wordLessonsMap[wordId]) {
        wordLessonsMap[wordId] = [];
      }
      wordLessonsMap[wordId].push(lesson);
    }
  });

  // Combine words with their lessons
  const wordsWithLessons: WordWithLessons[] = (words || []).map((word) => ({
    ...word,
    language: word.language as Language | null,
    lessons: wordLessonsMap[word.id] || [],
  }));

  return {
    languages: languages || [],
    courses: courses || [],
    words: wordsWithLessons,
  };
}

export default async function WordsBrowserPage() {
  const { languages, courses, words } = await getData();

  return (
    <WordsBrowserClient
      languages={languages}
      courses={courses}
      words={words}
    />
  );
}
