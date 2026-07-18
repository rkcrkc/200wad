import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { WordsClient } from "./WordsClient";
import type { Lesson, Word, LessonOption, CourseOption } from "./WordsClient";

interface PageProps {
  params: Promise<{ lessonId: string }>;
}

interface WordsPageData {
  lesson: Lesson;
  words: Word[];
  positionInOrder: number | null;
  allLessons: LessonOption[];
  allCourses: CourseOption[];
}

async function getData(lessonId: string): Promise<WordsPageData | null> {
  const supabase = await createClient();

  // Fetch lesson with course info
  const { data: lessonRaw, error: lessonError } = await supabase
    .from("lessons")
    .select(`
      id,
      number,
      title,
      emoji,
      course:courses(
        id,
        name,
        language:languages(id, name, code)
      )
    `)
    .eq("id", lessonId)
    .single();

  if (lessonError || !lessonRaw) {
    return null;
  }

  // Supabase types embedded to-one relations (course, language) as arrays even
  // though they resolve to single objects at runtime, so normalise the fetched
  // row to our view type via `unknown`.
  const lesson = lessonRaw as unknown as Lesson;

  // Position in lesson order: fetch lessons in same course by sort_order
  let positionInOrder: number | null = null;
  const courseId = lesson.course?.id;
  if (courseId) {
    const { data: courseLessons } = await supabase
      .from("lessons")
      .select("id")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true });
    const idx = (courseLessons || []).findIndex((l) => l.id === lessonId);
    if (idx >= 0) positionInOrder = idx + 1;
  }

  // Fetch all lessons and courses for the Lessons tab in word edit modal
  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id, number, title, emoji, course_id")
    .order("number");

  const { data: allCourses } = await supabase
    .from("courses")
    .select("id, name, language_id")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  // Fetch words via lesson_words join table
  const { data: lessonWords, error: wordsError } = await supabase
    .from("lesson_words")
    .select(`
      sort_order,
      words(*, example_sentences(*))
    `)
    .eq("lesson_id", lessonId)
    .order("sort_order", { ascending: true });

  if (wordsError) {
    console.error("Error fetching words:", wordsError);
    return {
      lesson,
      words: [],
      positionInOrder,
      allLessons: (allLessons || []) as LessonOption[],
      allCourses: (allCourses || []) as CourseOption[],
    };
  }

  // Extract words with sort_order from join table. `lw.words` is a to-one
  // embed (single row at runtime) that Supabase types as an array.
  const words: Word[] = (lessonWords || []).map((lw) => ({
    ...(lw.words as unknown as Word),
    sort_order: lw.sort_order ?? 0,
  }));

  return {
    lesson,
    words,
    positionInOrder,
    allLessons: (allLessons || []) as LessonOption[],
    allCourses: (allCourses || []) as CourseOption[],
  };
}

export default async function WordsPage({ params }: PageProps) {
  const { lessonId } = await params;
  const data = await getData(lessonId);

  if (!data) {
    notFound();
  }

  return (
    <div>
      <WordsClient
        lesson={data.lesson}
        words={data.words}
        positionInOrder={data.positionInOrder}
        allLessons={data.allLessons}
        allCourses={data.allCourses}
      />
    </div>
  );
}
