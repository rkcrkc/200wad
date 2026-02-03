import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { WordsClient } from "./WordsClient";

interface PageProps {
  params: Promise<{ lessonId: string }>;
}

async function getData(lessonId: string) {
  const supabase = await createClient();

  // Fetch lesson with course info
  const { data: lesson, error: lessonError } = await supabase
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

  if (lessonError || !lesson) {
    return null;
  }

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
    return { lesson, words: [] };
  }

  // Extract words with sort_order from join table
  const words = (lessonWords || []).map((lw) => ({
    ...(lw.words as any),
    sort_order: lw.sort_order,
  }));

  return { lesson, words };
}

export default async function WordsPage({ params }: PageProps) {
  const { lessonId } = await params;
  const data = await getData(lessonId);

  if (!data) {
    notFound();
  }

  return (
    <div>
      <WordsClient lesson={data.lesson as any} words={data.words as any[]} />
    </div>
  );
}
